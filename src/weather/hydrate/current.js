/**
 * Fills in a block showing a single set of conditions.
 *
 * Writes into the markup `partials/current.php` printed.
 */

import { find, findAll, setIcon, setText } from './dom';
import { describeCurrent } from '../lib/describe';
import {
	formatPercent,
	formatPlace,
	formatTemperature,
	formatWind,
} from '../lib/format';

/**
 * Fills in the readings shown as labelled pairs in the detailed layout.
 *
 * A reading the forecast does not carry has its whole row removed rather than
 * left showing a label with nothing after it.
 *
 * @param {HTMLElement} block   Block placeholder.
 * @param {Object}      weather Normalised conditions.
 * @param {Object}      config  Block configuration.
 * @return {void}
 */
function renderMetrics( block, weather, config ) {
	const values = {
		humidity: formatPercent( weather.humidity ),
		wind: formatWind( weather.windSpeed, weather.windDirection ),
		precipitation: formatPercent( weather.precipitation ),
		dewPoint: formatTemperature(
			weather.dewPoint,
			weather.temperatureUnit,
			config.showUnit
		),
	};

	findAll( block, 'metric' ).forEach( ( metric ) => {
		const value = values[ metric.dataset.metric ] || '';

		if ( ! value ) {
			metric.remove();

			return;
		}

		setText( find( metric, 'metric-value' ), value );
	} );
}

/**
 * Renders the conditions into a block.
 *
 * @param {HTMLElement} block   Block placeholder.
 * @param {Object}      weather Normalised conditions.
 * @param {Object}      config  Block configuration.
 * @return {void}
 */
export default function renderCurrent( block, weather, config ) {
	setIcon( find( block, 'icon' ), weather.iconClass );
	setText(
		find( block, 'temperature' ),
		formatTemperature(
			weather.temperature,
			weather.temperatureUnit,
			config.showUnit
		)
	);
	setText( find( block, 'condition' ), weather.shortForecast );
	setText(
		find( block, 'location' ),
		formatPlace( config.label, weather.city, weather.state )
	);

	renderMetrics( block, weather, config );

	setText(
		find( block, 'description' ),
		describeCurrent( weather, config.label )
	);
}
