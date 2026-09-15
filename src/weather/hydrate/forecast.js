/**
 * Fills in a block showing a run of forecast periods.
 *
 * Writes into the markup `partials/forecast.php` printed. The columns already
 * exist, so this walks them in order rather than building any.
 */

import { find, findAll, setIcon, setText } from './dom';
import { describeForecast, describePeriod } from '../lib/describe';
import {
	formatHour,
	formatPercent,
	formatPlace,
	formatTemperature,
} from '../lib/format';

/**
 * Renders the forecast into a block.
 *
 * A grid that returns fewer periods than the author asked for leaves the
 * surplus columns hidden rather than empty.
 *
 * @param {HTMLElement} block    Block placeholder.
 * @param {Object}      forecast Result from `getForecast`.
 * @param {Object}      config   Block configuration.
 * @return {void}
 */
export default function renderForecast( block, forecast, config ) {
	const { kind, periods, timeZone } = forecast;
	const place = formatPlace( config.label, forecast.city, forecast.state );

	setText(
		find( block, 'description' ),
		describeForecast( kind, periods.length, place )
	);

	findAll( block, 'period' ).forEach( ( column, index ) => {
		const period = periods[ index ];

		if ( ! period ) {
			column.hidden = true;

			return;
		}

		setText(
			find( column, 'period-name' ),
			'hourly' === kind
				? formatHour( period.startTime, timeZone )
				: period.label
		);
		setIcon( find( column, 'icon' ), period.iconClass );
		setText(
			find( column, 'temperature' ),
			formatTemperature(
				period.high,
				period.temperatureUnit,
				config.showUnit
			)
		);
		setText(
			find( column, 'temperature-low' ),
			formatTemperature(
				period.low,
				period.temperatureUnit,
				config.showUnit
			)
		);
		setText( find( column, 'condition' ), period.shortForecast );

		const precipitation = find( column, 'precipitation' );

		if ( precipitation ) {
			const value = formatPercent( period.precipitation );

			// No reading at all reads better than a lone raindrop glyph.
			precipitation.hidden = ! value;
			setText( find( precipitation, 'precipitation-value' ), value );
		}

		setText(
			find( column, 'period-description' ),
			describePeriod( period, kind, timeZone )
		);
	} );
}
