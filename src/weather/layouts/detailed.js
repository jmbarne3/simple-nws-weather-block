/**
 * The detailed layout: current conditions beside a list of readings.
 *
 * The extra readings cost no extra request. Humidity, wind, chance of
 * precipitation and dew point all travel in the same hourly period the
 * temperature comes from, and the block simply discarded them until now.
 */

import { __ } from '@wordpress/i18n';

export default {
	name: 'detailed',

	kind: 'current',
	multiple: false,

	fields: [
		'icon',
		'temperature',
		'condition',
		'location',
		'humidity',
		'wind',
		'precipitation',
		'dewPoint',
	],

	label: __( 'Detailed', 'simple-weather-block' ),

	variation: {
		title: __( 'Weather (detailed)', 'simple-weather-block' ),
		description: __(
			'Current conditions beside a list of readings: humidity, wind and chance of precipitation.',
			'simple-weather-block'
		),
		icon: 'info-outline',
		/*
		 * Dew point is the one reading left off: it is the least widely
		 * understood of the four, and an author who wants it can say so.
		 */
		attributes: {
			showCondition: true,
			showLocation: true,
			showHumidity: true,
			showWind: true,
			showPrecipitation: true,
		},
	},
};
