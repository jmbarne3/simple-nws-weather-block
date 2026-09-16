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

import LocationSearch from '../components/location-search';

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
			title={ __( 'Location', 'simple-nws-weather-block' ) }
			initialOpen={ false }
		>
			<SelectControl
				__nextHasNoMarginBottom
				label={ __( 'Location source', 'simple-nws-weather-block' ) }
				value={ locationSource }
				options={ [
					{
						label: __( 'Site default', 'simple-nws-weather-block' ),
						value: 'site',
					},
					{
						label: __(
							'Specific location',
							'simple-nws-weather-block'
						),
						value: 'custom',
					},
				] }
				onChange={ ( value ) =>
					setAttributes( { locationSource: value } )
				}
			/>

			{ 'custom' === locationSource && (
				<>
					<LocationSearch
						label={ __(
							'Search for a place',
							'simple-nws-weather-block'
						) }
						help={ __(
							'A city, a ZIP code or a landmark. Choosing one fills in the coordinates below.',
							'simple-nws-weather-block'
						) }
						onSelect={ ( place ) =>
							setAttributes( {
								// The attributes are strings; the API returns numbers.
								latitude: String( place.latitude ),
								longitude: String( place.longitude ),
								/*
								 * A label already written is somebody's wording
								 * for this place, so it is never replaced.
								 */
								locationLabel:
									locationLabel || place.label || place.name,
							} )
						}
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Latitude', 'simple-nws-weather-block' ) }
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
						label={ __( 'Longitude', 'simple-nws-weather-block' ) }
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
							'simple-nws-weather-block'
						) }
						help={ __(
							'Used in place of the name the National Weather Service reports, and announced to screen readers. Optional.',
							'simple-nws-weather-block'
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
						'simple-nws-weather-block'
					) }{ ' ' }
					<ExternalLink
						href={ `${ window.location.origin }/wp-admin/options-general.php?page=simple-nws-weather-block` }
					>
						{ __(
							'Simple NWS Weather Block settings',
							'simple-nws-weather-block'
						) }
					</ExternalLink>
				</Notice>
			) }
		</PanelBody>
	);
}
