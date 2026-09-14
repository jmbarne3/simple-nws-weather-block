/**
 * Front-end runtime for the Weather block.
 *
 * `render.php` leaves a placeholder on the page carrying its configuration in a
 * `data-simple-weather-block` attribute. This script finds every such placeholder,
 * fetches the conditions from the National Weather Service, and fills it in.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import { __, sprintf } from '@wordpress/i18n';
import { getWeather, getVisitorCoordinates } from './lib/nws';
import { ALL_ICON_CLASSES } from './lib/icons';

/**
 * Matches every block placeholder on the page.
 *
 * @type {string}
 */
const SELECTOR = '[data-simple-weather-block]';

/**
 * Formats a temperature for display.
 *
 * @param {number}  value    Temperature.
 * @param {string}  unit     Unit letter, `F` or `C`.
 * @param {boolean} showUnit Whether to append the unit letter.
 * @return {string} Formatted temperature, or an empty string when unavailable.
 */
function formatTemperature( value, unit, showUnit ) {
	if ( ! Number.isFinite( value ) ) {
		return '';
	}

	const rounded = Math.round( value );

	return showUnit ? `${ rounded }°${ unit }` : `${ rounded }°`;
}

/**
 * Builds the sentence announced to screen readers.
 *
 * The icon and temperature are hidden from assistive technology, because a
 * glyph and a bare number read poorly on their own. This replaces them with
 * something a person would actually say.
 *
 * @param {Object} weather Normalised conditions from the API.
 * @param {string} label   Location label configured for the block, if any.
 * @return {string} A human-readable description.
 */
function describe( weather, label ) {
	const place =
		label || [ weather.city, weather.state ].filter( Boolean ).join( ', ' );
	const unit =
		'C' === weather.temperatureUnit
			? __( 'degrees Celsius', 'simple-weather-block' )
			: __( 'degrees Fahrenheit', 'simple-weather-block' );

	const conditions = Number.isFinite( weather.temperature )
		? sprintf(
				/* translators: 1: short forecast, 2: temperature, 3: unit name. */
				__( '%1$s, %2$d %3$s', 'simple-weather-block' ),
				weather.shortForecast,
				Math.round( weather.temperature ),
				unit
			)
		: weather.shortForecast;

	if ( ! place ) {
		return sprintf(
			/* translators: %s: conditions and temperature. */
			__( 'Current weather: %s', 'simple-weather-block' ),
			conditions
		);
	}

	return sprintf(
		/* translators: 1: place name, 2: conditions and temperature. */
		__( 'Current weather in %1$s: %2$s', 'simple-weather-block' ),
		place,
		conditions
	);
}

/**
 * Writes the conditions into a placeholder.
 *
 * @param {HTMLElement} element Block placeholder.
 * @param {Object}      weather Normalised conditions.
 * @param {Object}      config  Block configuration.
 * @return {void}
 */
function render( element, weather, config ) {
	const icon = element.querySelector(
		'.wp-block-simple-weather-block-weather__icon'
	);
	const temperature = element.querySelector(
		'.wp-block-simple-weather-block-weather__temperature'
	);
	const description = element.querySelector(
		'.wp-block-simple-weather-block-weather__description'
	);

	if ( icon ) {
		icon.classList.remove( ...ALL_ICON_CLASSES );
		icon.classList.add( weather.iconClass );
	}

	if ( temperature ) {
		temperature.textContent = formatTemperature(
			weather.temperature,
			weather.temperatureUnit,
			config.showUnit
		);
	}

	if ( description ) {
		description.textContent = describe( weather, config.label );
	}

	element.classList.remove( 'is-weather-loading' );
	element.classList.add( 'is-weather-loaded' );
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

		const weather = await getWeather( {
			latitude,
			longitude,
			forecastType: config.forecastType,
			units: config.units,
			cacheMinutes: config.cacheMinutes,
		} );

		render( element, weather, config );
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
