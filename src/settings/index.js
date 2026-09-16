/**
 * Entry point for the Settings → Simple NWS Weather Block screen.
 *
 * The screen is rendered by PHP through the Settings API. This adds one control
 * to it rather than taking it over, so everything else on the page -- and the
 * saving of it -- works exactly as it did before.
 */

import { createRoot } from '@wordpress/element';

import LocationField from './location-field';

/**
 * Element `render_location_search_field()` prints for this script to fill.
 *
 * @type {string}
 */
const MOUNT_ID = 'simple-nws-weather-block-location-search';

/**
 * Renders the location search, if this screen has somewhere to put it.
 *
 * @return {void}
 */
function mount() {
	const node = document.getElementById( MOUNT_ID );

	if ( node ) {
		createRoot( node ).render( <LocationField /> );
	}
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', mount );
} else {
	mount();
}
