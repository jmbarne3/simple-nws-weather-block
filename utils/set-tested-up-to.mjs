#!/usr/bin/env node
/**
 * Reads or sets the "Tested up to" WordPress version.
 *
 * The value lives in the hidden `<!-- wporg -->` block at the top of README.md,
 * and readme.txt is regenerated from it. WordPress.org compares only the major
 * and minor parts, so a patch number is dropped.
 *
 * Only raise this after the test suite has passed against that version; the
 * scheduled compatibility workflow does exactly that before calling it.
 *
 * Usage:
 *   node utils/set-tested-up-to.mjs 7.1       Set it, and regenerate readme.txt.
 *   node utils/set-tested-up-to.mjs latest    Set it to the latest WordPress release.
 *   node utils/set-tested-up-to.mjs --status  Print current and latest; exit 0.
 *   node utils/set-tested-up-to.mjs --stale   Exit 1 if a newer WordPress exists.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const README = join( ROOT, 'README.md' );
const FIELD = /^(Tested up to:[ \t]*)(\S*)[ \t]*$/m;

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
 * Reduces a version to major.minor.
 *
 * @param {string} version e.g. `7.1.2`.
 * @return {string} e.g. `7.1`.
 */
function majorMinor( version ) {
	const match = String( version ).match( /^(\d+)\.(\d+)/ );

	if ( ! match ) {
		fail( `"${ version }" is not a WordPress version.` );
	}

	return `${ match[ 1 ] }.${ match[ 2 ] }`;
}

/**
 * Compares two major.minor versions.
 *
 * @param {string} a First version.
 * @param {string} b Second version.
 * @return {number} Negative, zero or positive.
 */
function compare( a, b ) {
	const [ aMajor, aMinor ] = a.split( '.' ).map( Number );
	const [ bMajor, bMinor ] = b.split( '.' ).map( Number );

	return aMajor - bMajor || aMinor - bMinor;
}

/**
 * The latest stable WordPress release, from the WordPress.org API.
 *
 * @return {Promise<string>} Full version, e.g. `7.1.2`.
 */
async function latestRelease() {
	const response = await fetch(
		'https://api.wordpress.org/core/version-check/1.7/'
	);

	if ( ! response.ok ) {
		fail(
			`WordPress.org version check failed with status ${ response.status }.`
		);
	}

	const { offers } = await response.json();
	const version =
		offers?.find( ( offer ) => 'upgrade' === offer.response )?.version ||
		offers?.[ 0 ]?.version;

	if ( ! version ) {
		fail( 'WordPress.org returned no current version.' );
	}

	return version;
}

const readme = readFileSync( README, 'utf8' );
const current = readme.match( FIELD )?.[ 2 ];

if ( ! current ) {
	fail( 'README.md has no "Tested up to" in its <!-- wporg --> block.' );
}

const arg = process.argv[ 2 ];

if ( ! arg ) {
	fail( 'a version, `latest`, `--status` or `--stale` is required.' );
}

if ( '--status' === arg || '--stale' === arg ) {
	const latest = await latestRelease();
	const stale = compare( majorMinor( latest ), majorMinor( current ) ) > 0;

	process.stdout.write(
		`tested-up-to=${ current }\nlatest=${ latest }\nstale=${ stale }\n`
	);
	process.exit( '--stale' === arg && stale ? 1 : 0 );
}

const next = majorMinor( 'latest' === arg ? await latestRelease() : arg );

if ( next === current ) {
	process.stdout.write( `Tested up to is already ${ current }.\n` );
	process.exit( 0 );
}

writeFileSync( README, readme.replace( FIELD, `$1${ next }` ) );
execFileSync( process.execPath, [ join( ROOT, 'utils', 'sync-readme.mjs' ) ], {
	stdio: 'inherit',
} );
process.stdout.write( `Tested up to ${ current } -> ${ next }\n` );
