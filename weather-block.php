<?php
/**
 * Plugin Name:       Weather Block
 * Plugin URI:        https://github.com/jmbarne3/weather-block
 * Description:       Displays current conditions from the National Weather Service using client-side requests and the Weather Icons font.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Jim Barnes
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       weather-block
 *
 * @package WeatherBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'WEATHER_BLOCK_VERSION', '0.1.0' );
define( 'WEATHER_BLOCK_FILE', __FILE__ );
define( 'WEATHER_BLOCK_DIR', plugin_dir_path( __FILE__ ) );
define( 'WEATHER_BLOCK_URL', plugin_dir_url( __FILE__ ) );

/**
 * Version of the bundled Weather Icons release.
 *
 * @see https://erikflowers.github.io/weather-icons/
 */
define( 'WEATHER_BLOCK_ICONS_VERSION', '2.0.10' );

/**
 * Style handle for the bundled Weather Icons font.
 *
 * Prefixed so it cannot collide with another plugin or theme that ships the
 * same icon set under the generic `weather-icons` handle.
 */
define( 'WEATHER_BLOCK_ICONS_HANDLE', 'weather-block-weather-icons' );

require_once WEATHER_BLOCK_DIR . 'includes/class-weather-block-settings.php';

/**
 * Registers the Weather Icons stylesheet.
 *
 * Registered (not enqueued) on `init` at an early priority so it is available
 * as a dependency by the time the block enqueues its own styles. The block
 * lists this handle in the `style` array of its block.json, which means
 * WordPress enqueues it on any page -- front end or editor -- where the block
 * is actually present.
 *
 * @return void
 */
function weather_block_register_icon_style() {
	wp_register_style(
		WEATHER_BLOCK_ICONS_HANDLE,
		WEATHER_BLOCK_URL . 'assets/weather-icons/css/weather-icons.min.css',
		array(),
		WEATHER_BLOCK_ICONS_VERSION
	);
}
add_action( 'init', 'weather_block_register_icon_style', 5 );

/**
 * Registers the block type(s) from the generated block manifest.
 *
 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
 *
 * @return void
 */
function weather_block_init() {
	wp_register_block_types_from_metadata_collection(
		WEATHER_BLOCK_DIR . 'build',
		WEATHER_BLOCK_DIR . 'build/blocks-manifest.php'
	);
}
add_action( 'init', 'weather_block_init' );

/**
 * Passes the site-wide defaults to the block editor.
 *
 * The editor preview fetches live data the same way the front end does, so it
 * needs to know the fallback location, colour and cache lifetime for blocks
 * that have not overridden them. `generate_block_asset_handle()` gives us the
 * handle WordPress generated for the block's editor script, so the defaults are
 * guaranteed to be defined before that script runs.
 *
 * @return void
 */
function weather_block_enqueue_editor_defaults() {
	$handle = generate_block_asset_handle( 'weather-block/weather', 'editorScript' );

	if ( ! wp_script_is( $handle, 'registered' ) ) {
		return;
	}

	wp_add_inline_script(
		$handle,
		'window.weatherBlockDefaults = ' . wp_json_encode( Weather_Block_Settings::frontend_defaults() ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'weather_block_enqueue_editor_defaults' );

Weather_Block_Settings::init();
