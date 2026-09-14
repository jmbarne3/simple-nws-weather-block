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
 * @package WeatherBlock
 */

$weather_block_defaults = Weather_Block_Settings::frontend_defaults();
$weather_block_source   = isset( $attributes['locationSource'] ) ? $attributes['locationSource'] : 'site';

$weather_block_latitude  = '';
$weather_block_longitude = '';
$weather_block_label     = '';

if ( 'custom' === $weather_block_source ) {
	$weather_block_latitude  = Weather_Block_Settings::sanitize_coordinate(
		isset( $attributes['latitude'] ) ? $attributes['latitude'] : '',
		90
	);
	$weather_block_longitude = Weather_Block_Settings::sanitize_coordinate(
		isset( $attributes['longitude'] ) ? $attributes['longitude'] : '',
		180
	);
	$weather_block_label     = isset( $attributes['locationLabel'] ) ? $attributes['locationLabel'] : '';
} elseif ( 'site' === $weather_block_source ) {
	$weather_block_latitude  = $weather_block_defaults['latitude'];
	$weather_block_longitude = $weather_block_defaults['longitude'];
	$weather_block_label     = $weather_block_defaults['locationLabel'];
}

/*
 * A visitor-located block resolves its coordinates in the browser. Any other
 * block with no usable pair has nothing to show, so it renders nothing at all
 * rather than leaving a permanent placeholder on the page.
 */
if ( 'visitor' !== $weather_block_source && ( '' === $weather_block_latitude || '' === $weather_block_longitude ) ) {
	return;
}

$weather_block_show_icon = ! isset( $attributes['showIcon'] ) || $attributes['showIcon'];
$weather_block_show_temp = ! isset( $attributes['showTemperature'] ) || $attributes['showTemperature'];

// Nothing enabled means nothing to render.
if ( ! $weather_block_show_icon && ! $weather_block_show_temp ) {
	return;
}

// A block-level colour wins over the site default; both must be valid hex.
$weather_block_color = '';

if ( ! empty( $attributes['iconColor'] ) ) {
	$weather_block_color = Weather_Block_Settings::sanitize_color( $attributes['iconColor'] );
}

if ( '' === $weather_block_color ) {
	$weather_block_color = $weather_block_defaults['iconColor'];
}

$weather_block_config = array(
	'source'       => $weather_block_source,
	'latitude'     => $weather_block_latitude,
	'longitude'    => $weather_block_longitude,
	'label'        => $weather_block_label,
	'forecastType' => isset( $attributes['forecastType'] ) ? $attributes['forecastType'] : 'current',
	'units'        => ! empty( $attributes['units'] ) ? $attributes['units'] : $weather_block_defaults['units'],
	'cacheMinutes' => $weather_block_defaults['cacheMinutes'],
	'showUnit'     => ! empty( $attributes['showUnit'] ),
);

$weather_block_wrapper = get_block_wrapper_attributes(
	array(
		'class'             => 'is-weather-loading',
		'style'             => '' !== $weather_block_color ? '--wb-icon-color:' . $weather_block_color . ';' : '',
		'data-weather-block' => wp_json_encode( $weather_block_config ),
	)
);
?>
<div <?php echo $weather_block_wrapper; // phpcs:ignore WordPress.Security.EscapeOutputBeforePrinting.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>>
	<?php if ( $weather_block_show_icon ) : ?>
		<span class="wp-block-weather-block-weather__icon wi wi-na" aria-hidden="true"></span>
	<?php endif; ?>
	<?php if ( $weather_block_show_temp ) : ?>
		<span class="wp-block-weather-block-weather__temperature" aria-hidden="true">&mdash;</span>
	<?php endif; ?>
	<span class="wp-block-weather-block-weather__description"></span>
</div>
