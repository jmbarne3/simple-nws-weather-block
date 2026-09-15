/**
 * Editor interface for the Weather block.
 *
 * The preview fetches live data through the same module the front end uses and
 * formats it through the same helpers, so what an author sees in the editor is
 * the block a visitor will get rather than an approximation of it.
 *
 * The inspector is assembled from the chosen layout's field list rather than
 * from a fixed set of toggles. A control only appears when the layout it
 * belongs to has somewhere to put the thing it switches on.
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
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
	Notice,
	Spinner,
	ExternalLink,
} from '@wordpress/components';
import { useState, useEffect, useMemo } from '@wordpress/element';

import { getWeather, getForecast } from './lib/nws';
import { FALLBACK_ICON } from './lib/icons';
import {
	clampPeriodCount,
	FIELD_ATTRIBUTES,
	getLayout,
	PERIOD_RANGE,
	supportsField,
} from './lib/layouts';
import {
	formatHour,
	formatPercent,
	formatPlace,
	formatTemperature,
	formatWind,
} from './lib/format';
import './editor.scss';

/**
 * Prefix shared by every class inside the block.
 *
 * The editor prints the same class names the front end does, so one stylesheet
 * covers both and a theme's overrides show up in the editor too.
 *
 * @type {string}
 */
const BASE = 'wp-block-simple-weather-block-weather';

/**
 * Human-readable name for each layout, in inserter order.
 *
 * @return {Object[]} Options for the layout select.
 */
function getLayoutOptions() {
	return [
		{ value: 'inline', label: __( 'Inline', 'simple-weather-block' ) },
		{ value: 'stacked', label: __( 'Stacked', 'simple-weather-block' ) },
		{ value: 'detailed', label: __( 'Detailed', 'simple-weather-block' ) },
		{
			value: 'daily',
			label: __( 'Daily forecast', 'simple-weather-block' ),
		},
		{
			value: 'hourly',
			label: __( 'Hourly forecast', 'simple-weather-block' ),
		},
	];
}

/**
 * Label shown beside each field toggle.
 *
 * @return {Object<string, string>} Field name to label.
 */
function getFieldLabels() {
	return {
		icon: __( 'Icon', 'simple-weather-block' ),
		temperature: __( 'Temperature', 'simple-weather-block' ),
		condition: __( 'Conditions text', 'simple-weather-block' ),
		location: __( 'Location name', 'simple-weather-block' ),
		humidity: __( 'Humidity', 'simple-weather-block' ),
		wind: __( 'Wind', 'simple-weather-block' ),
		precipitation: __( 'Chance of precipitation', 'simple-weather-block' ),
		dewPoint: __( 'Dew point', 'simple-weather-block' ),
	};
}

/**
 * Label printed beside each reading in the detailed layout.
 *
 * Mirrors the labels `render.php` prints, so the preview and the front end read
 * the same.
 *
 * @return {Object<string, string>} Field name to label.
 */
function getMetricLabels() {
	return {
		humidity: __( 'Humidity', 'simple-weather-block' ),
		wind: __( 'Wind', 'simple-weather-block' ),
		precipitation: __( 'Chance of precipitation', 'simple-weather-block' ),
		dewPoint: __( 'Dew point', 'simple-weather-block' ),
	};
}

/**
 * Site-wide defaults, printed by the plugin before this script runs.
 *
 * @return {Object} Default settings, or an empty-ish object if unavailable.
 */
function getDefaults() {
	return window.simpleWeatherBlockDefaults || {};
}

/**
 * Renders the preview for a single set of conditions.
 *
 * @param {Object}  props          Component props.
 * @param {?Object} props.weather  Conditions, or null while loading.
 * @param {Object}  props.shown    Which fields are switched on.
 * @param {boolean} props.showUnit Whether to append the unit letter.
 * @param {string}  props.label    Location label configured for the block.
 * @return {Element} The preview.
 */
function CurrentPreview( { weather, shown, showUnit, label } ) {
	const metricLabels = getMetricLabels();
	const metrics = weather
		? {
				humidity: formatPercent( weather.humidity ),
				wind: formatWind( weather.windSpeed, weather.windDirection ),
				precipitation: formatPercent( weather.precipitation ),
				dewPoint: formatTemperature(
					weather.dewPoint,
					weather.temperatureUnit,
					showUnit
				),
			}
		: {};

	const visibleMetrics = Object.keys( metricLabels ).filter(
		( field ) => shown[ field ]
	);

	return (
		<>
			{ ( shown.icon || shown.temperature ) && (
				<span className={ `${ BASE }__reading` }>
					{ shown.icon && (
						<span
							className={ `${ BASE }__icon wi ${
								weather ? weather.iconClass : FALLBACK_ICON
							}` }
						/>
					) }
					{ shown.temperature && (
						<span className={ `${ BASE }__temperature` }>
							{ weather
								? formatTemperature(
										weather.temperature,
										weather.temperatureUnit,
										showUnit
									)
								: '—' }
						</span>
					) }
				</span>
			) }
			{ ( shown.condition ||
				shown.location ||
				!! visibleMetrics.length ) && (
				<span className={ `${ BASE }__details` }>
					{ shown.condition && (
						<span className={ `${ BASE }__condition` }>
							{ weather ? weather.shortForecast : '' }
						</span>
					) }
					{ shown.location && (
						<span className={ `${ BASE }__location` }>
							{ weather
								? formatPlace(
										label,
										weather.city,
										weather.state
									)
								: label }
						</span>
					) }
					{ !! visibleMetrics.length && (
						<span className={ `${ BASE }__metrics` }>
							{ visibleMetrics.map( ( field ) => (
								<span
									key={ field }
									className={ `${ BASE }__metric` }
								>
									<span
										className={ `${ BASE }__metric-label` }
									>
										{ metricLabels[ field ] }
									</span>
									<span
										className={ `${ BASE }__metric-value` }
									>
										{ metrics[ field ] || '—' }
									</span>
								</span>
							) ) }
						</span>
					) }
				</span>
			) }
		</>
	);
}

