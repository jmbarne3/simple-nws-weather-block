<?php
/**
 * The plugin loads and registers what it says it does.
 *
 * These are the checks most likely to break on a new WordPress release: block
 * registration from the manifest, asset handles and the editor bootstrap.
 *
 * @package SimpleNWSWeatherBlock
 */

/**
 * Plugin bootstrap and block registration.
 */
class PluginTest extends WP_UnitTestCase {

	/**
	 * Registered block type under test.
	 *
	 * @return WP_Block_Type
	 */
	private function block_type() {
		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( 'simple-nws-weather-block/weather' );

		$this->assertInstanceOf( WP_Block_Type::class, $block_type, 'The Weather block is not registered.' );

		return $block_type;
	}

	public function test_constants_are_defined() {
		$this->assertTrue( defined( 'SIMPLE_NWS_WEATHER_BLOCK_VERSION' ) );
		$this->assertFileExists( SIMPLE_NWS_WEATHER_BLOCK_FILE );
		$this->assertDirectoryExists( SIMPLE_NWS_WEATHER_BLOCK_DIR . 'build' );
	}

	public function test_built_block_metadata_matches_plugin_version() {
		$metadata = wp_json_file_decode( SIMPLE_NWS_WEATHER_BLOCK_DIR . 'build/weather/block.json', array( 'associative' => true ) );

		$this->assertSame( SIMPLE_NWS_WEATHER_BLOCK_VERSION, $metadata['version'], 'build/ is stale. Run `npm run build`.' );
	}

	public function test_block_is_dynamic() {
		$this->assertTrue( $this->block_type()->is_dynamic() );
	}

	public function test_block_has_scripts_and_styles() {
		$block_type = $this->block_type();

		$this->assertNotEmpty( $block_type->editor_script_handles );
		$this->assertNotEmpty( $block_type->view_script_handles );
		$this->assertContains( SIMPLE_NWS_WEATHER_BLOCK_ICONS_HANDLE, $block_type->style_handles );

		foreach ( array_merge( $block_type->editor_script_handles, $block_type->view_script_handles ) as $handle ) {
			$this->assertTrue( wp_script_is( $handle, 'registered' ), "Script {$handle} is not registered." );
		}
	}

	public function test_icon_style_is_registered() {
		$this->assertTrue( wp_style_is( SIMPLE_NWS_WEATHER_BLOCK_ICONS_HANDLE, 'registered' ) );
	}

	public function test_location_source_offers_only_editor_chosen_locations() {
		$attributes = $this->block_type()->attributes;

		$this->assertSame( array( 'site', 'custom' ), $attributes['locationSource']['enum'] );
	}

	public function test_layout_enum_matches_server_registry() {
		$attributes = $this->block_type()->attributes;

		$this->assertEqualsCanonicalizing(
			array_keys( Simple_NWS_Weather_Block_Layouts::all() ),
			$attributes['layout']['enum']
		);
	}

	public function test_editor_receives_site_defaults() {
		$handle = generate_block_asset_handle( 'simple-nws-weather-block/weather', 'editorScript' );

		simple_nws_weather_block_enqueue_editor_defaults();

		$before = wp_scripts()->get_data( $handle, 'before' );

		$this->assertIsArray( $before );
		$this->assertStringContainsString( 'window.simpleNwsWeatherBlockDefaults', implode( "\n", $before ) );
	}

	public function test_rest_route_is_registered() {
		$routes = rest_get_server()->get_routes();

		$this->assertArrayHasKey( '/simple-nws-weather-block/v1/places', $routes );
	}
}
