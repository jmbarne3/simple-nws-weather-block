#!/usr/bin/env node
/**
 * Generates readme.txt from README.md.
 *
 * README.md is the source of truth for prose. Everything that would otherwise
 * be entered twice -- the version, the WordPress and PHP requirements, the
 * licence and the short description -- is read from the plugin header instead,
 * so the two files cannot drift.
 *
 * Usage:
 *   node utils/sync-readme.mjs            Write readme.txt.
 *   node utils/sync-readme.mjs --check    Exit non-zero if readme.txt is stale.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const PLUGIN_FILE = join( ROOT, 'simple-nws-weather-block.php' );
const SOURCE = join( ROOT, 'README.md' );
const TARGET = join( ROOT, 'readme.txt' );

/**
 * Header fields copied straight from the plugin header into readme.txt.
 *
 * `Version` becomes `Stable tag`, which is why it is mapped rather than named.
 */
const FROM_PLUGIN_HEADER = [
	[ 'Requires at least', 'Requires at least' ],
	[ 'Requires PHP', 'Requires PHP' ],
	[ 'Version', 'Stable tag' ],
	[ 'License', 'License' ],
	[ 'License URI', 'License URI' ],
];

/**
 * Order the WordPress.org readme header expects.
 */
const HEADER_ORDER = [
	'Contributors',
	'Donate link',
	'Tags',
	'Requires at least',
	'Tested up to',
	'Requires PHP',
	'Stable tag',
	'License',
	'License URI',
];

/**
 * Placeholder standing in for a fenced code block during conversion.
 *
 * Code is parked under this token so that a `#` or `*` inside a sample is
 * never mistaken for Markdown and rewritten.
 */
const FENCE_TOKEN = '@@SIMPLE_NWS_WEATHER_BLOCK_FENCE_';

const warnings = [];

/**
 * Reads the plugin header block from the main plugin file.
 *
 * @return {Object<string, string>} Header fields keyed by name.
 */
function readPluginHeader() {
	const php = readFileSync( PLUGIN_FILE, 'utf8' );
	const block = php.slice( 0, php.indexOf( '*/' ) );
	const fields = {};

	for ( const line of block.split( '\n' ) ) {
		const match = line.match(
			/^\s*\*\s*([A-Za-z][A-Za-z ]*?):\s+(.+?)\s*$/
		);

		if ( match ) {
			fields[ match[ 1 ].trim() ] = match[ 2 ].trim();
		}
	}

	return fields;
}

/**
 * Pulls the hidden `<!-- wporg ... -->` metadata block out of the Markdown.
 *
 * It is an HTML comment so that GitHub does not render it, which keeps the
 * WordPress.org-only fields out of sight of everyone else.
 *
 * @param {string} markdown Full README.md contents.
 * @return {Object<string, string>} Metadata fields keyed by name.
 */
function readMarkdownMeta( markdown ) {
	const match = markdown.match( /<!--\s*wporg\s*([\s\S]*?)-->/i );
	const fields = {};

	if ( ! match ) {
		warnings.push(
			'README.md has no <!-- wporg --> metadata block; Contributors and Tags will be missing.'
		);

		return fields;
	}

	for ( const line of match[ 1 ].split( '\n' ) ) {
		const field = line.match( /^\s*([A-Za-z][A-Za-z ]*?):\s*(.*)$/ );

		if ( field ) {
			fields[ field[ 1 ].trim() ] = field[ 2 ].trim();
		}
	}

	return fields;
}

/**
 * Escapes text for inclusion in an HTML element.
 *
 * @param {string} text Raw text.
 * @return {string} Escaped text.
 */
function escapeHtml( text ) {
	return text
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' );
}

/**
 * Converts Markdown body text to the WordPress.org readme dialect.
 *
 * Heading levels shift down one step, because readme.txt reserves its top
 * level for the plugin name. Fenced code blocks become `<pre>`, which the
 * WordPress.org parser renders reliably. Images are dropped: badges belong on
 * GitHub, not in a plugin listing.
 *
 * @param {string} text Markdown source.
 * @return {string} Converted text.
 */
