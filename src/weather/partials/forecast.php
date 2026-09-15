<?php
/**
 * Markup for a layout showing a run of forecast periods.
 *
 * Covers the daily and hourly layouts. The columns are printed empty rather
 * than created by the script, so the strip occupies its final size before any
 * data arrives and the page does not reflow around it.
 *
 * The list itself is left visible to assistive technology -- "list, 5 items" is
 * useful -- while each column's visible parts are hidden and replaced by the
 * sentence in `__period-description`, written by `hydrate/forecast.js`.
 *
 * Required from `render.php`, which supplies:
 *     $simple_weather_block_base (string): Class prefix.
 *     $simple_weather_block_has (callable): Whether a field is switched on.
 *     $simple_weather_block_count (int): How many columns to print.
 *     $simple_weather_block_kind (string): `daily` or `hourly`.
 *
 * @package SimpleWeatherBlock
 */

?>
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
					<?php /* An hourly period is a single reading; only a day has a high and a low. */ ?>
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
