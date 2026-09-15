/**
 * Display panel: which period is read, in what units, and which fields show.
 *
 * The field toggles are generated from the chosen layout's own field list
 * rather than written out one by one, so a control cannot appear for something
 * the layout has nowhere to put.
 */

import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';

import { FIELD_ATTRIBUTES, getFieldLabels, getLayout } from '../layouts';
import { getDefaults } from '../lib/defaults';

/**
 * Renders the panel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export default function DisplayPanel( { attributes, setAttributes } ) {
	const { layout, forecastType, units, showUnit } = attributes;
	const definition = getLayout( layout );
	const defaults = getDefaults();
	const fieldLabels = getFieldLabels();

	return (
		<PanelBody title={ __( 'Display', 'simple-weather-block' ) }>
			{ /*
			 * Which period to read only means something when the block shows
			 * one. A forecast strip reads a run of them by definition.
			 */ }
			{ 'current' === definition.kind && (
				<SelectControl
					__nextHasNoMarginBottom
					label={ __( 'Conditions', 'simple-weather-block' ) }
					value={ forecastType }
					options={ [
						{
							label: __( 'Right now', 'simple-weather-block' ),
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
							__( 'Site default (%s)', 'simple-weather-block' ),
							'si' === defaults.units
								? __( 'Celsius', 'simple-weather-block' )
								: __( 'Fahrenheit', 'simple-weather-block' )
						),
						value: '',
					},
					{
						label: __( 'Fahrenheit', 'simple-weather-block' ),
						value: 'us',
					},
					{
						label: __( 'Celsius', 'simple-weather-block' ),
						value: 'si',
					},
				] }
				onChange={ ( value ) => setAttributes( { units: value } ) }
			/>

			{ definition.fields.map( ( field ) => (
				<ToggleControl
					key={ field }
					__nextHasNoMarginBottom
					label={ fieldLabels[ field ] }
					checked={ !! attributes[ FIELD_ATTRIBUTES[ field ] ] }
					onChange={ ( value ) =>
						setAttributes( {
							[ FIELD_ATTRIBUTES[ field ] ]: value,
						} )
					}
				/>
			) ) }

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show unit letter', 'simple-weather-block' ) }
				help={ __(
					'Display 72°F rather than 72°.',
					'simple-weather-block'
				) }
				checked={ showUnit }
				onChange={ ( value ) => setAttributes( { showUnit: value } ) }
			/>
		</PanelBody>
	);
}
