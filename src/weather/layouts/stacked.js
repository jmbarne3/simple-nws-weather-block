/**
 * The stacked layout: the same reading as a centred column.
 *
 * Shows what the inline layout shows, arranged for a sidebar or the inside of a
 * card, which is why the conditions and the place name are on by default here
 * and off there.
 */

import { __ } from '@wordpress/i18n';

export default {
	name: 'stacked',

	kind: 'current',
	multiple: false,

	fields: [ 'icon', 'temperature', 'condition', 'location' ],

	label: __( 'Stacked', 'simple-nws-weather-block' ),

	variation: {
		title: __( 'Weather (stacked)', 'simple-nws-weather-block' ),
		description: __(
			'Icon, temperature, conditions and place in a column, for a sidebar or a card.',
			'simple-nws-weather-block'
		),
		icon: 'align-center',
		attributes: {
			showCondition: true,
			showLocation: true,
		},
	},
};