/**
 * Labels one column of a forecast strip.
 *
 * A daily period arrives already named -- "Today", "Wednesday" -- while an
 * hourly one carries only a timestamp and has to be formatted in the forecast
 * location's own time zone.
 *
 * @param {?Object} period     Period from `getForecast`, or undefined.
 * @param {string}  kind       `daily` or `hourly`.
 * @param {string}  [timeZone] IANA time zone for the forecast location.
 * @return {string} The column label, or an empty string while loading.
 */
function periodLabel( period, kind, timeZone ) {
	if ( ! period ) {
		return '';
	}

	return 'hourly' === kind
		? formatHour( period.startTime, timeZone )
		: period.label;
}

/**
 * Renders the preview for a run of forecast periods.
 *
 * Columns are drawn from the requested count rather than from the data, so the
 * preview keeps its shape while the forecast is still loading.
 *
 * @param {Object}  props          Component props.
 * @param {?Object} props.forecast Forecast, or null while loading.
 * @param {string}  props.kind     `daily` or `hourly`.
 * @param {number}  props.count    How many columns to draw.
 * @param {Object}  props.shown    Which fields are switched on.
 * @param {boolean} props.showUnit Whether to append the unit letter.
 * @return {Element} The preview.
 */
function ForecastPreview( { forecast, kind, count, shown, showUnit } ) {
	const periods = forecast?.periods || [];
	const columns = Array.from( { length: count }, ( _, index ) => index );

	return (
		<ul className={ `${ BASE }__periods` }>
			{ columns.map( ( index ) => {
				const period = periods[ index ];
				const precipitation = period
					? formatPercent( period.precipitation )
					: '';

				return (
					<li key={ index } className={ `${ BASE }__period` }>
						<span className={ `${ BASE }__period-name` }>
							{ periodLabel( period, kind, forecast?.timeZone ) }
						</span>
						{ shown.icon && (
							<span
								className={ `${ BASE }__icon wi ${
									period ? period.iconClass : FALLBACK_ICON
								}` }
							/>
						) }
						{ shown.temperature && (
							<span className={ `${ BASE }__temperatures` }>
								<span className={ `${ BASE }__temperature` }>
									{ period
										? formatTemperature(
												period.high,
												period.temperatureUnit,
												showUnit
											)
										: '—' }
								</span>
								{ 'daily' === kind && (
									<span
										className={ `${ BASE }__temperature-low` }
									>
										{ period
											? formatTemperature(
													period.low,
													period.temperatureUnit,
													showUnit
												)
											: '' }
									</span>
								) }
							</span>
						) }
						{ shown.condition && (
							<span className={ `${ BASE }__condition` }>
								{ period ? period.shortForecast : '' }
							</span>
						) }
						{ shown.precipitation && !! precipitation && (
							<span className={ `${ BASE }__precipitation` }>
								<i className="wi wi-raindrop" />
								<span
									className={ `${ BASE }__precipitation-value` }
								>
									{ precipitation }
								</span>
							</span>
						) }
					</li>
				);
			} ) }
		</ul>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		layout,
		periodCount,
		locationSource,
		latitude,
		longitude,
		locationLabel,
		forecastType,
		units,
		iconColor,
		showUnit,
	} = attributes;

	const defaults = getDefaults();
	const definition = getLayout( layout );
	const isMultiple = definition.multiple;
	const count = clampPeriodCount( layout, periodCount );

	const [ data, setData ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );

	/*
	 * Which fields this block renders: those the author switched on, less any
	 * the chosen layout has nowhere to put. `render.php` resolves the same set
	 * server-side, so the preview and the page agree.
	 */
	const shown = useMemo( () => {
		const result = {};

		Object.keys( FIELD_ATTRIBUTES ).forEach( ( field ) => {
			result[ field ] =
				supportsField( layout, field ) &&
				!! attributes[ FIELD_ATTRIBUTES[ field ] ];
		} );

		return result;
	}, [ layout, attributes ] );

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
	const kind = definition.kind;

	useEffect( () => {
		let cancelled = false;

		if ( ! preview.latitude || ! preview.longitude ) {
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
				? getWeather( { ...request, forecastType } )
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
		preview.latitude,
		preview.longitude,
		kind,
		count,
		forecastType,
		resolvedUnits,
		defaults.cacheMinutes,
	] );

	const color = iconColor || defaults.iconColor || '';

	const blockProps = useBlockProps( {
		className: `is-weather-loaded is-weather-${ layout }`,
		style: color ? { '--wb-icon-color': color } : undefined,
	} );

	const hasNoLocation = ! preview.latitude || ! preview.longitude;
	const fieldLabels = getFieldLabels();
	const range = PERIOD_RANGE[ kind ];

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'simple-weather-block' ) }>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Layout', 'simple-weather-block' ) }
						value={ layout }
						options={ getLayoutOptions() }
						onChange={ ( value ) =>
							setAttributes( {
								layout: value,
								// The ranges differ, so a switch can leave the
								// count out of bounds for the new layout.
								periodCount: clampPeriodCount(
									value,
									periodCount
								),
							} )
						}
					/>

					{ isMultiple && !! range && (
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={
								'hourly' === kind
									? __(
											'Hours shown',
											'simple-weather-block'
										)
									: __( 'Days shown', 'simple-weather-block' )
							}
							value={ count }
							min={ range.min }
							max={ range.max }
							onChange={ ( value ) =>
								setAttributes( { periodCount: value } )
							}
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Location', 'simple-weather-block' ) }
					initialOpen={ false }
				>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __(
							'Location source',
							'simple-weather-block'
						) }
						value={ locationSource }
						options={ [
							{
								label: __(
									'Site default',
									'simple-weather-block'
								),
								value: 'site',
							},
							{
								label: __(
									'Specific location',
									'simple-weather-block'
								),
								value: 'custom',
							},
							{
								label: __(
									"Visitor's location",
									'simple-weather-block'
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
										'simple-weather-block'
									)
								: undefined
						}
					/>

					{ 'custom' === locationSource && (
						<>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Latitude',
									'simple-weather-block'
								) }
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
								label={ __(
									'Longitude',
									'simple-weather-block'
								) }
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
									'simple-weather-block'
								) }
								help={ __(
									'Used in place of the name the National Weather Service reports, and announced to screen readers. Optional.',
									'simple-weather-block'
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
								'simple-weather-block'
							) }{ ' ' }
							<ExternalLink
								href={ `${ window.location.origin }/wp-admin/options-general.php?page=simple-weather-block` }
							>
								{ __(
									'Simple Weather Block settings',
									'simple-weather-block'
								) }
							</ExternalLink>
						</Notice>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Display', 'simple-weather-block' ) }>
					{ 'current' === kind && (
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Conditions', 'simple-weather-block' ) }
							value={ forecastType }
							options={ [
								{
									label: __(
										'Right now',
										'simple-weather-block'
									),
									value: 'current',
								},
								{
									label: __(
										"Today's forecast",
										'simple-weather-block'
									),
									value: 'today',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { forecastType: value } )
							}
						/>
					) }
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Units', 'simple-weather-block' ) }
						value={ units }
						options={ [
							{
								label: sprintf(
									/* translators: %s: the unit configured in the site settings. */
									__(
										'Site default (%s)',
										'simple-weather-block'
									),
									'si' === defaults.units
										? __(
												'Celsius',
												'simple-weather-block'
											)
										: __(
												'Fahrenheit',
												'simple-weather-block'
											)
								),
								value: '',
							},
							{
								label: __(
									'Fahrenheit',
									'simple-weather-block'
								),
								value: 'us',
							},
							{
								label: __( 'Celsius', 'simple-weather-block' ),
								value: 'si',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { units: value } )
						}
					/>

					{ definition.fields.map( ( field ) => (
						<ToggleControl
							key={ field }
							__nextHasNoMarginBottom
							label={ fieldLabels[ field ] }
							checked={
								!! attributes[ FIELD_ATTRIBUTES[ field ] ]
							}
							onChange={ ( value ) =>
								setAttributes( {
									[ FIELD_ATTRIBUTES[ field ] ]: value,
								} )
							}
						/>
					) ) }

					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Show unit letter',
							'simple-weather-block'
						) }
						help={ __(
							'Display 72°F rather than 72°.',
							'simple-weather-block'
						) }
						checked={ showUnit }
						onChange={ ( value ) =>
							setAttributes( { showUnit: value } )
						}
					/>
				</PanelBody>

				<PanelColorSettings
					title={ __( 'Icon color', 'simple-weather-block' ) }
					colorSettings={ [
						{
							value: iconColor,
							label: __( 'Icon', 'simple-weather-block' ),
							onChange: ( value ) =>
								setAttributes( { iconColor: value || '' } ),
						},
					] }
				>
					<p className="components-base-control__help">
						{ __(
							'Leave unset to use the color from the Simple Weather Block settings, or the surrounding text color.',
							'simple-weather-block'
						) }
					</p>
				</PanelColorSettings>
			</InspectorControls>

			<div { ...blockProps }>
				{ isMultiple ? (
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
					<span className={ `${ BASE }__editor-note` }>
						{ hasNoLocation
							? __( 'Set a location', 'simple-weather-block' )
							: error }
					</span>
				) }
			</div>
		</>
	);
}
