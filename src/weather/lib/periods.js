/**
 * Turning National Weather Service periods into the shape the block uses.
 *
 * Both forecast endpoints return periods under the same field names, so one
 * normaliser serves the hourly and the daily forecast alike. Fields the chosen
 * endpoint does not populate come back as null rather than being omitted, so a
 * caller can test for them without guarding against undefined.
 */

import { getIconClass } from './icons';

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
 * @param {Object} period Raw period from the API.
 * @param {string} units  `us` for Fahrenheit, `si` for Celsius.
 * @return {Object} Normalised period.
 */
export function normalisePeriod( period, units ) {
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
 * Presents hourly periods as forecast columns.
 *
 * An hour has a single reading rather than a high and a low, but the two
 * forecast layouts share one renderer, so it is given the same field names with
 * nothing in the low.
 *
 * @param {Object[]} periods Normalised periods, in order.
 * @param {number}   count   How many hours to return.
 * @return {Object[]} One entry per hour.
 */
export function takeHours( periods, count ) {
	return periods.slice( 0, count ).map( ( period ) => ( {
		...period,
		label: period.periodName,
		high: period.temperature,
		low: null,
	} ) );
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
export function pairDays( periods, count ) {
	const days = [];
	let index = 0;

	while ( index < periods.length && days.length < count ) {
		const period = periods[ index ];
		const next = periods[ index + 1 ];
		const night =
			period.isDaytime && next && ! next.isDaytime ? next : null;

		days.push( {
			...period,
			label: period.periodName,
			high: period.isDaytime ? period.temperature : null,
			low: period.isDaytime
				? ( night?.temperature ?? null )
				: period.temperature,
			// The likelier of the two halves describes the day as a whole.
			precipitation: Math.max(
				period.precipitation ?? -1,
				night?.precipitation ?? -1
			),
		} );

		index += night ? 2 : 1;
	}

	return days.map( ( day ) => ( {
		...day,
		precipitation: day.precipitation < 0 ? null : day.precipitation,
	} ) );
}