function convert( text ) {
	const fences = [];

	// Park code blocks so their contents are never treated as Markdown.
	let output = text.replace( /```[a-zA-Z]*\n[\s\S]*?```/g, ( block ) => {
		const code = block
			.replace( /^```[a-zA-Z]*\n/, '' )
			.replace( /```$/, '' );

		fences.push(
			`<pre>${ escapeHtml( code.replace( /\n$/, '' ) ) }</pre>`
		);

		return `${ FENCE_TOKEN }${ fences.length - 1 }@@`;
	} );

	output = output
		.replace( /^!\[[^\]]*\]\([^)]*\)\s*$/gm, '' )
		.replace( /^#### (.+)$/gm, '**$1**' )
		.replace( /^### (.+)$/gm, '= $1 =' )
		.replace( /^## (.+)$/gm, '== $1 ==' );

	return output.replace(
		new RegExp( `${ FENCE_TOKEN }(\\d+)@@`, 'g' ),
		( _, index ) => fences[ Number( index ) ]
	);
}

/**
 * Splits the Markdown body into top-level sections.
 *
 * @param {string} markdown README.md with its metadata comment removed.
 * @return {Array<{title: string, body: string}>} Sections in document order.
 */
function splitSections( markdown ) {
	const chunks = markdown.split( /^(?=## )/m );

	return chunks
		.filter( ( chunk ) => chunk.startsWith( '## ' ) )
		.map( ( chunk ) => ( {
			title: chunk.match( /^## (.+)$/m )[ 1 ].trim(),
			body: chunk,
		} ) );
}

/**
 * Builds the complete readme.txt.
 *
 * @return {string} File contents.
 */
function build() {
	const plugin = readPluginHeader();
	const markdown = readFileSync( SOURCE, 'utf8' );
	const meta = readMarkdownMeta( markdown );

	const header = {};

	for ( const [ from, to ] of FROM_PLUGIN_HEADER ) {
		if ( plugin[ from ] ) {
			header[ to ] = plugin[ from ];
		}
	}

	/*
	 * Anything in the hidden block wins, so a release can be marked "tested up
	 * to" a new WordPress version without touching the plugin header.
	 */
	for ( const [ key, value ] of Object.entries( meta ) ) {
		if ( 'Skip sections' !== key ) {
			header[ key ] = value;
		}
	}

	const skip = ( meta[ 'Skip sections' ] || '' )
		.split( ',' )
		.map( ( name ) => name.trim().toLowerCase() )
		.filter( Boolean );

	const name = plugin[ 'Plugin Name' ] || 'Plugin';
	const shortDescription = plugin.Description || '';

	if ( ! shortDescription ) {
		warnings.push(
			'The plugin header has no Description; the short description will be empty.'
		);
	} else if ( shortDescription.length > 150 ) {
		warnings.push(
			`The plugin header Description is ${ shortDescription.length } characters; WordPress.org allows 150.`
		);
	}

	if ( header.Tags && header.Tags.split( ',' ).length > 5 ) {
		warnings.push(
			'WordPress.org indexes at most 5 tags; the rest are ignored.'
		);
	}

	const body = markdown.replace( /<!--[\s\S]*?-->/g, '' );
	const sections = splitSections( body ).filter(
		( section ) => ! skip.includes( section.title.toLowerCase() )
	);

	const missing = [ 'Description', 'Changelog' ].filter(
		( required ) =>
			! sections.some( ( section ) => section.title === required )
	);

	if ( missing.length ) {
		warnings.push(
			`README.md is missing recommended section(s): ${ missing.join( ', ' ) }.`
		);
	}

	const lines = [ `=== ${ name } ===` ];

	for ( const key of HEADER_ORDER ) {
		if ( header[ key ] ) {
			lines.push( `${ key }: ${ header[ key ] }` );
		}
	}

	lines.push( '', shortDescription, '' );

	const content = sections
		.map( ( section ) => convert( section.body ).trim() )
		.join( '\n\n' );

	return `${ lines.join( '\n' ) }\n${ content }\n`;
}

const generated = build();
const isCheck = process.argv.includes( '--check' );

for ( const warning of warnings ) {
	process.stderr.write( `warning: ${ warning }\n` );
}

if ( isCheck ) {
	let current = '';

	try {
		current = readFileSync( TARGET, 'utf8' );
	} catch {
		current = '';
	}

	if ( current !== generated ) {
		process.stderr.write(
			'readme.txt is out of date with README.md. Run `npm run readme`.\n'
		);
		process.exit( 1 );
	}

	process.stdout.write( 'readme.txt is up to date.\n' );
} else {
	writeFileSync( TARGET, generated );
	process.stdout.write( 'Wrote readme.txt from README.md.\n' );
}
