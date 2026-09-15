/**
 * Adds the settings screen to the default `@wordpress/scripts` build.
 *
 * The default configuration discovers entry points from `block.json`, which
 * covers the block but not the admin screen. Everything else is left exactly as
 * `wp-scripts` sets it up.
 */

const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

/**
 * The default entry points, which recent versions express as a function.
 *
 * @return {Object} Entry points keyed by output path.
 */
function defaultEntry() {
	return 'function' === typeof defaultConfig.entry
		? defaultConfig.entry()
		: defaultConfig.entry;
}

module.exports = {
	...defaultConfig,
	entry: () => ( {
		...defaultEntry(),
		'settings/index': path.resolve(
			process.cwd(),
			'src/settings/index.js'
		),
	} ),
};
