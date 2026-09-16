#!/usr/bin/env node
/**
 * Checks the PHP code against the minimums the plugin header declares.
 *
 * Two checks, each reading its minimum from `simple-nws-weather-block.php` so
 * that raising a requirement is a one-line change to the header:
 *
 * - PHPStan with WPCompat fails when a WordPress function, method, parameter or
 *   hook is newer than "Requires at least".
 * - PHP_CodeSniffer with PHPCompatibilityWP fails when syntax or a PHP function
 *   is newer than "Requires PHP".
 *
 * Needs `composer install` first.
 *
 * Usage:
 *   node utils/check-php.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const PLUGIN_FILE = join( ROOT, 'simple-nws-weather-block.php' );

/**
 * Reads one field from the plugin header.
 *
 * @param {string} name Header field.
 * @return {string} Its value.
 */
function header( name ) {
	const match = readFileSync( PLUGIN_FILE, 'utf8' ).match(
		new RegExp( `^\\s*\\*\\s*${ name }:\\s*(\\S+)`, 'm' )
	);

	if ( ! match ) {
		process.stderr.write(
			`error: the plugin header has no "${ name }".\n`
		);
		process.exit( 1 );
	}

	return match[ 1 ];
}

/**
 * Runs a Composer binary and returns whether it passed.
 *
 * @param {string}   bin  Binary under vendor/bin.
 * @param {string[]} args Arguments.
 * @return {boolean} True on success.
 */
function run( bin, args ) {
	const path = join( ROOT, 'vendor', 'bin', bin );

	if ( ! existsSync( path ) ) {
		process.stderr.write(
			`error: ${ bin } is missing. Run \`composer install\`.\n`
		);
		process.exit( 1 );
	}

	return (
		0 === spawnSync( path, args, { cwd: ROOT, stdio: 'inherit' } ).status
	);
}

const wordpress = header( 'Requires at least' );
const php = header( 'Requires PHP' );

process.stdout.write(
	`\nWordPress APIs must exist in ${ wordpress } (Requires at least)\n`
);
const wpPassed = run( 'phpstan', [
	'analyse',
	'--no-progress',
	'--memory-limit=1G',
] );

process.stdout.write( `\nPHP code must run on ${ php } (Requires PHP)\n` );
const phpPassed = run( 'phpcs', [
	'--runtime-set',
	'testVersion',
	`${ php }-`,
] );

if ( ! wpPassed || ! phpPassed ) {
	process.stderr.write(
		'\nSomething in the code needs a newer version than the header declares. Either change the code or raise the requirement in simple-nws-weather-block.php, then run `npm run readme`.\n'
	);
	process.exit( 1 );
}
