<?php
/**
 * Server-side markup for the Weather block.
 *
 * Nothing about the weather is fetched here. This file resolves the block's
 * configuration, prints a placeholder carrying it in a data attribute, and
 * hands off to the partial for the chosen layout. `view.js` then calls the
 * National Weather Service from the visitor's browser and fills it in.
 *
 * Two things follow from that. The HTML a page cache stores holds settings and
 * never a temperature, so a cached page is never a stale one. And every request
 * to the NWS comes from a visitor's own address rather than from the site's,
 * which is what keeps a busy page from concentrating traffic onto one IP.
 *
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 *
 * @package SimpleWeatherBlock
 */

$simple_weather_block_defaults = Simple_Weather_Block_Settings::frontend_defaults();
$simple_weather_block_layout   = Simple_Weather_Block_Layouts::name(
	isset( $attributes['layout'] ) ? $attributes['layout'] : ''
);
$simple_weather_block_kind     = Simple_Weather_Block_Layouts::get( $simple_weather_block_layout )['kind'];
$simple_weather_block_source   = isset( $attributes['locationSource'] ) ? $attributes['locationSource'] : 'site';

$simple_weather_block_latitude  = '';
$simple_weather_block_longitude = '';
$simple_weather_block_label     = '';

if ( 'custom' === $simple_weather_block_source ) {
	$simple_weather_block_latitude  = Simple_Weather_Block_Settings::sanitize_coordinate(
		isset( $attributes['latitude'] ) ? $attributes['latitude'] : '',
		90
	);
	$simple_weather_block_longitude = Simple_Weather_Block_Settings::sanitize_coordinate(
		isset( $attributes['longitude'] ) ? $attributes['longitude'] : '',
		180
	);
	$simple_weather_block_label     = isset( $attributes['locationLabel'] ) ? $attributes['locationLabel'] : '';
} elseif ( 'site' === $simple_weather_block_source ) {
	$simple_weather_block_latitude  = $simple_weather_block_defaults['latitude'];
	$simple_weather_block_longitude = $simple_weather_block_defaults['longitude'];
	$simple_weather_block_label     = $simple_weather_block_defaults['locationLabel'];
}

/*
 * A visitor-located block resolves its coordinates in the browser. Any other
 * block with no usable pair has nothing to show, so it renders nothing at all
 * rather than leaving a permanent placeholder on the page.
 */
if ( 'visitor' !== $simple_weather_block_source && ( '' === $simple_weather_block_latitude || '' === $simple_weather_block_longitude ) ) {
	return;
}

$simple_weather_block_fields = Simple_Weather_Block_Layouts::enabled_fields( $simple_weather_block_layout, $attributes );

// Nothing enabled means nothing to render.
if ( empty( $simple_weather_block_fields ) ) {
	return;
}

$simple_weather_block_count = Simple_Weather_Block_Layouts::clamp_period_count(
	$simple_weather_block_layout,
	isset( $attributes['periodCount'] ) ? $attributes['periodCount'] : null
);

// A block-level colour wins over the site default; both must be valid hex.
$simple_weather_block_color = '';

if ( ! empty( $attributes['iconColor'] ) ) {
	$simple_weather_block_color = Simple_Weather_Block_Settings::sanitize_color( $attributes['iconColor'] );
}

if ( '' === $simple_weather_block_color ) {
	$simple_weather_block_color = $simple_weather_block_defaults['iconColor'];
}

/*
 * Everything `view.js` needs to make the request, and nothing it does not. The
 * shape of this array is the contract between this file and that one.
 */
$simple_weather_block_config = array(
	'layout'       => $simple_weather_block_layout,
	'kind'         => $simple_weather_block_kind,
	'count'        => $simple_weather_block_count,
	'source'       => $simple_weather_block_source,
	'latitude'     => $simple_weather_block_latitude,
	'longitude'    => $simple_weather_block_longitude,
	'label'        => $simple_weather_block_label,
	'forecastType' => isset( $attributes['forecastType'] ) ? $attributes['forecastType'] : 'current',
	'units'        => ! empty( $attributes['units'] ) ? $attributes['units'] : $simple_weather_block_defaults['units'],
	'cacheMinutes' => $simple_weather_block_defaults['cacheMinutes'],
	'showUnit'     => ! empty( $attributes['showUnit'] ),
);

$simple_weather_block_wrapper = get_block_wrapper_attributes(
	array(
		'class'                     => 'is-weather-loading is-weather-' . $simple_weather_block_layout,
		'style'                     => '' !== $simple_weather_block_color ? '--wb-icon-color:' . $simple_weather_block_color . ';' : '',
		'data-simple-weather-block' => wp_json_encode( $simple_weather_block_config ),
	)
);

/**
 * Prefix shared by every class inside the block.
 *
 * Mirrors `BASE` in `src/weather/lib/classes.js`.
 *
 * @var string
 */
$simple_weather_block_base = 'wp-block-simple-weather-block-weather';

/**
 * Whether a field is switched on for this block.
 *
 * Handed to the partials so they can ask rather than re-derive.
 *
 * @param string $field Field name.
 * @return bool
 */
$simple_weather_block_has = static function ( $field ) use ( $simple_weather_block_fields ) {
	return in_array( $field, $simple_weather_block_fields, true );
};
?>
<div <?php echo $simple_weather_block_wrapper; // phpcs:ignore WordPress.Security.EscapeOutputBeforePrinting.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>>
	<?php
	require Simple_Weather_Block_Layouts::is_multiple( $simple_weather_block_layout )
		? __DIR__ . '/partials/forecast.php'
		: __DIR__ . '/partials/current.php';
	?>
</div>
