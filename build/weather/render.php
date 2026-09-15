<?php
/**
 * Server-side markup for the Weather block.
 *
 * Nothing is fetched here. The block renders a placeholder carrying the
 * resolved configuration in a data attribute, and `view.js` fills it in from
 * the visitor's browser. That keeps the block compatible with page caching:
 * the cached HTML holds settings, never a temperature.
 *
 * A multi-period layout prints its columns empty rather than letting the script
 * create them, so the strip occupies its final size before any data arrives and
 * the page does not reflow around it.
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

/**
 * Which fields each layout can render.
 *
 * A deliberate copy of `src/weather/lib/layouts.js`, which PHP cannot read.
 * Anything changed there must be changed here too.
 */
$simple_weather_block_layouts = array(
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
		'kind'   => 'daily',
		'fields' => array( 'icon', 'temperature', 'condition', 'precipitation' ),
	),
	'hourly'   => array(
		'kind'   => 'hourly',
		'fields' => array( 'icon', 'temperature', 'condition', 'precipitation' ),
	),
);

/**
 * Attribute backing each field name.
 */
$simple_weather_block_field_attributes = array(
	'icon'          => 'showIcon',
	'temperature'   => 'showTemperature',
	'condition'     => 'showCondition',
	'location'      => 'showLocation',
	'humidity'      => 'showHumidity',
	'wind'          => 'showWind',
	'precipitation' => 'showPrecipitation',
	'dewPoint'      => 'showDewPoint',
);

/**
 * How many periods each multi-period layout may show.
 */
$simple_weather_block_period_range = array(
	'daily'  => array( 2, 7, 5 ),
	'hourly' => array( 2, 12, 6 ),
);

$simple_weather_block_defaults = Simple_Weather_Block_Settings::frontend_defaults();
$simple_weather_block_source   = isset( $attributes['locationSource'] ) ? $attributes['locationSource'] : 'site';
$simple_weather_block_layout   = isset( $attributes['layout'] ) && isset( $simple_weather_block_layouts[ $attributes['layout'] ] )
	? $attributes['layout']
	: 'inline';
$simple_weather_block_kind     = $simple_weather_block_layouts[ $simple_weather_block_layout ]['kind'];
$simple_weather_block_multiple = 'current' !== $simple_weather_block_kind;

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

/*
 * The fields this block actually renders: those the author switched on, less
 * any the chosen layout has nowhere to put.
 */
$simple_weather_block_fields = array();

foreach ( $simple_weather_block_layouts[ $simple_weather_block_layout ]['fields'] as $simple_weather_block_field ) {
	$simple_weather_block_attribute = $simple_weather_block_field_attributes[ $simple_weather_block_field ];
	$simple_weather_block_enabled   = isset( $attributes[ $simple_weather_block_attribute ] )
		? (bool) $attributes[ $simple_weather_block_attribute ]
		: in_array( $simple_weather_block_attribute, array( 'showIcon', 'showTemperature' ), true );

	if ( $simple_weather_block_enabled ) {
		$simple_weather_block_fields[] = $simple_weather_block_field;
	}
}

// Nothing enabled means nothing to render.
if ( empty( $simple_weather_block_fields ) ) {
	return;
}

/**
 * Whether a field is switched on for this block.
 *
 * @param string $field Field name.
 * @return bool
 */
$simple_weather_block_has = static function ( $field ) use ( $simple_weather_block_fields ) {
	return in_array( $field, $simple_weather_block_fields, true );
};

// How many columns a forecast strip needs.
$simple_weather_block_count = 1;

