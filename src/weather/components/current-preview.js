/**
 * Editor preview for a layout that shows a single set of conditions.
 *
 * Prints the class names `partials/current.php` prints and formats through the
 * same helpers `view.js` uses, so the preview is the block rather than a
 * drawing of it. One stylesheet then covers the canvas and the page alike.
 */

import { element } from '../lib/classes';
import { FALLBACK_ICON } from '../lib/icons';
import { METRIC_FIELDS, getMetricLabels } from '../layouts';
import {
	formatPercent,
	formatPlace,
	formatTemperature,
	formatWind,
} from '../lib/format';

/**
 * Renders the preview.
 *
 * @param {Object}  props          Component props.
 * @param {?Object} props.weather  Conditions, or null while loading.
 * @param {Object}  props.shown    Which fields are switched on.
 * @param {boolean} props.showUnit Whether to append the unit letter.
 * @param {string}  props.label    Location label configured for the block.
 * @return {Element} The preview.
 */
export default function CurrentPreview( { weather, shown, showUnit, label } ) {
	const metricLabels = getMetricLabels();
	const metrics = weather
		? {
				humidity: formatPercent( weather.humidity ),
				wind: formatWind( weather.windSpeed, weather.windDirection ),
				precipitation: formatPercent( weather.precipitation ),
				dewPoint: formatTemperature(
					weather.dewPoint,
					weather.temperatureUnit,
					showUnit
				),
			}
		: {};

	const visibleMetrics = METRIC_FIELDS.filter( ( field ) => shown[ field ] );
	const hasDetails =
		shown.condition || shown.location || !! visibleMetrics.length;

	return (
		<>
			{ ( shown.icon || shown.temperature ) && (
				<span className={ element( 'reading' ) }>
					{ shown.icon && (
						<span
							className={ `${ element( 'icon' ) } wi ${
								weather ? weather.iconClass : FALLBACK_ICON
							}` }
						/>
					) }
					{ shown.temperature && (
						<span className={ element( 'temperature' ) }>
							{ weather
								? formatTemperature(
										weather.temperature,
										weather.temperatureUnit,
										showUnit
									)
								: '—' }
						</span>
					) }
				</span>
			) }
			{ hasDetails && (
				<span className={ element( 'details' ) }>
					{ shown.condition && (
						<span className={ element( 'condition' ) }>
							{ weather ? weather.shortForecast : '' }
						</span>
					) }
					{ shown.location && (
						<span className={ element( 'location' ) }>
							{ weather
								? formatPlace(
										label,
										weather.city,
										weather.state
									)
								: label }
						</span>
					) }
					{ !! visibleMetrics.length && (
						<span className={ element( 'metrics' ) }>
							{ visibleMetrics.map( ( field ) => (
								<span
									key={ field }
									className={ element( 'metric' ) }
								>
									<span
										className={ element( 'metric-label' ) }
									>
										{ metricLabels[ field ] }
									</span>
									<span
										className={ element( 'metric-value' ) }
									>
										{ metrics[ field ] || '—' }
									</span>
								</span>
							) ) }
						</span>
					) }
				</span>
			) }
		</>
	);
}
