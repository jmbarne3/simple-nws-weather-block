/**
 * Turning forecast values into the text a visitor sees.
 *
 * The editor and `view.js` render the same block through completely different
 * machinery -- React in one, DOM patching in the other -- so anything that
 * turns a number into a string lives here rather than in either of them. That
 * is the only way the preview an author sees is reliably the thing a visitor
 * gets.
 *
 * What a visitor *hears* is a separate problem, and lives in `describe.js`.
 */

import { __, sprintf } from '@wordpress/i18n';

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
		__( '%d%%', 'simple-nws-weather-block' ),
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
		__( '%1$s %2$s', 'simple-nws-weather-block' ),
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
 * A label the author configured always wins, because it is the name they want
 * the place called; the NWS name is only a fallback.
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
