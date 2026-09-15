/**
 * Layout panel: which shape the block takes, and how much of it there is.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';

import { clampPeriodCount, getLayout, getLayoutOptions } from '../layouts';

/**
 * Renders the panel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export default function LayoutPanel( { attributes, setAttributes } ) {
	const { layout, periodCount } = attributes;
	const definition = getLayout( layout );
	const range = definition.periodRange;

	return (
		<PanelBody title={ __( 'Layout', 'simple-weather-block' ) }>
			<SelectControl
				__nextHasNoMarginBottom
				label={ __( 'Layout', 'simple-weather-block' ) }
				value={ layout }
				options={ getLayoutOptions() }
				onChange={ ( value ) =>
					setAttributes( {
						layout: value,
						/*
						 * The ranges differ between layouts, so a switch can
						 * leave the count out of bounds for the new one.
						 */
						periodCount: clampPeriodCount( value, periodCount ),
					} )
				}
			/>

			{ !! range && (
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={
						'hourly' === definition.kind
							? __( 'Hours shown', 'simple-weather-block' )
							: __( 'Days shown', 'simple-weather-block' )
					}
					value={ clampPeriodCount( layout, periodCount ) }
					min={ range.min }
					max={ range.max }
					onChange={ ( value ) =>
						setAttributes( { periodCount: value } )
					}
				/>
			) }
		</PanelBody>
	);
}
