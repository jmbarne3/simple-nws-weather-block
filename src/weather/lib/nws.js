/**
 * Client-side access to the National Weather Service API.
 *
 * **Every request in this file is made by the visitor's browser.** Nothing here
 * ever runs on the server. That is a deliberate constraint rather than an
 * implementation detail: a server-side fetch would funnel every visitor's
 * forecast through the site's single IP address, which is exactly the shape of
 * traffic the NWS asks callers to avoid. Spread across visitors, each browser
 * makes at most two requests and then reads its own cache for an hour.
 *
 * The API is public, needs no key, and sends `Access-Control-Allow-Origin: *`,
 * so the browser can talk to it directly. Two requests are involved: a point
 * lookup that maps coordinates onto a forecast grid, and the forecast itself.
 *
 * @see https://www.weather.gov/documentation/services-web-api
 */

import { readCache, writeCache, deleteCache } from './cache';
import { normalisePeriod, pairDays, takeHours } from './periods';

/**
 * Base URL for every request.
 *
 * @type {string}
 */
const API_ROOT = 'https://api.weather.gov';

/**
 * Lifetime of a cached point lookup, in minutes.
 *
 * The coordinate-to-grid mapping effectively never changes, so it is held for
 * far longer than a forecast and is not tied to the configurable setting.
 *
 * @type {number}
 */
const POINTS_CACHE_MINUTES = 60 * 24 * 30;

/**
 * In-flight requests, keyed by URL.
 *
 * Several Weather blocks on one page usually share a location. De-duplicating
 * here means they make one network request between them rather than one each.
 *
 * @type {Map<string, Promise<Object>>}
 */
const pending = new Map();

/**
 * Fetches JSON from the API, reusing any identical request already in flight.
 *
 * Requests are deliberately not abortable. Because the promise is shared
 * between every block asking for the same URL, one block unmounting must not
 * cancel the request the others are waiting on. Callers that need to discard a
 * late result track that themselves.
 *
 * @param {string} url Absolute request URL.
 * @return {Promise<Object>} Parsed response body.
 * @throws {Error} When the response status is not in the 2xx range.
 */
async function fetchJson( url ) {
	if ( pending.has( url ) ) {
		return pending.get( url );
	}

	const request = ( async () => {
		const response = await fetch( url, {
			headers: { Accept: 'application/geo+json' },
		} );

		if ( ! response.ok ) {
			throw new Error(
				`National Weather Service request failed with status ${ response.status }.`
			);
		}

		return response.json();
	} )();

	pending.set( url, request );

	try {
		return await request;
	} finally {
		pending.delete( url );
	}
}

/**
 * Normalises a coordinate for use in a request and a cache key.
 *
 * NWS asks that coordinates carry no more than four decimal places; rounding
 * also keeps cache keys stable across blocks that store the same place with
 * different precision.
 *
 * @param {number|string} value Raw coordinate.
 * @return {?number} Rounded coordinate, or null when not a finite number.
 */
function normaliseCoordinate( value ) {
	const number = typeof value === 'number' ? value : parseFloat( value );

	if ( ! Number.isFinite( number ) ) {
		return null;
	}

	return Math.round( number * 10000 ) / 10000;
}

/**
 * Looks up the forecast grid that covers a set of coordinates.
 *
 * @param {number} latitude  Latitude.
 * @param {number} longitude Longitude.
 * @return {Promise<Object>} `{ forecast, forecastHourly, city, state, timeZone }`.
 */
async function getPoint( latitude, longitude ) {
	const key = `points:${ latitude },${ longitude }`;
	const cached = readCache( key, POINTS_CACHE_MINUTES );

	if ( cached ) {
		return cached;
	}

	const data = await fetchJson(
		`${ API_ROOT }/points/${ latitude },${ longitude }`
	);
	const properties = data?.properties || {};
	const relative = properties.relativeLocation?.properties || {};

	const point = {
		forecast: properties.forecast,
		forecastHourly: properties.forecastHourly,
		city: relative.city || '',
		state: relative.state || '',
		/*
		 * The IANA zone the forecast is for, not the visitor's. An hourly strip
		 * showing a campus in Florida reads the same whether it is opened from
		 * Orlando or from Tokyo, which is what an author means by "the forecast
		 * for this place".
		 */
		timeZone: properties.timeZone || '',
	};

	if ( ! point.forecast || ! point.forecastHourly ) {
		throw new Error(
			'The National Weather Service does not publish a forecast for that location.'
		);
	}

	writeCache( key, point );

	return point;
}

