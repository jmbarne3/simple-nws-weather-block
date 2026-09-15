/**
 * Formatting helpers shared by the editor preview and the front end.
 *
 * The editor and `view.js` render the same block through completely different
 * machinery -- React in one, DOM patching in the other -- so anything that
 * turns a number into a string lives here rather than in either of them. That
 * is the only way the preview an author sees is reliably the thing a visitor
 * gets.
 */

import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Returns the locale the page is written in.
 *
 * `Intl` is happy with an undefined locale and falls back to the browser's own,
 * which is the right answer when the document does not declare one.
 *
 * @return {string|undefined} A BCP 47 tag, or undefined.
 */
function getLocale() {
	const lang = document?.documentElement?.lang;

	return lang || undefined;
}

/**
 * Formats a temperature for display.
 *
 * @param {?number} value    Temperature.
 * @param {string}  unit     Unit letter, `F` or `C`.
 * @param {boolean} showUnit Whether to append the unit letter.
 * @return {string} Formatted temperature, or an empty string when unavailable.
 */
export function formatTemperature( value, unit, showUnit ) {
	if ( ! Number.isFinite( value ) ) {
		return '';
	}

	const rounded = Math.round( value );

	return showUnit ? `${ rounded }°${ unit }` : `${ rounded }°`;
}

/**
 * Formats a percentage.
 *
 * @param {?number} value Percentage, 0 to 100.
 * @return {string} Formatted percentage, or an empty string when unavailable.
 */
export function formatPercent( value ) {
	if ( ! Number.isFinite( value ) ) {
		return '';
	}

	return sprintf(
		/* translators: %d: a percentage, without the sign. */
		__( '%d%%', 'simple-weather-block' ),
		Math.round( value )
	);
}

/**
 * Formats a wind reading.
 *
 * NWS returns the speed as a ready-made string carrying its own unit -- "5 mph",
 * or "5 to 15 mph" for a daily period -- so only the direction is prepended.
 *
 * @param {string} speed     Wind speed as reported.
 * @param {string} direction Compass direction, e.g. `NE`.
 * @return {string} Formatted wind, or an empty string when unavailable.
 */
export function formatWind( speed, direction ) {
	if ( ! speed ) {
		return '';
	}

	if ( ! direction ) {
		return speed;
	}

	return sprintf(
		/* translators: 1: compass direction, 2: wind speed with its unit. */
		__( '%1$s %2$s', 'simple-weather-block' ),
		direction,
		speed
	);
}

/**
 * Formats the hour a forecast period starts.
 *
 * The timestamp carries the forecast location's own UTC offset, and the zone
 * comes from the point lookup, so the label reads as the hour at the place
 * being forecast rather than the hour wherever the visitor happens to be.
 *
 * @param {string} startTime  ISO 8601 timestamp.
 * @param {string} [timeZone] IANA time zone for the forecast location.
 * @return {string} Formatted hour, or an empty string when unavailable.
 */
export function formatHour( startTime, timeZone ) {
	if ( ! startTime ) {
		return '';
	}

	const date = new Date( startTime );

	if ( Number.isNaN( date.getTime() ) ) {
		return '';
	}

	const options = { hour: 'numeric' };

	try {
		return new Intl.DateTimeFormat( getLocale(), {
			...options,
			timeZone: timeZone || undefined,
		} ).format( date );
	} catch {
		// An unrecognised zone must not cost the visitor the whole block.
		return new Intl.DateTimeFormat( getLocale(), options ).format( date );
	}
}

/**
 * Builds the place name shown and announced for a block.
 *
 * @param {string} label Location label configured for the block, if any.
 * @param {string} city  City from the NWS point lookup.
 * @param {string} state State from the NWS point lookup.
 * @return {string} A place name, or an empty string.
 */
export function formatPlace( label, city, state ) {
	if ( label ) {
		return label;
	}

	return [ city, state ].filter( Boolean ).join( ', ' );
}

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
 * The icon and temperature are hidden from assistive technology, because a
 * glyph and a bare number read poorly on their own. This replaces them with
 * something a person would actually say.
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
