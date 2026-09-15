<?php
/**
 * Markup for a layout showing a single set of conditions.
 *
 * Covers the inline, stacked and detailed layouts. All three print the same
 * elements and differ only in how `style.scss` arranges them, which is why one
 * partial serves them all: the structure is the same reading either way.
 *
 * Every visible element is hidden from assistive technology, because a glyph
 * and a bare number read poorly on their own. `__description` carries the
 * sentence that replaces them, written by `hydrate/current.js`.
 *
 * Required from `render.php`, which supplies:
 *     $simple_weather_block_base (string): Class prefix.
 *     $simple_weather_block_has (callable): Whether a field is switched on.
 *     $simple_weather_block_label (string): Configured location label.
 *
 * @package SimpleWeatherBlock
 */

$simple_weather_block_metrics = array_intersect_key(
	Simple_Weather_Block_Layouts::metric_labels(),
	array_flip( $simple_weather_block_fields )
);

$simple_weather_block_has_details = $simple_weather_block_has( 'condition' )
	|| $simple_weather_block_has( 'location' )
	|| ! empty( $simple_weather_block_metrics );
?>
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
<?php if ( $simple_weather_block_has_details ) : ?>
	<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__details">
		<?php if ( $simple_weather_block_has( 'condition' ) ) : ?>
			<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__condition" aria-hidden="true"></span>
		<?php endif; ?>
		<?php if ( $simple_weather_block_has( 'location' ) ) : ?>
			<?php /* Printed here when it is known, so a configured label needs no script to appear. */ ?>
			<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__location" aria-hidden="true"><?php echo esc_html( $simple_weather_block_label ); ?></span>
		<?php endif; ?>
		<?php if ( ! empty( $simple_weather_block_metrics ) ) : ?>
			<span class="<?php echo esc_attr( $simple_weather_block_base ); ?>__metrics" aria-hidden="true">
				<?php foreach ( $simple_weather_block_metrics as $simple_weather_block_metric => $simple_weather_block_metric_label ) : ?>
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
