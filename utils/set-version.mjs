#!/usr/bin/env node
/**
 * Sets the plugin version everywhere it appears, in one go.
 *
 * The version lives in five places that all have to agree: package.json, the
 * lockfile, the plugin header, the SIMPLE_WEATHER_BLOCK_VERSION constant and the
 * block's own metadata. readme.txt makes a sixth, but it is generated, so this
 * script regenerates it rather than editing it.
 *
 * Usage:
 *   node utils/set-version.mjs 0.2.0
 *   node utils/set-version.mjs patch|minor|major
 *   node utils/set-version.mjs 0.2.0 --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );

/**
 * Matches a plain three-part version. Pre-release suffixes are allowed so that
 * `0.2.0-beta.1` can be set by hand, but they are never produced by a keyword.
 */
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * Every substitution to make, as `prefix`/`suffix` capture groups wrapping the
 * version itself.
 *
 * Each file is edited with a targeted replacement rather than by rewriting it
 * wholesale, so formatting and comments survive untouched. Every pattern must
 * capture exactly two groups and match exactly once; anything else means the
 * file has moved on and the script stops rather than half-applying a release.
 */
const EDITS = [
	{
		file: 'package.json',
		pattern: /("version":\s*")[^"]+(")/,
	},
	{
		file: 'simple-weather-block.php',
		pattern: /^(\s*\*\s*Version:\s+)\S+([ \t]*)$/m,
	},
	{
		file: 'simple-weather-block.php',
		pattern:
			/(define\(\s*'SIMPLE_WEATHER_BLOCK_VERSION',\s*')[^']+('\s*\)\s*;)/,
	},
	{
		file: 'src/weather/block.json',
		pattern: /("version":\s*")[^"]+(")/,
	},
];

/**
 * Prints a message and exits non-zero.
 *
 * @param {string} message Failure reason.
 * @return {void}
 */
function fail( message ) {
	process.stderr.write( `error: ${ message }\n` );
	process.exit( 1 );
}

/**
 * Reads a file relative to the plugin root.
 *
 * @param {string} file Relative path.
 * @return {string} File contents.
 */
function read( file ) {
	return readFileSync( join( ROOT, file ), 'utf8' );
}

/**
 * Returns a global variant of a pattern, preserving its other flags.
 *
 * Rebuilding with `new RegExp( pattern, 'g' )` would silently drop `m`, which
 * the plugin-header pattern depends on.
 *
 * @param {RegExp} pattern Source pattern.
 * @return {RegExp} The same pattern, with `g` added.
 */
function toGlobal( pattern ) {
	const flags = pattern.flags.includes( 'g' )
		? pattern.flags
		: `${ pattern.flags }g`;

	return new RegExp( pattern.source, flags );
}

/**
 * Applies a bump keyword to a version.
 *
 * @param {string} current Current version.
 * @param {string} keyword `major`, `minor` or `patch`.
 * @return {string} The bumped version.
 */
function bump( current, keyword ) {
	const parts = current.replace( /-.*$/, '' ).split( '.' ).map( Number );
	const index = { major: 0, minor: 1, patch: 2 }[ keyword ];

	parts[ index ] += 1;

	// Bumping one component resets everything below it, and drops any suffix.
	for ( let lower = index + 1; lower < parts.length; lower++ ) {
		parts[ lower ] = 0;
	}

	return parts.join( '.' );
}

const args = process.argv.slice( 2 );
const isDryRun = args.includes( '--dry-run' );
const target = args.find( ( arg ) => ! arg.startsWith( '--' ) );

if ( ! target ) {
	fail(
		'a version or a bump keyword is required, e.g. `npm run version:set -- 0.2.0` or `-- patch`'
	);
}

const currentVersion = JSON.parse( read( 'package.json' ) ).version;

if ( ! VERSION_PATTERN.test( currentVersion ) ) {
	fail( `package.json has an unreadable version: ${ currentVersion }` );
}

const nextVersion = [ 'major', 'minor', 'patch' ].includes( target )
	? bump( currentVersion, target )
	: target;

if ( ! VERSION_PATTERN.test( nextVersion ) ) {
	fail( `"${ nextVersion }" is not a valid version or bump keyword.` );
}

if ( nextVersion === currentVersion ) {
	process.stdout.write( `Already at ${ currentVersion }; nothing to do.\n` );
	process.exit( 0 );
}

/*
 * Verify every edit before writing any of them, so a pattern that no longer
 * matches cannot leave the version updated in some files but not others.
 */
const planned = EDITS.map( ( edit ) => {
	const path = join( ROOT, edit.file );

	if ( ! existsSync( path ) ) {
		fail( `${ edit.file } is missing.` );
	}

	const contents = readFileSync( path, 'utf8' );
	const found = contents.match( toGlobal( edit.pattern ) ) || [];

	if ( 1 !== found.length ) {
		fail(
			`expected exactly one version match in ${ edit.file }, found ${ found.length }.`
		);
	}

	return { ...edit, path, contents };
} );

const changed = [];

for ( const edit of planned ) {
	/*
	 * Re-read rather than reusing the snapshot: simple-weather-block.php is edited
	 * twice, and the second pass has to see the result of the first.
	 */
	const contents = readFileSync( edit.path, 'utf8' );
	const updated = contents.replace(
		edit.pattern,
		( _, prefix, suffix ) => `${ prefix }${ nextVersion }${ suffix }`
	);

	if ( updated === contents ) {
		continue;
	}

	if ( ! isDryRun ) {
		writeFileSync( edit.path, updated );
	}

	if ( ! changed.includes( edit.file ) ) {
		changed.push( edit.file );
	}
}

// The lockfile is machine-written, so rewriting it wholesale is safe.
const lockPath = join( ROOT, 'package-lock.json' );

if ( existsSync( lockPath ) ) {
	const lock = JSON.parse( readFileSync( lockPath, 'utf8' ) );

	lock.version = nextVersion;

	if ( lock.packages && lock.packages[ '' ] ) {
		lock.packages[ '' ].version = nextVersion;
	}

	if ( ! isDryRun ) {
		writeFileSync( lockPath, `${ JSON.stringify( lock, null, 2 ) }\n` );
	}

	changed.push( 'package-lock.json' );
}

if ( isDryRun ) {
	process.stdout.write(
		`Dry run: ${ currentVersion } -> ${ nextVersion } in ${ changed.join( ', ' ) }\n`
	);
	process.exit( 0 );
}

// readme.txt carries the version as its stable tag, so regenerate it.
execFileSync( process.execPath, [ join( ROOT, 'utils', 'sync-readme.mjs' ) ], {
	stdio: 'inherit',
} );

process.stdout.write( `\nVersion ${ currentVersion } -> ${ nextVersion }\n` );

for ( const file of [ ...changed, 'readme.txt' ] ) {
	process.stdout.write( `  updated ${ file }\n` );
}

// A release with no changelog entry is a release nobody can read.
const hasEntry = new RegExp(
	`^###\\s+${ nextVersion.replace( /\./g, '\\.' ) }\\s*$`,
	'm'
).test( read( 'README.md' ) );

if ( ! hasEntry ) {
	process.stdout.write(
		`\nwarning: README.md has no "### ${ nextVersion }" entry under Changelog.\n` +
			'         Add one, then re-run `npm run readme`.\n'
	);
}

process.stdout.write(
	'\nNext: run `npm run build` so the copy of block.json under build/ picks up the new version.\n'
);
