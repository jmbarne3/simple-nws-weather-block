/**
 * The fields a layout can be made of.
 *
 * A field is one thing a block can show -- a temperature, a wind reading -- and
 * is backed by a single boolean attribute. Layouts declare which fields they
 * can render; this file says what each field is called and where its value
 * comes from.
 */

import { __ } from '@wordpress/i18n';

/**
 * Attribute backing each field.
 *
 * @type {Object<string, string>}
 */
export const FIELD_ATTRIBUTES = {
	icon: 'showIcon',
	temperature: 'showTemperature',
	condition: 'showCondition',
	location: 'showLocation',
	humidity: 'showHumidity',
	wind: 'showWind',
	precipitation: 'showPrecipitation',
	dewPoint: 'showDewPoint',
};

/**
 * Fields rendered as a labelled reading rather than as their own element.
 *
 * @type {string[]}
 */
export const METRIC_FIELDS = [
	'humidity',
	'wind',
	'precipitation',
	'dewPoint',
];

/**
 * Label shown beside each field's toggle in the inspector.
 *
 * Built on demand rather than held in a constant, because a translation is not
 * necessarily loaded at the moment this module first evaluates.
 *
 * @return {Object<string, string>} Field name to label.
 */
export function getFieldLabels() {
	return {
		icon: __( 'Icon', 'simple-weather-block' ),
		temperature: __( 'Temperature', 'simple-weather-block' ),
		condition: __( 'Conditions text', 'simple-weather-block' ),
		location: __( 'Location name', 'simple-weather-block' ),
		humidity: __( 'Humidity', 'simple-weather-block' ),
		wind: __( 'Wind', 'simple-weather-block' ),
		precipitation: __( 'Chance of precipitation', 'simple-weather-block' ),
		dewPoint: __( 'Dew point', 'simple-weather-block' ),
	};
}

/**
 * Label printed beside each reading in the detailed layout.
 *
 * Mirrors the labels `partials/current.php` prints, so the editor preview and
 * the front end read the same.
 *
 * @return {Object<string, string>} Field name to label.
 */
export function getMetricLabels() {
	return {
		humidity: __( 'Humidity', 'simple-weather-block' ),
		wind: __( 'Wind', 'simple-weather-block' ),
		precipitation: __( 'Chance of precipitation', 'simple-weather-block' ),
		dewPoint: __( 'Dew point', 'simple-weather-block' ),
	};
}
