<?php
/**
 * The server-side layout registry.
 *
 * @package SimpleNWSWeatherBlock
 */

/**
 * Layout lookups, field filtering and period clamping.
 */
class LayoutsTest extends WP_UnitTestCase {

	public function test_icon_and_temperature_are_on_by_default() {
		$this->assertSame( array( 'icon', 'temperature' ), Simple_NWS_Weather_Block_Layouts::enabled_fields( 'inline', array() ) );
	}

	public function test_fields_a_layout_cannot_show_are_dropped() {
		$fields = Simple_NWS_Weather_Block_Layouts::enabled_fields( 'inline', array( 'showWind' => true ) );

		$this->assertNotContains( 'wind', $fields );
	}

	public function test_period_counts_are_clamped() {
		$this->assertSame( 1, Simple_NWS_Weather_Block_Layouts::clamp_period_count( 'stacked', 9 ) );
		$this->assertSame( 2, Simple_NWS_Weather_Block_Layouts::clamp_period_count( 'hourly', 0 ) );
		$this->assertSame( 12, Simple_NWS_Weather_Block_Layouts::clamp_period_count( 'hourly', 99 ) );
		$this->assertSame( 5, Simple_NWS_Weather_Block_Layouts::clamp_period_count( 'daily', 'lots' ) );
	}

	public function test_multiple_layouts() {
		$this->assertFalse( Simple_NWS_Weather_Block_Layouts::is_multiple( 'detailed' ) );
		$this->assertTrue( Simple_NWS_Weather_Block_Layouts::is_multiple( 'daily' ) );
		$this->assertTrue( Simple_NWS_Weather_Block_Layouts::is_multiple( 'hourly' ) );
	}
}
