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
 * previously by bumping the number. It moved to v2 when point lookups began
 * storing the location's time zone, which earlier entries do not carry.
 *
 * @type {string}
 */
const CACHE_PREFIX = 'simpleWeatherBlock:v2:';

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
 * Reads the numeric part of an NWS measurement object.
 *
 * Several fields arrive as `{ unitCode, value }` and any of them can be null
 * when the forecast does not cover that quantity.
 *
 * @param {?Object} measurement Measurement object from the API.
 * @return {?number} The value, or null when absent or not a finite number.
 */
function readValue( measurement ) {
	const value = measurement?.value;

	return Number.isFinite( value ) ? value : null;
}

/**
 * Reads a temperature-like measurement, converting it to the requested scale.
 *
 * Dew point is reported in Celsius no matter which units the forecast was
 * requested in, so it cannot simply be passed through the way the period
 * temperature can.
 *
 * @param {?Object} measurement Measurement object from the API.
 * @param {string}  units       `us` for Fahrenheit, `si` for Celsius.
 * @return {?number} Converted value, or null when absent.
 */
function readTemperature( measurement, units ) {
	const value = readValue( measurement );

	if ( value === null ) {
		return null;
	}

	const isCelsius = ( measurement?.unitCode || '' ).includes( 'degC' );
	const wantsCelsius = 'si' === units;

	if ( isCelsius === wantsCelsius ) {
		return value;
	}

	return wantsCelsius ? ( ( value - 32 ) * 5 ) / 9 : ( value * 9 ) / 5 + 32;
}

/**
 * Converts one raw forecast period into the shape the rest of the plugin uses.
 *
 * Both endpoints return periods with the same field names, so one normaliser
 * serves the hourly and the daily forecast alike. Fields the chosen endpoint
 * does not populate come back as null rather than being omitted, so a caller
 * can test for them without guarding against undefined.
 *
 * @param {Object} period Raw period from the API.
 * @param {string} units  `us` for Fahrenheit, `si` for Celsius.
 * @return {Object} Normalised period.
 */
function normalisePeriod( period, units ) {
	return {
		temperature: period.temperature,
		temperatureUnit:
			period.temperatureUnit || ( 'si' === units ? 'C' : 'F' ),
		shortForecast: period.shortForecast || '',
		iconClass: getIconClass( period ),
		isDaytime: !! period.isDaytime,
		periodName: period.name || '',
		startTime: period.startTime || '',
		humidity: readValue( period.relativeHumidity ),
		precipitation: readValue( period.probabilityOfPrecipitation ),
		dewPoint: readTemperature( period.dewpoint, units ),
		windSpeed: period.windSpeed || '',
		windDirection: period.windDirection || '',
	};
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
 * Pairs daytime and nighttime periods into one entry per day.
 *
 * The daily endpoint alternates day and night, but not predictably: a request
 * made in the evening starts with "Tonight" rather than "Today". That first
 * orphaned night becomes a day with a low and no high, which is how the NWS
 * presents it too.
 *
 * @param {Object[]} periods Normalised periods, in order.
 * @param {number}   count   How many days to return.
 * @return {Object[]} One entry per day.
 */
function pairDays( periods, count ) {
	const days = [];
	let index = 0;

	while ( index < periods.length && days.length < count ) {
		const period = periods[ index ];
		const next = periods[ index + 1 ];
		const night =
			period.isDaytime && next && ! next.isDaytime ? next : null;

		days.push( {
			label: period.periodName,
			iconClass: period.iconClass,
			shortForecast: period.shortForecast,
			temperatureUnit: period.temperatureUnit,
			high: period.isDaytime ? period.temperature : null,
			low: period.isDaytime
				? ( night?.temperature ?? null )
				: period.temperature,
			// The likelier of the two halves describes the day as a whole.
			precipitation: Math.max(
				period.precipitation ?? -1,
				night?.precipitation ?? -1
			),
			startTime: period.startTime,
		} );

		index += night ? 2 : 1;
	}

	return days.map( ( day ) => ( {
		...day,
		precipitation: day.precipitation < 0 ? null : day.precipitation,
	} ) );
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
 * @return {Promise<Object>} `{ periods, city, state, timeZone, kind }`.
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
	const lat = normaliseCoordinate( latitude );
	const lon = normaliseCoordinate( longitude );

	if ( lat === null || lon === null ) {
		throw new Error( 'A valid latitude and longitude are required.' );
	}

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
				? normalised.slice( 0, count ).map( ( period ) => ( {
						...period,
						label: period.periodName,
						high: period.temperature,
						low: null,
					} ) )
				: pairDays( normalised, count ),
		city: point.city,
		state: point.state,
		timeZone: point.timeZone,
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
