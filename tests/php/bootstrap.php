<?php
/**
 * Boots the WordPress test library with this plugin loaded.
 *
 * Run inside wp-env, which installs a PHPUnit library matching whichever
 * WordPress version it is running and points WP_TESTS_DIR at it:
 *
 *     npm run test:php
 *
 * @package SimpleNWSWeatherBlock
 */

$simple_nws_weather_block_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $simple_nws_weather_block_tests_dir || ! file_exists( $simple_nws_weather_block_tests_dir . '/includes/functions.php' ) ) {
	fwrite( STDERR, "WP_TESTS_DIR is not set or has no test library. Run the tests through `npm run test:php`.\n" );
	exit( 1 );
}

require_once dirname( __DIR__, 2 ) . '/vendor/yoast/phpunit-polyfills/phpunitpolyfills-autoload.php';
require_once $simple_nws_weather_block_tests_dir . '/includes/functions.php';

tests_add_filter(
	'muplugins_loaded',
	static function () {
		require dirname( __DIR__, 2 ) . '/simple-nws-weather-block.php';
	}
);

require $simple_nws_weather_block_tests_dir . '/includes/bootstrap.php';
