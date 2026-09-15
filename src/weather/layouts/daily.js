/**
 * The daily layout: several days across the page.
 *
 * The National Weather Service publishes seven days as fourteen alternating
 * day and night periods, which `getForecast` pairs back into one entry each
 * with a high and a low. Seven is therefore a limit of the data, not a choice.
 */

import { __ } from '@wordpress/i18n';

export default {
	name: 'daily',

	// Reads a run of periods from the daily endpoint.
	kind: 'daily',
	multiple: true,

	fields: [ 'icon', 'temperature', 'condition', 'precipitation' ],

	periodRange: { min: 2, max: 7, fallback: 5 },

	label: __( 'Daily forecast', 'simple-weather-block' ),

	variation: {
		title: __( 'Daily forecast', 'simple-weather-block' ),
		description: __(
			'Several days across the page, each with a high, a low and a chance of precipitation.',
			'simple-weather-block'
		),
		icon: 'calendar-alt',
		/*
		 * Conditions text stays off: a short forecast runs to phrases like
		 * "Chance Showers And Thunderstorms", which does not fit a column.
		 */
		attributes: {
			periodCount: 5,
			showPrecipitation: true,
		},
	},
};
