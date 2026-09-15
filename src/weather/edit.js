/**
 * Editor interface for the Weather block.
 *
 * This file does three things and delegates the rest: it works out which
 * location to preview, fetches that preview through the same module the front
 * end uses, and hands the result to whichever preview component the layout
 * calls for. The panels live in `inspector/`, the previews in `components/`,
 * and what each layout is made of in `layouts/`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { Spinner } from '@wordpress/components';
import { useState, useEffect, useMemo } from '@wordpress/element';

import { getWeather, getForecast } from './lib/nws';
import { element, layoutClass } from './lib/classes';
import { getDefaults } from './lib/defaults';
import { clampPeriodCount, FIELD_ATTRIBUTES, getLayout } from './layouts';

import CurrentPreview from './components/current-preview';
import ForecastPreview from './components/forecast-preview';
import LayoutPanel from './inspector/layout-panel';
import LocationPanel from './inspector/location-panel';
import DisplayPanel from './inspector/display-panel';
import ColorPanel from './inspector/color-panel';

import './editor.scss';

export default function Edit( { attributes, setAttributes } ) {
	const { layout, periodCount, locationSource, units, iconColor, showUnit } =
		attributes;

	const defaults = getDefaults();
	const definition = getLayout( layout );
	const { kind, multiple } = definition;
	const count = clampPeriodCount( layout, periodCount );

	const [ data, setData ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );

	/*
	 * The fields this block renders: those the author switched on, less any the
	 * chosen layout has nowhere to put. `render.php` resolves the same set
	 * server-side, so the preview and the page agree.
	 */
	const shown = useMemo( () => {
		const result = {};

		definition.fields.forEach( ( field ) => {
			result[ field ] = !! attributes[ FIELD_ATTRIBUTES[ field ] ];
		} );

		return result;
	}, [ definition, attributes ] );

	/*
	 * Which coordinates the preview should use. A visitor-located block has no
	 * visitor in the editor, so it previews the site default instead.
	 */
	const preview = useMemo( () => {
		if ( 'custom' === locationSource ) {
			return {
				latitude: attributes.latitude,
				longitude: attributes.longitude,
				label: attributes.locationLabel,
			};
		}

		return {
			latitude: defaults.latitude || '',
			longitude: defaults.longitude || '',
			label: defaults.locationLabel || '',
		};
	}, [
		locationSource,
		attributes.latitude,
		attributes.longitude,
		attributes.locationLabel,
		defaults.latitude,
		defaults.longitude,
		defaults.locationLabel,
	] );

	const resolvedUnits = units || defaults.units || 'us';
	const hasNoLocation = ! preview.latitude || ! preview.longitude;

	useEffect( () => {
		let cancelled = false;

		if ( hasNoLocation ) {
			setData( null );
			setError( '' );
			setIsLoading( false );

			return undefined;
		}

		setIsLoading( true );
		setError( '' );

		const request = {
			latitude: preview.latitude,
			longitude: preview.longitude,
			units: resolvedUnits,
			cacheMinutes: defaults.cacheMinutes ?? 60,
		};

		const promise =
			'current' === kind
				? getWeather( {
						...request,
						forecastType: attributes.forecastType,
					} )
				: getForecast( { ...request, kind, count } );

		promise
			.then( ( result ) => {
				if ( cancelled ) {
					return;
				}

				setData( result );
				setIsLoading( false );
			} )
			.catch( ( requestError ) => {
				if ( cancelled ) {
					return;
				}

				setData( null );
				setError( requestError.message );
				setIsLoading( false );
			} );

		return () => {
			cancelled = true;
		};
	}, [
		hasNoLocation,
		preview.latitude,
		preview.longitude,
		kind,
		count,
		attributes.forecastType,
		resolvedUnits,
		defaults.cacheMinutes,
	] );

	const color = iconColor || defaults.iconColor || '';

	const blockProps = useBlockProps( {
		className: `is-weather-loaded ${ layoutClass( layout ) }`,
		style: color ? { '--wb-icon-color': color } : undefined,
	} );

	const panelProps = { attributes, setAttributes };

	return (
		<>
			<InspectorControls>
				<LayoutPanel { ...panelProps } />
				<LocationPanel
					{ ...panelProps }
					hasNoLocation={ hasNoLocation }
				/>
				<DisplayPanel { ...panelProps } />
				<ColorPanel { ...panelProps } />
			</InspectorControls>

			<div { ...blockProps }>
				{ multiple ? (
					<ForecastPreview
						forecast={ data }
						kind={ kind }
						count={ count }
						shown={ shown }
						showUnit={ showUnit }
					/>
				) : (
					<CurrentPreview
						weather={ data }
						shown={ shown }
						showUnit={ showUnit }
						label={ preview.label }
					/>
				) }
				{ isLoading && <Spinner /> }
				{ ( error || hasNoLocation ) && (
					<span className={ element( 'editor-note' ) }>
						{ hasNoLocation
							? __( 'Set a location', 'simple-weather-block' )
							: error }
					</span>
				) }
			</div>
		</>
	);
}
