<?php
/**
 * Server-side output of the Weather block.
 *
 * @package SimpleNWSWeatherBlock
 */

/**
 * What render.php prints for a given configuration.
 */
class RenderTest extends WP_UnitTestCase {

	public function tear_down() {
		delete_option( Simple_NWS_Weather_Block_Settings::OPTION );
		parent::tear_down();
	}

	/**
	 * Renders the block the way a post would.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	private function render( array $attributes = array() ) {
		$json = $attributes ? ' ' . wp_json_encode( $attributes ) : '';

		return trim( do_blocks( "<!-- wp:simple-nws-weather-block/weather{$json} /-->" ) );
	}

	/**
	 * Pulls the configuration view.js reads out of the rendered markup.
	 *
	 * @param string $html Rendered block.
	 * @return array
	 */
	private function config( $html ) {
		$processor = new WP_HTML_Tag_Processor( $html );

		$this->assertTrue( $processor->next_tag(), 'No wrapper element was rendered.' );

		$raw = $processor->get_attribute( 'data-simple-nws-weather-block' );

		$this->assertIsString( $raw, 'The wrapper carries no configuration.' );

		return json_decode( $raw, true );
	}

	private function set_site_location() {
		update_option(
			Simple_NWS_Weather_Block_Settings::OPTION,
			array(
				'latitude'       => '28.6024',
				'longitude'      => '-81.2001',
				'location_label' => 'Orlando',
				'units'          => 'us',
				'cache_minutes'  => 30,
			)
		);
	}

	public function test_site_default_without_a_location_renders_nothing() {
		$this->assertSame( '', $this->render() );
	}

	public function test_site_default_uses_the_configured_location() {
		$this->set_site_location();

		$html   = $this->render();
		$config = $this->config( $html );

		$this->assertSame( '28.6024', $config['latitude'] );
		$this->assertSame( '-81.2001', $config['longitude'] );
		$this->assertSame( 'Orlando', $config['label'] );
		$this->assertSame( 'current', $config['kind'] );
		$this->assertSame( 30, $config['cacheMinutes'] );
		$this->assertStringContainsString( 'wp-block-simple-nws-weather-block-weather', $html );
		$this->assertStringContainsString( 'is-weather-loading', $html );
		$this->assertStringContainsString( 'is-weather-inline', $html );
	}

	public function test_configuration_does_not_ask_for_the_visitors_location() {
		$this->set_site_location();

		$this->assertArrayNotHasKey( 'source', $this->config( $this->render() ) );
	}

	public function test_custom_location_is_rounded_and_used() {
		$html = $this->render(
			array(
				'locationSource' => 'custom',
				'latitude'       => '38.897700001',
				'longitude'      => '-77.036500001',
				'locationLabel'  => 'Washington',
			)
		);

		$config = $this->config( $html );

		$this->assertSame( '38.8977', $config['latitude'] );
		$this->assertSame( '-77.0365', $config['longitude'] );
		$this->assertSame( 'Washington', $config['label'] );
	}

	/**
	 * @dataProvider data_unusable_coordinates
	 *
	 * @param string $latitude  Latitude.
	 * @param string $longitude Longitude.
	 */
	public function test_custom_location_with_unusable_coordinates_renders_nothing( $latitude, $longitude ) {
		$this->set_site_location();

		$this->assertSame(
			'',
			$this->render(
				array(
					'locationSource' => 'custom',
					'latitude'       => $latitude,
					'longitude'      => $longitude,
				)
			)
		);
	}

	public function data_unusable_coordinates() {
		return array(
			'empty'            => array( '', '' ),
			'half a pair'      => array( '28.6', '' ),
			'not a number'     => array( 'north', '-81.2' ),
			'latitude too big' => array( '91', '-81.2' ),
			'longitude too big' => array( '28.6', '-181' ),
		);
	}

	/*
	 * Blocks saved while "Visitor's location" existed fail the attribute enum,
	 * so WordPress hands render.php the default instead: the site location.
	 */
	public function test_retired_visitor_source_falls_back_to_site_default() {
		$this->set_site_location();

		$this->assertSame( '28.6024', $this->config( $this->render( array( 'locationSource' => 'visitor' ) ) )['latitude'] );
	}

	public function test_every_field_off_renders_nothing() {
		$this->set_site_location();

		$this->assertSame(
			'',
			$this->render(
				array(
					'showIcon'        => false,
					'showTemperature' => false,
				)
			)
		);
	}

	public function test_daily_layout_prints_a_clamped_number_of_periods() {
		$this->set_site_location();

		$html   = $this->render(
			array(
				'layout'      => 'daily',
				'periodCount' => 40,
			)
		);
		$config = $this->config( $html );

		$this->assertSame( 'daily', $config['kind'] );
		$this->assertSame( 7, $config['count'] );
		$this->assertSame( 7, substr_count( $html, '__period"' ) );
	}

	public function test_detailed_layout_prints_metric_labels() {
		$this->set_site_location();

		$html = $this->render(
			array(
				'layout'       => 'detailed',
				'showHumidity' => true,
				'showWind'     => true,
			)
		);

		$this->assertStringContainsString( 'Humidity', $html );
		$this->assertStringContainsString( 'Wind', $html );
		$this->assertStringNotContainsString( 'Dew point', $html );
	}

	public function test_unknown_layout_falls_back_to_inline() {
		$this->set_site_location();

		$this->assertSame( 'inline', $this->config( $this->render( array( 'layout' => 'bogus' ) ) )['layout'] );
	}

	public function test_icon_color_is_applied_as_a_custom_property() {
		$this->set_site_location();

		$this->assertStringContainsString( '--wb-icon-color:#ffc904', $this->render( array( 'iconColor' => '#ffc904' ) ) );
	}

	public function test_unsafe_icon_color_is_discarded() {
		$this->set_site_location();

		$html = $this->render( array( 'iconColor' => 'red;background:url(x)' ) );

		$this->assertStringNotContainsString( '--wb-icon-color', $html );
		$this->assertStringNotContainsString( 'url(x)', $html );
	}

	public function test_block_level_units_override_the_site_default() {
		$this->set_site_location();

		$this->assertSame( 'si', $this->config( $this->render( array( 'units' => 'si' ) ) )['units'] );
	}
}
