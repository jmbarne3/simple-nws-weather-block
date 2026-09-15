/**
 * Turning forecast values into the text a visitor hears.
 *
 * Everything visible in this block reads badly aloud. An icon is a glyph in a
 * font, a temperature is a bare number, and a forecast strip is a grid of both.
 * So the visible parts are hidden from assistive technology and replaced by the
 * sentences built here -- what a person would actually say if you asked them
 * what the weather was.
 *
 * These deliberately describe the whole forecast period rather than only the
 * fields an author left switched on. Stripping facts out of the spoken version
 * to match a visual toggle would make it worse, not more consistent.
 */

import { __, _n, sprintf } from '@wordpress/i18n';

import { formatHour, formatPlace } from './format';

/**
 * Spells out a temperature the way a person would say it.
 *
 * @param {?number} value Temperature.
 * @param {string}  unit  Unit letter, `F` or `C`.
 * @return {string} e.g. `78 degrees Fahrenheit`.
 */
function speakTemperature( value, unit ) {
	if ( ! Number.isFinite( value ) ) {
		return '';
	}

	const unitName =
		'C' === unit
			? __( 'degrees Celsius', 'simple-weather-block' )
			: __( 'degrees Fahrenheit', 'simple-weather-block' );

	return sprintf(
		/* translators: 1: temperature, 2: unit name. */
		__( '%1$d %2$s', 'simple-weather-block' ),
		Math.round( value ),
		unitName
	);
}

/**
 * Builds the sentence announced for a single set of current conditions.
 *
 * @param {Object} weather Normalised conditions from the API.
 * @param {string} label   Location label configured for the block, if any.
 * @return {string} A human-readable description.
 */
export function describeCurrent( weather, label ) {
	const place = formatPlace( label, weather.city, weather.state );
	const temperature = speakTemperature(
		weather.temperature,
		weather.temperatureUnit
	);
	const conditions = [ weather.shortForecast, temperature ]
		.filter( Boolean )
		.join( ', ' );

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
 * Builds the sentence that introduces a multi-period forecast.
 *
 * Read before the list itself, which is left visible to assistive technology so
 * that it is announced with its length.
 *
 * @param {string} kind  `daily` or `hourly`.
 * @param {number} count How many periods follow.
 * @param {string} place Place name, or an empty string.
 * @return {string} A human-readable heading for the list.
 */
export function describeForecast( kind, count, place ) {
	const summary =
		'hourly' === kind
			? sprintf(
					/* translators: %d: number of hours. */
					_n(
						'%d-hour forecast',
						'%d-hour forecast',
						count,
						'simple-weather-block'
					),
					count
				)
			: sprintf(
					/* translators: %d: number of days. */
					_n(
						'%d-day forecast',
						'%d-day forecast',
						count,
						'simple-weather-block'
					),
					count
				);

	if ( ! place ) {
		return summary;
	}

	return sprintf(
		/* translators: 1: forecast length, e.g. "5-day forecast", 2: place name. */
		__( '%1$s for %2$s', 'simple-weather-block' ),
		summary,
		place
	);
}

/**
 * Builds the sentence announced for one period of a forecast.
 *
 * A daily period usually has both a high and a low; an hourly one, and the
 * orphaned "Tonight" that starts an evening forecast, have a single reading.
 *
 * @param {Object} period Period from `getForecast`.
 * @param {string} kind   `daily` or `hourly`.
 * @param {string} zone   IANA time zone for the forecast location.
 * @return {string} A human-readable description.
 */
export function describePeriod( period, kind, zone ) {
	const label =
		'hourly' === kind ? formatHour( period.startTime, zone ) : period.label;

	const readings = [];

	if ( 'hourly' === kind ) {
		readings.push(
			speakTemperature( period.high, period.temperatureUnit )
		);
	} else {
		if ( Number.isFinite( period.high ) ) {
			readings.push(
				sprintf(
					/* translators: %s: a spoken temperature, e.g. "88 degrees Fahrenheit". */
					__( 'high %s', 'simple-weather-block' ),
					speakTemperature( period.high, period.temperatureUnit )
				)
			);
		}

		if ( Number.isFinite( period.low ) ) {
			readings.push(
				sprintf(
					/* translators: %s: a spoken temperature, e.g. "72 degrees Fahrenheit". */
					__( 'low %s', 'simple-weather-block' ),
					speakTemperature( period.low, period.temperatureUnit )
				)
			);
		}
	}

	if ( Number.isFinite( period.precipitation ) ) {
		readings.push(
			sprintf(
				/* translators: %d: a percentage, without the sign. */
				__(
					'%d percent chance of precipitation',
					'simple-weather-block'
				),
				Math.round( period.precipitation )
			)
		);
	}

	const detail = [ period.shortForecast, ...readings ]
		.filter( Boolean )
		.join( ', ' );

	if ( ! label ) {
		return detail;
	}

	return sprintf(
		/* translators: 1: period name, e.g. "Wednesday" or "10 AM", 2: the forecast for it. */
		__( '%1$s: %2$s', 'simple-weather-block' ),
		label,
		detail
	);
}
