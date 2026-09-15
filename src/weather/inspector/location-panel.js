/**
 * Location panel: where the block gets its coordinates.
 */

import { __ } from '@wordpress/i18n';
import {
	ExternalLink,
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
} from '@wordpress/components';

/**
 * Renders the panel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {boolean}  props.hasNoLocation Whether the resolved location is empty.
 * @return {Element} The panel.
 */
export default function LocationPanel( {
	attributes,
	setAttributes,
	hasNoLocation,
} ) {
	const { locationSource, latitude, longitude, locationLabel } = attributes;

	return (
		<PanelBody
			title={ __( 'Location', 'simple-weather-block' ) }
			initialOpen={ false }
		>
			<SelectControl
				__nextHasNoMarginBottom
				label={ __( 'Location source', 'simple-weather-block' ) }
				value={ locationSource }
				options={ [
					{
						label: __( 'Site default', 'simple-weather-block' ),
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
						label={ __( 'Latitude', 'simple-weather-block' ) }
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
						label={ __( 'Longitude', 'simple-weather-block' ) }
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
						label={ __( 'Location label', 'simple-weather-block' ) }
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
	);
}
