/**
 * Editor preview for a layout that shows a run of forecast periods.
 *
 * Columns are drawn from the requested count rather than from the data, so the
 * preview keeps its shape while the forecast loads and an author dragging the
 * count slider sees the strip resize immediately.
 */

import { element } from '../lib/classes';
import { FALLBACK_ICON } from '../lib/icons';
import { formatHour, formatPercent, formatTemperature } from '../lib/format';

/**
 * Labels one column.
 *
 * A daily period arrives already named -- "Today", "Wednesday" -- while an
 * hourly one carries only a timestamp and has to be formatted in the forecast
 * location's own time zone.
 *
 * @param {?Object} period     Period from `getForecast`, or undefined.
 * @param {string}  kind       `daily` or `hourly`.
 * @param {string}  [timeZone] IANA time zone for the forecast location.
 * @return {string} The column label, or an empty string while loading.
 */
function periodLabel( period, kind, timeZone ) {
	if ( ! period ) {
		return '';
	}

	return 'hourly' === kind
		? formatHour( period.startTime, timeZone )
		: period.label;
}

/**
 * Renders the preview.
 *
 * @param {Object}  props          Component props.
 * @param {?Object} props.forecast Forecast, or null while loading.
 * @param {string}  props.kind     `daily` or `hourly`.
 * @param {number}  props.count    How many columns to draw.
 * @param {Object}  props.shown    Which fields are switched on.
 * @param {boolean} props.showUnit Whether to append the unit letter.
 * @return {Element} The preview.
 */
export default function ForecastPreview( {
	forecast,
	kind,
	count,
	shown,
	showUnit,
} ) {
	const periods = forecast?.periods || [];
	const columns = Array.from( { length: count }, ( _, index ) => index );

	return (
		<ul className={ element( 'periods' ) }>
			{ columns.map( ( index ) => {
				const period = periods[ index ];
				const precipitation = period
					? formatPercent( period.precipitation )
					: '';

				return (
					<li key={ index } className={ element( 'period' ) }>
						<span className={ element( 'period-name' ) }>
							{ periodLabel( period, kind, forecast?.timeZone ) }
						</span>
						{ shown.icon && (
							<span
								className={ `${ element( 'icon' ) } wi ${
									period ? period.iconClass : FALLBACK_ICON
								}` }
							/>
						) }
						{ shown.temperature && (
							<span className={ element( 'temperatures' ) }>
								<span className={ element( 'temperature' ) }>
									{ period
										? formatTemperature(
												period.high,
												period.temperatureUnit,
												showUnit
											)
										: '—' }
								</span>
								{ 'daily' === kind && (
									<span
										className={ element(
											'temperature-low'
										) }
									>
										{ period
											? formatTemperature(
													period.low,
													period.temperatureUnit,
													showUnit
												)
											: '' }
									</span>
								) }
							</span>
						) }
						{ shown.condition && (
							<span className={ element( 'condition' ) }>
								{ period ? period.shortForecast : '' }
							</span>
						) }
						{ shown.precipitation && !! precipitation && (
							<span className={ element( 'precipitation' ) }>
								<i className="wi wi-raindrop" />
								<span
									className={ element(
										'precipitation-value'
									) }
								>
									{ precipitation }
								</span>
							</span>
						) }
					</li>
				);
			} ) }
		</ul>
	);
}
