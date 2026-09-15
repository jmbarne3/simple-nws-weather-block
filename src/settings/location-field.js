/**
 * The location search on the settings screen.
 *
 * Renders into the placeholder `render_location_search_field()` prints, and
 * writes whatever is chosen into the coordinate fields WordPress actually
 * saves. Those fields remain the source of truth: this control is a faster way
 * to fill them in, not a replacement for them, so a broken geocoder or a
 * missing script costs an administrator nothing but convenience.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Notice, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';

import LocationSearch from '../weather/components/location-search';
import { getPlace } from '../weather/lib/nws';

/**
 * IDs of the fields the search fills in.
 *
 * @type {Object<string, string>}
 */
const FIELDS = {
	latitude: 'simple_weather_block_latitude',
	longitude: 'simple_weather_block_longitude',
	label: 'simple_weather_block_location_label',
};

/**
 * Writes a value into one of the settings inputs.
 *
 * The events matter: WordPress itself does not listen for them, but anything
 * warning about unsaved changes does, and without them a saved location can
 * look like an unchanged form.
 *
 * @param {string} id    Element id.
 * @param {string} value Value to write.
 * @return {void}
 */
function setField( id, value ) {
	const field = document.getElementById( id );

	if ( ! field ) {
		return;
	}

	field.value = value;
	field.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	field.dispatchEvent( new Event( 'change', { bubbles: true } ) );
}

/**
 * Reads the current value of one of the settings inputs.
 *
 * @param {string} id Element id.
 * @return {string} The value, or an empty string.
 */
function getField( id ) {
	return document.getElementById( id )?.value?.trim() || '';
}

/**
 * Renders the search and the confirmation that follows it.
 *
 * @return {Element} The field.
 */
export default function LocationField() {
	const [ status, setStatus ] = useState( null );

	const choose = ( place ) => {
		setField( FIELDS.latitude, place.latitude );
		setField( FIELDS.longitude, place.longitude );
		setStatus( { state: 'checking', place } );

		/*
		 * Confirming against the National Weather Service is the only check
		 * that means anything. A geocoder will happily return a place the NWS
		 * publishes no forecast for -- a US territory it does not cover, a point
		 * offshore -- and it is far better to say so here than to let someone
		 * save it and wonder why every block on the site is blank.
		 */
		getPlace( { latitude: place.latitude, longitude: place.longitude } )
			.then( ( resolved ) => {
				const name = [ resolved.city, resolved.state ]
					.filter( Boolean )
					.join( ', ' );

				// Only ever fills a blank; never overwrites something written.
				if ( name && ! getField( FIELDS.label ) ) {
					setField( FIELDS.label, name );
				}

				setStatus( { state: 'covered', place, name } );
			} )
			.catch( () => setStatus( { state: 'uncovered', place } ) );
	};

	return (
		<div className="simple-weather-block-location-search">
			<LocationSearch
				label={ __( 'Search for a place', 'simple-weather-block' ) }
				help={ __(
					'A city, a ZIP code or a landmark. Choosing one fills in the coordinates below.',
					'simple-weather-block'
				) }
				onSelect={ choose }
			/>

			{ 'checking' === status?.state && (
				<p className="description">
					<Spinner />
					{ __(
						'Checking National Weather Service coverage…',
						'simple-weather-block'
					) }
				</p>
			) }

			{ 'covered' === status?.state && (
				<Notice status="success" isDismissible={ false }>
					{ sprintf(
						/* translators: 1: place name as the NWS reports it, 2: latitude, 3: longitude. */
						__(
							'Forecasts available for %1$s (%2$s, %3$s).',
							'simple-weather-block'
						),
						status.name || status.place.name,
						status.place.latitude,
						status.place.longitude
					) }
				</Notice>
			) }

			{ 'uncovered' === status?.state && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The National Weather Service publishes no forecast for that location, so blocks using it will not render. It covers the United States and its territories only.',
						'simple-weather-block'
					) }
				</Notice>
			) }
		</div>
	);
}
