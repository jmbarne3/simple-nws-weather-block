/**
 * The hourly layout: the next few hours across the page.
 *
 * The hourly endpoint returns more than a hundred and fifty periods, so the
 * ceiling of twelve is a judgement about what belongs on a page rather than a
 * limit of the data.
 */

import { __ } from '@wordpress/i18n';

export default {
	name: 'hourly',

	// Reads a run of periods from the hourly endpoint.
	kind: 'hourly',
	multiple: true,

	fields: [ 'icon', 'temperature', 'condition', 'precipitation' ],

	periodRange: { min: 2, max: 12, fallback: 6 },

	label: __( 'Hourly forecast', 'simple-nws-weather-block' ),

	variation: {
		title: __( 'Hourly forecast', 'simple-nws-weather-block' ),
		description: __(
			'The next few hours across the page, each with an icon and a temperature.',
			'simple-nws-weather-block'
		),
		icon: 'clock',
		attributes: {
			periodCount: 6,
		},
	},
};
