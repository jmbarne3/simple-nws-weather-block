/**
 * The inline layout: an icon and a temperature on one line.
 *
 * This is what the block shipped as, and it stays the default so that a block
 * saved before layouts existed renders exactly as it did before.
 */

import { __ } from '@wordpress/i18n';

export default {
	name: 'inline',

	// Reads a single forecast period rather than a run of them.
	kind: 'current',
	multiple: false,

	fields: [ 'icon', 'temperature', 'condition', 'location' ],

	label: __( 'Inline', 'simple-weather-block' ),

	variation: {
		title: __( 'Weather', 'simple-weather-block' ),
		description: __(
			'An icon and a temperature on one line, sized to sit in a header or a sentence.',
			'simple-weather-block'
		),
		icon: 'editor-alignleft',
		isDefault: true,
		attributes: {},
	},
};