if ( $simple_weather_block_multiple ) {
	list( $simple_weather_block_min, $simple_weather_block_max, $simple_weather_block_fallback ) = $simple_weather_block_period_range[ $simple_weather_block_kind ];

	$simple_weather_block_count = isset( $attributes['periodCount'] ) ? (int) $attributes['periodCount'] : $simple_weather_block_fallback;
	$simple_weather_block_count = max( $simple_weather_block_min, min( $simple_weather_block_max, $simple_weather_block_count ) );
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
 * Readings shown as a labelled pair in the detailed layout.
 *
 * The labels are printed here rather than by the script, so a block whose
 * forecast never arrives still reads as something rather than as blank rows.
 */
$simple_weather_block_metrics = array(
	'humidity'      => __( 'Humidity', 'simple-weather-block' ),
	'wind'          => __( 'Wind', 'simple-weather-block' ),
	'precipitation' => __( 'Chance of precipitation', 'simple-weather-block' ),
	'dewPoint'      => __( 'Dew point', 'simple-weather-block' ),
);

$simple_weather_block_shown_metrics = array_intersect_key(
	$simple_weather_block_metrics,
	array_flip( $simple_weather_block_fields )
);

$simple_weather_block_base = 'wp-block-simple-weather-block-weather';
?>
<div <?php echo $simple_weather_block_wrapper; // phpcs:ignore WordPress.Security.EscapeOutputBeforePrinting.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>>
<?php if ( $simple_weather_block_multiple ) : ?>
	<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__description"></span>
	<ul class="<?php echo esc_attr( $simple_weather_block_base ); ?>__periods">
		<?php for ( $simple_weather_block_i = 0; $simple_weather_block_i < $simple_weather_block_count; $simple_weather_block_i++ ) : ?>
			<li class="<?php echo esc_attr( $simple_weather_block_base ); ?>__period">
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__period-name" aria-hidden="true"></span>
				<?php if ( $simple_weather_block_has( 'icon' ) ) : ?>
					<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__icon wi wi-na" aria-hidden="true"></span>
				<?php endif; ?>
				<?php if ( $simple_weather_block_has( 'temperature' ) ) : ?>
					<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__temperatures" aria-hidden="true">
						<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__temperature">&mdash;</span>
						<?php if ( 'daily' === $simple_weather_block_kind ) : ?>
							<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__temperature-low"></span>
						<?php endif; ?>
					</span>
				<?php endif; ?>
				<?php if ( $simple_weather_block_has( 'condition' ) ) : ?>
					<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__condition" aria-hidden="true"></span>
				<?php endif; ?>
				<?php if ( $simple_weather_block_has( 'precipitation' ) ) : ?>
					<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__precipitation" aria-hidden="true"><i class="wi wi-raindrop" aria-hidden="true"></i><span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__precipitation-value"></span></span>
				<?php endif; ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__period-description"></span>
			</li>
		<?php endfor; ?>
	</ul>
<?php else : ?>
	<?php if ( $simple_weather_block_has( 'icon' ) || $simple_weather_block_has( 'temperature' ) ) : ?>
		<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__reading">
			<?php if ( $simple_weather_block_has( 'icon' ) ) : ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__icon wi wi-na" aria-hidden="true"></span>
			<?php endif; ?>
			<?php if ( $simple_weather_block_has( 'temperature' ) ) : ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__temperature" aria-hidden="true">&mdash;</span>
			<?php endif; ?>
		</span>
	<?php endif; ?>
	<?php if ( $simple_weather_block_has( 'condition' ) || $simple_weather_block_has( 'location' ) || ! empty( $simple_weather_block_shown_metrics ) ) : ?>
		<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__details">
			<?php if ( $simple_weather_block_has( 'condition' ) ) : ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__condition" aria-hidden="true"></span>
			<?php endif; ?>
			<?php if ( $simple_weather_block_has( 'location' ) ) : ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__location" aria-hidden="true"><?php echo esc_html( $simple_weather_block_label ); ?></span>
			<?php endif; ?>
			<?php if ( ! empty( $simple_weather_block_shown_metrics ) ) : ?>
				<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__metrics" aria-hidden="true">
					<?php foreach ( $simple_weather_block_shown_metrics as $simple_weather_block_metric => $simple_weather_block_metric_label ) : ?>
						<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__metric" data-metric="<?php echo esc_attr( $simple_weather_block_metric ); ?>">
							<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__metric-label"><?php echo esc_html( $simple_weather_block_metric_label ); ?></span>
							<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__metric-value"></span>
						</span>
					<?php endforeach; ?>
				</span>
			<?php endif; ?>
		</span>
	<?php endif; ?>
	<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__description"></span>
<?php endif; ?>
</div>
