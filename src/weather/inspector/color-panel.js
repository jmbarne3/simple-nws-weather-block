/**
 * Icon color panel.
 *
 * Only the glyph takes a color of its own. Everything else in the block is
 * text, and the block's own color supports already cover that.
 */

import { __ } from '@wordpress/i18n';
import { PanelColorSettings } from '@wordpress/block-editor';

/**
 * Renders the panel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export default function ColorPanel( { attributes, setAttributes } ) {
	return (
		<PanelColorSettings
			title={ __( 'Icon color', 'simple-nws-weather-block' ) }
			colorSettings={ [
				{
					value: attributes.iconColor,
					label: __( 'Icon', 'simple-nws-weather-block' ),
					onChange: ( value ) =>
						setAttributes( { iconColor: value || '' } ),
				},
			] }
		>
			<p className="components-base-control__help">
				{ __(
					'Leave unset to use the color from the Simple NWS Weather Block settings, or the surrounding text color.',
					'simple-nws-weather-block'
				) }
			</p>
		</PanelColorSettings>
	);
}
