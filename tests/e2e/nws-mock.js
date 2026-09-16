/**
 * A stand-in for the National Weather Service API.
 *
 * The browser tests never contact api.weather.gov. Every request is answered
 * here, which keeps the tests deterministic and keeps CI from adding load to a
 * public government service.
 */

const API = 'https://api.weather.gov';
const GRID = `${ API }/gridpoints/MLB/26,68`;

/**
 * Builds one forecast period.
 *
 * @param {Object} overrides Fields to change.
 * @return {Object} A period shaped like the API's.
 */
function period( overrides = {} ) {
	return {
		number: 1,
		name: '',
		startTime: new Date().toISOString(),
		isDaytime: true,
		temperature: 78,
		temperatureUnit: 'F',
		probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 20 },
		dewpoint: { unitCode: 'wmoUnit:degC', value: 21 },
		relativeHumidity: { unitCode: 'wmoUnit:percent', value: 70 },
		windSpeed: '10 mph',
		windDirection: 'E',
		icon: `${ API }/icons/land/day/sct?size=small`,
		shortForecast: 'Partly Sunny',
		...overrides,
	};
}

/**
 * Seven days of alternating day and night periods.
 *
 * @return {Object[]} Periods.
 */
function dailyPeriods() {
	const names = [
		'Today',
		'Tonight',
		'Friday',
		'Friday Night',
		'Saturday',
		'Saturday Night',
		'Sunday',
		'Sunday Night',
		'Monday',
		'Monday Night',
		'Tuesday',
		'Tuesday Night',
		'Wednesday',
		'Wednesday Night',
	];

	return names.map( ( name, index ) =>
		period( {
			number: index + 1,
			name,
			isDaytime: 0 === index % 2,
			temperature: 0 === index % 2 ? 85 : 68,
		} )
	);
}

/**
 * Twelve hourly periods.
 *
 * @return {Object[]} Periods.
 */
function hourlyPeriods() {
	return Array.from( { length: 12 }, ( _, index ) =>
		period( {
			number: index + 1,
			startTime: new Date( Date.now() + index * 3600000 ).toISOString(),
			temperature: 78 - index,
		} )
	);
}

/**
 * Answers NWS requests for the lifetime of a browser context.
 *
 * @param {import('@playwright/test').BrowserContext} context                 Browser context.
 * @param {Object}                                    [options]               Options.
 * @param {boolean}                                   [options.outOfCoverage] Answer the point lookup as the API
 *                                                                            does for a place outside the US.
 * @return {Promise<string[]>} URLs requested, filled in as the page runs.
 */
async function mockNws( context, { outOfCoverage = false } = {} ) {
	const requested = [];
	const json = ( route, status, body ) =>
		route.fulfill( {
			status,
			contentType: 'application/geo+json',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: JSON.stringify( body ),
		} );

	await context.route( `${ API }/**`, ( route ) => {
		const url = new URL( route.request().url() );

		requested.push( url.href );

		if ( url.pathname.startsWith( '/points/' ) ) {
			if ( outOfCoverage ) {
				return json( route, 404, {
					title: 'Data Unavailable For Requested Point',
					status: 404,
				} );
			}

			return json( route, 200, {
				properties: {
					forecast: `${ GRID }/forecast`,
					forecastHourly: `${ GRID }/forecast/hourly`,
					timeZone: 'America/New_York',
					relativeLocation: {
						properties: { city: 'Oviedo', state: 'FL' },
					},
				},
			} );
		}

		if ( url.pathname.endsWith( '/forecast/hourly' ) ) {
			return json( route, 200, {
				properties: { periods: hourlyPeriods() },
			} );
		}

		if ( url.pathname.endsWith( '/forecast' ) ) {
			return json( route, 200, {
				properties: { periods: dailyPeriods() },
			} );
		}

		return route.fulfill( { status: 404, body: '' } );
	} );

	return requested;
}

/**
 * Coordinates inside NWS coverage.
 */
const ORLANDO = {
	locationSource: 'custom',
	latitude: '28.6024',
	longitude: '-81.2001',
	locationLabel: 'Orlando',
};

module.exports = { mockNws, ORLANDO };
