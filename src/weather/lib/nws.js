/**
 * Client-side access to the National Weather Service API.
 *
 * The API is public, needs no key, and sends `Access-Control-Allow-Origin: *`,
 * so the browser can talk to it directly. Two requests are involved: a point
 * lookup that maps coordinates onto a forecast grid, and the forecast itself.
 *
 * @see https://www.weather.gov/documentation/services-web-api
 */

import { getIconClass } from './icons';

/**
 * Base URL for every request.
 *
 * @type {string}
 */
const API_ROOT = 'https://api.weather.gov';

/**
 * Prefix for every local storage key this plugin writes.
 *
 * The version segment lets a future release invalidate everything it cached
 * previously by bumping the number.
 *
 * @type {string}
 */
const CACHE_PREFIX = 'wpWeatherBlock:v1:';

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
 * Fallback store used when local storage is unavailable.
 *
 * Safari in private browsing and any browser with site data blocked will throw
 * on access, so values live in memory for the life of the page instead.
 *
 * @type {Map<string, {t: number, v: *}>}
 */
const memoryStore = new Map();

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
 * Returns local storage if it is usable, otherwise null.
 *
 * @return {?Storage} Storage object or null.
 */
function getStorage() {
	try {
		const probe = `${ CACHE_PREFIX }probe`;

		window.localStorage.setItem( probe, '1' );
		window.localStorage.removeItem( probe );

		return window.localStorage;
	} catch {
		return null;
	}
}

/**
 * Reads a cached value that has not yet expired.
 *
 * Expiry is evaluated against the lifetime supplied by the caller rather than
 * one stored alongside the value, so shortening the setting takes effect
 * immediately instead of waiting for existing entries to age out.
 *
 * @param {string} key           Cache key, without the prefix.
 * @param {number} maxAgeMinutes Maximum age to accept. Zero misses every time.
 * @return {?*} The cached value, or null on a miss.
 */
function readCache( key, maxAgeMinutes ) {
	if ( ! maxAgeMinutes || maxAgeMinutes <= 0 ) {
		return null;
	}

	const fullKey = CACHE_PREFIX + key;
	const storage = getStorage();
	let entry;

	if ( storage ) {
		try {
			const raw = storage.getItem( fullKey );

			entry = raw ? JSON.parse( raw ) : null;
		} catch {
			entry = null;
		}
	} else {
		entry = memoryStore.get( fullKey ) || null;
	}

	if ( ! entry || typeof entry.t !== 'number' ) {
		return null;
	}

	const age = Date.now() - entry.t;

	// A clock change can make an entry look like it came from the future.
	if ( age < 0 || age > maxAgeMinutes * 60 * 1000 ) {
		deleteCache( key );

		return null;
	}

	return entry.v;
}

/**
 * Stores a value with the current timestamp.
 *
 * @param {string} key   Cache key, without the prefix.
 * @param {*}      value Value to store. Must be JSON-serialisable.
 * @return {void}
 */
function writeCache( key, value ) {
	const fullKey = CACHE_PREFIX + key;
	const entry = { t: Date.now(), v: value };
	const storage = getStorage();

	if ( ! storage ) {
		memoryStore.set( fullKey, entry );

		return;
	}

	try {
		storage.setItem( fullKey, JSON.stringify( entry ) );
	} catch {
		// Quota exceeded, most likely. Degrade to memory rather than fail.
		memoryStore.set( fullKey, entry );
	}
}

/**
 * Removes a cached value.
 *
 * @param {string} key Cache key, without the prefix.
 * @return {void}
 */
function deleteCache( key ) {
	const fullKey = CACHE_PREFIX + key;
	const storage = getStorage();

	memoryStore.delete( fullKey );

	if ( storage ) {
		try {
			storage.removeItem( fullKey );
		} catch {
			// Nothing useful to do here.
		}
	}
}

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
 * @return {Promise<Object>} `{ forecast, forecastHourly, city, state }`.
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
	const lat = normaliseCoordinate( latitude );
	const lon = normaliseCoordinate( longitude );

	if ( lat === null || lon === null ) {
		throw new Error( 'A valid latitude and longitude are required.' );
	}

	const point = await getPoint( lat, lon );
	const hourly = 'current' === forecastType;
	const endpoint = hourly ? point.forecastHourly : point.forecast;
	const url = 'si' === units ? `${ endpoint }?units=si` : endpoint;
	const key = `forecast:${ lat },${ lon }:${ forecastType }:${ units }`;

	let data = readCache( key, cacheMinutes );

	if ( ! data ) {
		data = await fetchJson( url );

		writeCache( key, data );
	}

	const period = data?.properties?.periods?.[ 0 ];

	if ( ! period ) {
		// A cached-but-malformed response should not keep failing.
		deleteCache( key );

		throw new Error(
			'The National Weather Service returned no forecast periods.'
		);
	}

	return {
		temperature: period.temperature,
		temperatureUnit:
			period.temperatureUnit || ( 'si' === units ? 'C' : 'F' ),
		shortForecast: period.shortForecast || '',
		iconClass: getIconClass( period ),
		isDaytime: !! period.isDaytime,
		periodName: period.name || '',
		city: point.city,
		state: point.state,
	};
}

/**
 * Asks the browser for the visitor's coordinates.
 *
 * @param {number} [timeout] How long to wait, in milliseconds.
 * @return {Promise<{latitude: number, longitude: number}>} The visitor's position.
 * @throws {Error} When geolocation is unsupported, denied or times out.
 */
export function getVisitorCoordinates( timeout = 10000 ) {
	return new Promise( ( resolve, reject ) => {
		if ( ! window.navigator?.geolocation ) {
			reject( new Error( 'This browser does not support geolocation.' ) );

			return;
		}

		window.navigator.geolocation.getCurrentPosition(
			( position ) =>
				resolve( {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				} ),
			() => reject( new Error( 'Could not determine your location.' ) ),
			{ timeout, maximumAge: 15 * 60 * 1000 }
		);
	} );
}
