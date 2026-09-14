/**
 * Editor interface for the Weather block.
 *
 * The preview fetches live data through the same module the front end uses, so
 * what an author sees in the editor is the icon and temperature a visitor will
 * get, not an approximation.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	PanelColorSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Notice,
	Spinner,
	ExternalLink,
} from '@wordpress/components';
import { useState, useEffect, useMemo } from '@wordpress/element';

import { getWeather } from './lib/nws';
import { FALLBACK_ICON } from './lib/icons';
import './editor.scss';

/**
 * Site-wide defaults, printed by the plugin before this script runs.
 *
 * @return {Object} Default settings, or an empty-ish object if unavailable.
 */
function getDefaults() {
	return window.weatherBlockDefaults || {};
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		locationSource,
		latitude,
		longitude,
		locationLabel,
		forecastType,
		units,
		iconColor,
		showIcon,
		showTemperature,
		showUnit,
	} = attributes;

	const defaults = getDefaults();
	const [ weather, setWeather ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );

	/*
	 * Which coordinates the preview should use. A visitor-located block has no
	 * visitor in the editor, so it previews the site default instead.
	 */
	const preview = useMemo( () => {
		if ( 'custom' === locationSource ) {
			return {
				latitude,
				longitude,
				label: locationLabel,
			};
		}

		return {
			latitude: defaults.latitude || '',
			longitude: defaults.longitude || '',
			label: defaults.locationLabel || '',
		};
	}, [
		locationSource,
		latitude,
		longitude,
		locationLabel,
		defaults.latitude,
		defaults.longitude,
		defaults.locationLabel,
	] );

	const resolvedUnits = units || defaults.units || 'us';

	useEffect( () => {
		let cancelled = false;

		if ( ! preview.latitude || ! preview.longitude ) {
			setWeather( null );
			setError( '' );
			setIsLoading( false );

			return undefined;
		}

		setIsLoading( true );
		setError( '' );

		getWeather( {
			latitude: preview.latitude,
			longitude: preview.longitude,
			forecastType,
			units: resolvedUnits,
			cacheMinutes: defaults.cacheMinutes ?? 60,
		} )
			.then( ( result ) => {
				if ( cancelled ) {
					return;
				}

				setWeather( result );
				setIsLoading( false );
			} )
			.catch( ( requestError ) => {
				if ( cancelled ) {
					return;
				}

				setWeather( null );
				setError( requestError.message );
				setIsLoading( false );
			} );

		return () => {
			cancelled = true;
		};
	}, [
		preview.latitude,
		preview.longitude,
		forecastType,
		resolvedUnits,
		defaults.cacheMinutes,
	] );

	const color = iconColor || defaults.iconColor || '';

	const blockProps = useBlockProps( {
		className: 'is-weather-loaded',
		style: color ? { '--wb-icon-color': color } : undefined,
	} );

	const temperatureText = weather
		? `${ Math.round( weather.temperature ) }°${
				showUnit ? weather.temperatureUnit : ''
			}`
		: '—';

	const iconClass = weather ? weather.iconClass : FALLBACK_ICON;

	const hasNoLocation = ! preview.latitude || ! preview.longitude;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Location', 'weather-block' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Location source', 'weather-block' ) }
						value={ locationSource }
						options={ [
							{
								label: __( 'Site default', 'weather-block' ),
								value: 'site',
							},
							{
								label: __(
									'Specific location',
									'weather-block'
								),
								value: 'custom',
							},
							{
								label: __(
									"Visitor's location",
									'weather-block'
								),
								value: 'visitor',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { locationSource: value } )
						}
						help={
							'visitor' === locationSource
								? __(
										'The browser asks for permission on page load and falls back to the site default if it is refused. The editor preview shows the site default.',
										'weather-block'
									)
								: undefined
						}
					/>

					{ 'custom' === locationSource && (
						<>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __( 'Latitude', 'weather-block' ) }
								type="number"
								step="0.0001"
								min={ -90 }
								max={ 90 }
								value={ latitude }
								onChange={ ( value ) =>
									setAttributes( { latitude: value } )
								}
							/>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __( 'Longitude', 'weather-block' ) }
								type="number"
								step="0.0001"
								min={ -180 }
								max={ 180 }
								value={ longitude }
								onChange={ ( value ) =>
									setAttributes( { longitude: value } )
								}
							/>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Location label',
									'weather-block'
								) }
								help={ __(
									'Announced to screen readers. Optional.',
									'weather-block'
								) }
								value={ locationLabel }
								onChange={ ( value ) =>
									setAttributes( { locationLabel: value } )
								}
							/>
						</>
					) }

					{ 'site' === locationSource && hasNoLocation && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'No default location has been set yet.',
								'weather-block'
							) }{ ' ' }
							<ExternalLink
								href={ `${ window.location.origin }/wp-admin/options-general.php?page=weather-block` }
							>
								{ __(
									'Weather Block settings',
									'weather-block'
								) }
							</ExternalLink>
						</Notice>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Display', 'weather-block' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Conditions', 'weather-block' ) }
						value={ forecastType }
						options={ [
							{
								label: __( 'Right now', 'weather-block' ),
								value: 'current',
							},
							{
								label: __(
									"Today's forecast",
									'weather-block'
								),
								value: 'today',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { forecastType: value } )
						}
					/>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Units', 'weather-block' ) }
						value={ units }
						options={ [
							{
								label: sprintf(
									/* translators: %s: the unit configured in the site settings. */
									__( 'Site default (%s)', 'weather-block' ),
									'si' === defaults.units
										? __( 'Celsius', 'weather-block' )
										: __( 'Fahrenheit', 'weather-block' )
								),
								value: '',
							},
							{
								label: __( 'Fahrenheit', 'weather-block' ),
								value: 'us',
							},
							{
								label: __( 'Celsius', 'weather-block' ),
								value: 'si',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { units: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show icon', 'weather-block' ) }
						checked={ showIcon }
						onChange={ ( value ) =>
							setAttributes( { showIcon: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show temperature', 'weather-block' ) }
						checked={ showTemperature }
						onChange={ ( value ) =>
							setAttributes( { showTemperature: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show unit letter', 'weather-block' ) }
						help={ __(
							'Display 72°F rather than 72°.',
							'weather-block'
						) }
						checked={ showUnit }
						onChange={ ( value ) =>
							setAttributes( { showUnit: value } )
						}
					/>
				</PanelBody>

				<PanelColorSettings
					title={ __( 'Icon color', 'weather-block' ) }
					colorSettings={ [
						{
							value: iconColor,
							label: __( 'Icon', 'weather-block' ),
							onChange: ( value ) =>
								setAttributes( { iconColor: value || '' } ),
						},
					] }
				>
					<p className="components-base-control__help">
						{ __(
							'Leave unset to use the color from the Weather Block settings, or the surrounding text color.',
							'weather-block'
						) }
					</p>
				</PanelColorSettings>
			</InspectorControls>

			<div { ...blockProps }>
				{ showIcon && (
					<span
						className={ `wp-block-weather-block-weather__icon wi ${ iconClass }` }
						aria-hidden="true"
					/>
				) }
				{ showTemperature && (
					<span className="wp-block-weather-block-weather__temperature">
						{ temperatureText }
					</span>
				) }
				{ isLoading && <Spinner /> }
				{ ( error || hasNoLocation ) && (
					<span className="wp-block-weather-block-weather__editor-note">
						{ hasNoLocation
							? __( 'Set a location', 'weather-block' )
							: error }
					</span>
				) }
			</div>
		</>
	);
}
