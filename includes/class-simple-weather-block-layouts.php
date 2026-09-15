<?php
/**
 * What each layout is made of, on the server side.
 *
 * @package SimpleWeatherBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The layout registry `render.php` renders from.
 *
 * This mirrors the structural half of `src/weather/layouts/*.js` -- which
 * endpoint a layout reads, which fields it can show, and how many periods it
 * may have. PHP cannot read those modules, and generating this file from them
 * would put a build step between an author and a one-line change, so the two
 * are kept in step by hand. **Anything changed in `src/weather/layouts/` must
 * be changed here too.**
 *
 * What is deliberately not mirrored is everything the editor alone needs:
 * titles, descriptions, inserter icons and the attributes a variation inserts
 * with. Those never reach the server, so they live only in the JS.
 */
class Simple_Weather_Block_Layouts {

	/**
	 * Layout used when a block predates the attribute.
	 *
	 * @var string
	 */
	const DEFAULT_LAYOUT = 'inline';

	/**
	 * Every layout, keyed by name.
	 *
	 * `kind` decides which request the browser makes: `current` reads a single
	 * period, `daily` and `hourly` read a run of them. `period_range` is
	 * `array( min, max, fallback )` and is absent on a single-reading layout.
	 *
	 * @return array
	 */
	public static function all() {
		return array(
			'inline'   => array(
				'kind'   => 'current',
				'fields' => array( 'icon', 'temperature', 'condition', 'location' ),
			),
			'stacked'  => array(
				'kind'   => 'current',
				'fields' => array( 'icon', 'temperature', 'condition', 'location' ),
			),
			'detailed' => array(
				'kind'   => 'current',
				'fields' => array( 'icon', 'temperature', 'condition', 'location', 'humidity', 'wind', 'precipitation', 'dewPoint' ),
			),
			'daily'    => array(
				'kind'         => 'daily',
				'fields'       => array( 'icon', 'temperature', 'condition', 'precipitation' ),
				'period_range' => array( 2, 7, 5 ),
			),
			'hourly'   => array(
				'kind'         => 'hourly',
				'fields'       => array( 'icon', 'temperature', 'condition', 'precipitation' ),
				'period_range' => array( 2, 12, 6 ),
			),
		);
	}

	/**
	 * Returns one layout's definition, falling back to the default.
	 *
	 * @param string $layout Layout name.
	 * @return array
	 */
	public static function get( $layout ) {
		$layouts = self::all();

		return isset( $layouts[ $layout ] ) ? $layouts[ $layout ] : $layouts[ self::DEFAULT_LAYOUT ];
	}

	/**
	 * Returns the name of a layout that exists, falling back to the default.
	 *
	 * @param mixed $layout Layout name from the block attributes.
	 * @return string
	 */
	public static function name( $layout ) {
		return is_string( $layout ) && array_key_exists( $layout, self::all() )
			? $layout
			: self::DEFAULT_LAYOUT;
	}

	/**
	 * Whether a layout shows a run of periods rather than a single reading.
	 *
	 * @param string $layout Layout name.
	 * @return bool
	 */
	public static function is_multiple( $layout ) {
		return 'current' !== self::get( $layout )['kind'];
	}

	/**
	 * Attribute backing each field.
	 *
	 * Mirrors `src/weather/layouts/fields.js`.
	 *
	 * @return array
	 */
	public static function field_attributes() {
		return array(
			'icon'          => 'showIcon',
			'temperature'   => 'showTemperature',
			'condition'     => 'showCondition',
			'location'      => 'showLocation',
			'humidity'      => 'showHumidity',
			'wind'          => 'showWind',
			'precipitation' => 'showPrecipitation',
			'dewPoint'      => 'showDewPoint',
		);
	}

	/**
	 * Label printed beside each reading in the detailed layout.
	 *
	 * Printed on the server rather than written by the script, so a block whose
	 * forecast never arrives still reads as something rather than as blank rows.
	 * Mirrors `getMetricLabels()` in `src/weather/layouts/fields.js`.
	 *
	 * @return array
	 */
	public static function metric_labels() {
		return array(
			'humidity'      => __( 'Humidity', 'simple-weather-block' ),
			'wind'          => __( 'Wind', 'simple-weather-block' ),
			'precipitation' => __( 'Chance of precipitation', 'simple-weather-block' ),
			'dewPoint'      => __( 'Dew point', 'simple-weather-block' ),
		);
	}

	/**
	 * The fields a block actually renders.
	 *
	 * Those the author switched on, less any the chosen layout has nowhere to
	 * put. Icon and temperature default to on, matching `block.json`; every
	 * other field defaults to off.
	 *
	 * @param string $layout     Layout name.
	 * @param array  $attributes Block attributes.
	 * @return array Field names, in the layout's own order.
	 */
	public static function enabled_fields( $layout, $attributes ) {
		$on_by_default = array( 'showIcon', 'showTemperature' );
		$backing       = self::field_attributes();
		$enabled       = array();

		foreach ( self::get( $layout )['fields'] as $field ) {
			$attribute = $backing[ $field ];

			$is_on = isset( $attributes[ $attribute ] )
				? (bool) $attributes[ $attribute ]
				: in_array( $attribute, $on_by_default, true );

			if ( $is_on ) {
				$enabled[] = $field;
			}
		}

		return $enabled;
	}

	/**
	 * Clamps a period count to what its layout allows.
	 *
	 * @param string $layout Layout name.
	 * @param mixed  $count  Requested count.
	 * @return int A count within range, or 1 for a single-reading layout.
	 */
	public static function clamp_period_count( $layout, $count ) {
		$definition = self::get( $layout );

		if ( empty( $definition['period_range'] ) ) {
			return 1;
		}

		list( $min, $max, $fallback ) = $definition['period_range'];

		$count = is_numeric( $count ) ? (int) $count : $fallback;

		return max( $min, min( $max, $count ) );
	}
}
