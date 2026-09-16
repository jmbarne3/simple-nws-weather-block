<?php
/**
 * Site-wide settings.
 *
 * @package SimpleNWSWeatherBlock
 */

/**
 * Sanitization and defaults for the settings screen.
 */
class SettingsTest extends WP_UnitTestCase {

	public function tear_down() {
		delete_option( Simple_NWS_Weather_Block_Settings::OPTION );
		parent::tear_down();
	}

	public function test_defaults_apply_when_nothing_is_stored() {
		$this->assertSame( Simple_NWS_Weather_Block_Settings::defaults(), Simple_NWS_Weather_Block_Settings::all() );
	}

	public function test_non_array_input_returns_defaults() {
		$this->assertSame( Simple_NWS_Weather_Block_Settings::defaults(), Simple_NWS_Weather_Block_Settings::sanitize( 'nonsense' ) );
	}

	public function test_valid_input_is_kept() {
		$output = Simple_NWS_Weather_Block_Settings::sanitize(
			array(
				'cache_minutes'     => '15',
				'icon_color'        => '#ffc904',
				'latitude'          => '28.60241234',
				'longitude'         => '-81.20019876',
				'location_label'    => '<b>Orlando</b>',
				'units'             => 'si',
				'geocoder_endpoint' => 'http://localhost:2322/api',
			)
		);

		$this->assertSame( 15, $output['cache_minutes'] );
		$this->assertSame( '#ffc904', $output['icon_color'] );
		$this->assertSame( '28.6024', $output['latitude'] );
		$this->assertSame( '-81.2002', $output['longitude'] );
		$this->assertSame( 'Orlando', $output['location_label'] );
		$this->assertSame( 'si', $output['units'] );
		$this->assertSame( 'http://localhost:2322/api', $output['geocoder_endpoint'] );
	}

	public function test_cache_lifetime_is_bounded() {
		$this->assertSame( 0, Simple_NWS_Weather_Block_Settings::sanitize( array( 'cache_minutes' => '-5' ) )['cache_minutes'] );
		$this->assertSame( 10080, Simple_NWS_Weather_Block_Settings::sanitize( array( 'cache_minutes' => '999999' ) )['cache_minutes'] );
	}

	public function test_invalid_values_fall_back() {
		$output = Simple_NWS_Weather_Block_Settings::sanitize(
			array(
				'icon_color'        => 'javascript:alert(1)',
				'units'             => 'kelvin',
				'geocoder_endpoint' => 'ftp://example.org',
			)
		);

		$this->assertSame( '', $output['icon_color'] );
		$this->assertSame( 'us', $output['units'] );
		$this->assertSame( '', $output['geocoder_endpoint'] );
	}

	public function test_half_a_coordinate_pair_is_discarded() {
		$output = Simple_NWS_Weather_Block_Settings::sanitize(
			array(
				'latitude'  => '28.6',
				'longitude' => '200',
			)
		);

		$this->assertSame( '', $output['latitude'] );
		$this->assertSame( '', $output['longitude'] );
	}

	public function test_block_colors_accept_theme_presets_only() {
		$this->assertSame( 'var(--wp--preset--color--primary)', Simple_NWS_Weather_Block_Settings::sanitize_color( 'var(--wp--preset--color--primary)' ) );
		$this->assertSame( '', Simple_NWS_Weather_Block_Settings::sanitize_color( 'var(--evil); background: red' ) );
	}

	public function test_settings_page_is_added_for_administrators() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		set_current_screen( 'dashboard' );

		Simple_NWS_Weather_Block_Settings::add_settings_page();

		$this->assertNotEmpty( menu_page_url( Simple_NWS_Weather_Block_Settings::PAGE, false ) );
	}

	public function test_plugins_screen_gets_a_settings_link() {
		$links = Simple_NWS_Weather_Block_Settings::add_action_link( array() );

		$this->assertStringContainsString( 'options-general.php?page=simple-nws-weather-block', $links[0] );
	}
}
