/**
 * Front-end runtime for the Weather block.
 *
 * `render.php` leaves a placeholder on the page carrying its configuration in a
 * `data-simple-weather-block` attribute. This script finds every such placeholder,
 * fetches the conditions from the National Weather Service, and fills it in.
 *
 * It only ever writes into elements the server already printed. Which fields a
 * layout shows is decided in PHP, so anything switched off simply is not in the
 * document and the corresponding write is skipped.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import { getWeather, getForecast, getVisitorCoordinates } from './lib/nws';
import { ALL_ICON_CLASSES } from './lib/icons';
import {
	describeCurrent,
	describeForecast,
	describePeriod,
	formatHour,
	formatPercent,
	formatPlace,
	formatTemperature,
	formatWind,
} from './lib/format';

/**
 * Matches every block placeholder on the page.
 *
 * @type {string}
 */
const SELECTOR = '[data-simple-weather-block]';

/**
 * Prefix shared by every class inside the block.
 *
 * @type {string}
 */
const BASE = 'wp-block-simple-weather-block-weather';

/**
 * Finds one element inside a block by its unprefixed class name.
 *
 * @param {HTMLElement} parent Element to search within.
 * @param {string}      name   Class name after the block prefix, e.g. `icon`.
 * @return {?HTMLElement} The element, or null when the field is switched off.
 */
function find( parent, name ) {
	return parent.querySelector( `.${ BASE }__${ name }` );
}

/**
 * Writes text into an element, when that element exists.
 *
 * @param {?HTMLElement} element Target element.
 * @param {string}       text    Text to write.
 * @return {void}
 */
function setText( element, text ) {
	if ( element ) {
		element.textContent = text;
	}
}

/**
 * Swaps the condition glyph on an icon element.
 *
 * @param {?HTMLElement} element   Icon element.
 * @param {string}       iconClass Weather Icons class to apply.
 * @return {void}
 */
function setIcon( element, iconClass ) {
	if ( ! element ) {
		return;
	}

	element.classList.remove( ...ALL_ICON_CLASSES );
	element.classList.add( iconClass );
}

/**
 * Fills in the readings shown as labelled pairs in the detailed layout.
 *
 * A reading the forecast does not carry -- an hourly period has no dew point in
 * some grids -- has its whole row removed rather than left showing a label with
 * nothing after it.
 *
 * @param {HTMLElement} element Block placeholder.
 * @param {Object}      weather Normalised conditions.
 * @param {Object}      config  Block configuration.
 * @return {void}
 */
function renderMetrics( element, weather, config ) {
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

	element.querySelectorAll( `.${ BASE }__metric` ).forEach( ( metric ) => {
		const value = values[ metric.dataset.metric ] || '';

		if ( ! value ) {
			metric.remove();

			return;
		}

		setText( find( metric, 'metric-value' ), value );
	} );
}

/**
 * Fills in a block showing a single set of conditions.
 *
 * @param {HTMLElement} element Block placeholder.
 * @param {Object}      weather Normalised conditions.
 * @param {Object}      config  Block configuration.
 * @return {void}
 */
function renderCurrent( element, weather, config ) {
	setIcon( find( element, 'icon' ), weather.iconClass );
	setText(
		find( element, 'temperature' ),
		formatTemperature(
			weather.temperature,
			weather.temperatureUnit,
			config.showUnit
		)
	);
	setText( find( element, 'condition' ), weather.shortForecast );
	setText(
		find( element, 'location' ),
		formatPlace( config.label, weather.city, weather.state )
	);

	renderMetrics( element, weather, config );

	setText(
		find( element, 'description' ),
		describeCurrent( weather, config.label )
	);
}

/**
 * Fills in a block showing a run of forecast periods.
 *
 * The columns already exist, so this writes into them in order. A grid that
 * returns fewer periods than the author asked for leaves the surplus columns
 * hidden rather than empty.
 *
 * @param {HTMLElement} element  Block placeholder.
 * @param {Object}      forecast Result from `getForecast`.
 * @param {Object}      config   Block configuration.
 * @return {void}
 */
function renderForecast( element, forecast, config ) {
	const { kind, periods, timeZone } = forecast;
	const place = formatPlace( config.label, forecast.city, forecast.state );

	setText(
		find( element, 'description' ),
		describeForecast( kind, periods.length, place )
	);

	element
		.querySelectorAll( `.${ BASE }__period` )
		.forEach( ( column, index ) => {
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

/**
 * Resolves the coordinates a block should use.
 *
 * @param {Object} config Block configuration.
 * @return {Promise<{latitude: (number|string), longitude: (number|string)}>} Coordinates.
 */
async function resolveCoordinates( config ) {
	if ( 'visitor' !== config.source ) {
		return { latitude: config.latitude, longitude: config.longitude };
	}

	try {
		return await getVisitorCoordinates();
	} catch ( error ) {
		/*
		 * Permission denied, or the request timed out. Fall back to the
		 * coordinates the block was saved with when it has them, so a refused
		 * prompt degrades to the site's location instead of an empty block.
		 */
		if ( config.latitude && config.longitude ) {
			return { latitude: config.latitude, longitude: config.longitude };
		}

		throw error;
	}
}

/**
 * Fetches and renders the conditions for a single placeholder.
 *
 * @param {HTMLElement} element Block placeholder.
 * @return {Promise<void>} Resolves once the block has settled.
 */
async function hydrate( element ) {
	let config;

	try {
		config = JSON.parse( element.dataset.simpleWeatherBlock );
	} catch {
		element.classList.add( 'is-weather-error' );

		return;
	}

	// Only ever process a placeholder once.
	delete element.dataset.simpleWeatherBlock;

	try {
		const { latitude, longitude } = await resolveCoordinates( config );
		const request = {
			latitude,
			longitude,
			units: config.units,
			cacheMinutes: config.cacheMinutes,
		};

		if ( 'current' === config.kind ) {
			renderCurrent(
				element,
				await getWeather( {
					...request,
					forecastType: config.forecastType,
				} ),
				config
			);
		} else {
			renderForecast(
				element,
				await getForecast( {
					...request,
					kind: config.kind,
					count: config.count,
				} ),
				config
			);
		}

		element.classList.remove( 'is-weather-loading' );
		element.classList.add( 'is-weather-loaded' );
	} catch {
		/*
		 * There is nothing useful to put in front of a visitor when the
		 * forecast is unavailable, so the block removes itself and leaves the
		 * surrounding layout intact.
		 */
		element.classList.remove( 'is-weather-loading' );
		element.classList.add( 'is-weather-error' );
	}
}

/**
 * Hydrates every Weather block on the page.
 *
 * @return {void}
 */
function start() {
	document.querySelectorAll( SELECTOR ).forEach( hydrate );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', start );
} else {
	start();
}
