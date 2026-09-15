/**
 * A search box that turns a place name into coordinates.
 *
 * Shared by the settings screen and the block inspector, because entering a
 * location is the same job in both and an author should not meet two different
 * controls for it.
 *
 * The component reports a chosen place and nothing else. What to do with it --
 * write it into two option fields, or set two block attributes -- is the
 * caller's business.
 */

import { __ } from '@wordpress/i18n';
import { ComboboxControl, Notice } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';

import { searchPlaces, placeKey, placeLabel } from '../lib/places';

/**
 * How long to wait after a keystroke before searching, in milliseconds.
 *
 * Long enough that typing "Orlando" is one request rather than seven, short
 * enough that the list does not feel late.
 *
 * @type {number}
 */
const DEBOUNCE = 350;

/**
 * Renders the search box.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.label    Label for the control.
 * @param {string}   [props.help]   Help text shown beneath it.
 * @param {Function} props.onSelect Called with the chosen place.
 * @return {Element} The control.
 */
export default function LocationSearch( { label, help, onSelect } ) {
	const [ options, setOptions ] = useState( [] );
	const [ error, setError ] = useState( '' );

	// Results are kept out of state: only the chosen one is ever read back.
	const results = useRef( [] );
	const timer = useRef();

	/*
	 * Results can arrive out of order, and a slow request for "Or" must not
	 * overwrite a fast one for "Orlando". Only the newest request may write.
	 */
	const latest = useRef( 0 );

	useEffect( () => () => window.clearTimeout( timer.current ), [] );

	const search = ( value ) => {
		window.clearTimeout( timer.current );

		const query = ( value || '' ).trim();

		if ( query.length < 2 ) {
			results.current = [];
			setOptions( [] );
			setError( '' );

			return;
		}

		timer.current = window.setTimeout( () => {
			const request = ++latest.current;

			searchPlaces( query )
				.then( ( places ) => {
					if ( request !== latest.current ) {
						return;
					}

					results.current = places;
					setError( '' );
					setOptions(
						places.map( ( place ) => ( {
							value: placeKey( place ),
							label: placeLabel( place ),
						} ) )
					);
				} )
				.catch( ( requestError ) => {
					if ( request !== latest.current ) {
						return;
					}

					results.current = [];
					setOptions( [] );
					setError(
						requestError.message ||
							__(
								'The location search is unavailable.',
								'simple-weather-block'
							)
					);
				} );
		}, DEBOUNCE );
	};

	return (
		<>
			<ComboboxControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ label }
				help={ help }
				value={ null }
				options={ options }
				onFilterValueChange={ search }
				onChange={ ( value ) => {
					const picked = results.current.find(
						( place ) => placeKey( place ) === value
					);

					if ( picked ) {
						onSelect( picked );
					}
				} }
			/>
			{ !! error && (
				<Notice status="warning" isDismissible={ false }>
					{ error }
				</Notice>
			) }
		</>
	);
}