/**
 * Fetches the raw periods for a location, from cache where possible.
 *
 * @param {Object} options              Request options.
 * @param {number} options.latitude     Rounded latitude.
 * @param {number} options.longitude    Rounded longitude.
 * @param {string} options.forecastType `current` and `hourly` read the hourly
 *                                      endpoint; anything else reads the daily one.
 * @param {string} options.units        `us` or `si`.
 * @param {number} options.cacheMinutes Cache lifetime in minutes.
 * @return {Promise<{periods: Object[], point: Object}>} Raw periods and the point lookup.
 * @throws {Error} When the API returns no periods.
 */
async function fetchPeriods( {
	latitude,
	longitude,
	forecastType,
	units,
	cacheMinutes,
} ) {
	const point = await getPoint( latitude, longitude );
	const hourly = 'current' === forecastType || 'hourly' === forecastType;
	const endpoint = hourly ? point.forecastHourly : point.forecast;
	const url = 'si' === units ? `${ endpoint }?units=si` : endpoint;
	const key = `forecast:${ latitude },${ longitude }:${
		hourly ? 'hourly' : 'daily'
	}:${ units }`;

	let data = readCache( key, cacheMinutes );

	if ( ! data ) {
		data = await fetchJson( url );

		writeCache( key, data );
	}

	const periods = data?.properties?.periods;

	if ( ! Array.isArray( periods ) || ! periods.length ) {
		// A cached-but-malformed response should not keep failing.
		deleteCache( key );

		throw new Error(
			'The National Weather Service returned no forecast periods.'
		);
	}

	return { periods, point };
}

/**
 * Validates a coordinate pair, or throws.
 *
 * @param {number|string} latitude  Latitude.
 * @param {number|string} longitude Longitude.
 * @return {{lat: number, lon: number}} Rounded coordinates.
 * @throws {Error} When either coordinate is unusable.
 */
function requireCoordinates( latitude, longitude ) {
	const lat = normaliseCoordinate( latitude );
	const lon = normaliseCoordinate( longitude );

	if ( lat === null || lon === null ) {
		throw new Error( 'A valid latitude and longitude are required.' );
	}

	return { lat, lon };
}

/**
 * Fetches current conditions for a location.
 *
 * @param {Object}        options                Request options.
 * @param {number|string} options.latitude       Latitude.
 * @param {number|string} options.longitude      Longitude.
 * @param {string}        [options.forecastType] `current` for the present hour,
 *                                               `today` for the current daily period.
 * @param {string}        [options.units]        `us` for Fahrenheit, `si` for Celsius.
 * @param {number}        [options.cacheMinutes] Cache lifetime in minutes.
 * @return {Promise<Object>} Normalised conditions.
 * @throws {Error} When the coordinates are invalid or the API request fails.
 */
export async function getWeather( {
	latitude,
	longitude,
	forecastType = 'current',
	units = 'us',
	cacheMinutes = 60,
} = {} ) {
	const { lat, lon } = requireCoordinates( latitude, longitude );

	const { periods, point } = await fetchPeriods( {
		latitude: lat,
		longitude: lon,
		forecastType,
		units,
		cacheMinutes,
	} );

	return {
		...normalisePeriod( periods[ 0 ], units ),
		city: point.city,
		state: point.state,
		timeZone: point.timeZone,
	};
}

/**
 * Fetches a multi-period forecast for a location.
 *
 * @param {Object}        options                Request options.
 * @param {number|string} options.latitude       Latitude.
 * @param {number|string} options.longitude      Longitude.
 * @param {string}        [options.kind]         `daily` or `hourly`.
 * @param {number}        [options.count]        How many periods to return.
 * @param {string}        [options.units]        `us` for Fahrenheit, `si` for Celsius.
 * @param {number}        [options.cacheMinutes] Cache lifetime in minutes.
 * @return {Promise<Object>} `{ kind, periods, city, state, timeZone }`.
 * @throws {Error} When the coordinates are invalid or the API request fails.
 */
export async function getForecast( {
	latitude,
	longitude,
	kind = 'daily',
	count = 5,
	units = 'us',
	cacheMinutes = 60,
} = {} ) {
	const { lat, lon } = requireCoordinates( latitude, longitude );

	const { periods, point } = await fetchPeriods( {
		latitude: lat,
		longitude: lon,
		forecastType: 'hourly' === kind ? 'hourly' : 'daily',
		units,
		cacheMinutes,
	} );

	const normalised = periods.map( ( period ) =>
		normalisePeriod( period, units )
	);

	return {
		kind,
		periods:
			'hourly' === kind
				? takeHours( normalised, count )
				: pairDays( normalised, count ),
		city: point.city,
		state: point.state,
		timeZone: point.timeZone,
	};
}
