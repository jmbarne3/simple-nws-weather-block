<?php
/**
 * Server-side markup for the Weather block.
 *
 * Nothing is fetched here. The block renders a placeholder carrying the
 * resolved configuration in a data attribute, and `view.js` fills it in from
 * the visitor's browser. That keeps the block compatible with page caching:
 * the cached HTML holds settings, never a temperature.
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

$simple_weather_block_show_icon = ! isset( $attributes['showIcon'] ) || $attributes['showIcon'];
$simple_weather_block_show_temp = ! isset( $attributes['showTemperature'] ) || $attributes['showTemperature'];

// Nothing enabled means nothing to render.
if ( ! $simple_weather_block_show_icon && ! $simple_weather_block_show_temp ) {
	return;
}

// A block-level colour wins over the site default; both must be valid hex.
$simple_weather_block_color = '';

if ( ! empty( $attributes['iconColor'] ) ) {
	$simple_weather_block_color = Simple_Weather_Block_Settings::sanitize_color( $attributes['iconColor'] );
}

if ( '' === $simple_weather_block_color ) {
	$simple_weather_block_color = $simple_weather_block_defaults['iconColor'];
}

$simple_weather_block_config = array(
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
		'class'             => 'is-weather-loading',
		'style'             => '' !== $simple_weather_block_color ? '--wb-icon-color:' . $simple_weather_block_color . ';' : '',
		'data-simple-weather-block' => wp_json_encode( $simple_weather_block_config ),
	)
);
?>
<div <?php echo $simple_weather_block_wrapper; // phpcs:ignore WordPress.Security.EscapeOutputBeforePrinting.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>>
	<?php if ( $simple_weather_block_show_icon ) : ?>
		<span class="wp-block-simple-weather-block-weather__icon wi wi-na" aria-hidden="true"></span>
	<?php endif; ?>
	<?php if ( $simple_weather_block_show_temp ) : ?>
		<span class="wp-block-simple-weather-block-weather__temperature" aria-hidden="true">&mdash;</span>
	<?php endif; ?>
	<span class="wp-block-simple-weather-block-weather__description"></span>
</div>
