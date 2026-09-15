/**
 * Front-end runtime for the Weather block.
 *
 * `render.php` leaves a placeholder on the page carrying its configuration in a
 * `data-simple-weather-block` attribute. This script finds every such
 * placeholder, resolves its coordinates, fetches the forecast from the National
 * Weather Service **in the visitor's browser**, and hands the result to the
 * writer for that layout.
 *
 * Nothing here runs on the server, and that is the point: the request comes
 * from the visitor's own IP rather than from the site's, so a busy page cannot
 * concentrate traffic onto one address and run into NWS rate limiting.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import { getWeather, getForecast } from './lib/nws';
import { getVisitorCoordinates } from './lib/geolocation';
import renderCurrent from './hydrate/current';
import renderForecast from './hydrate/forecast';

/**
 * Matches every block placeholder on the page.
 *
 * @type {string}
 */
const SELECTOR = '[data-simple-weather-block]';

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
 * @param {HTMLElement} block Block placeholder.
 * @return {Promise<void>} Resolves once the block has settled.
 */
async function hydrate( block ) {
	let config;

	try {
		config = JSON.parse( block.dataset.simpleWeatherBlock );
	} catch {
		block.classList.add( 'is-weather-error' );

		return;
	}

	// Only ever process a placeholder once.
	delete block.dataset.simpleWeatherBlock;

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
				block,
				await getWeather( {
					...request,
					forecastType: config.forecastType,
				} ),
				config
			);
		} else {
			renderForecast(
				block,
				await getForecast( {
					...request,
					kind: config.kind,
					count: config.count,
				} ),
				config
			);
		}

		block.classList.remove( 'is-weather-loading' );
		block.classList.add( 'is-weather-loaded' );
	} catch {
		/*
		 * There is nothing useful to put in front of a visitor when the
		 * forecast is unavailable, so the block removes itself and leaves the
		 * surrounding layout intact.
		 */
		block.classList.remove( 'is-weather-loading' );
		block.classList.add( 'is-weather-error' );
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
