/**
 * The layout registry.
 *
 * Every layout is one file in this directory declaring everything about itself:
 * which endpoint it reads, which fields it can render, how many periods it may
 * show, and how it introduces itself in the inserter. Adding a layout means
 * adding a file and one line here.
 *
 * `includes/class-simple-weather-block-layouts.php` mirrors the structural half
 * of this -- kind, fields and period range -- because PHP cannot read these
 * modules. The two must be changed together.
 */

import inline from './inline';
import stacked from './stacked';
import detailed from './detailed';
import daily from './daily';
import hourly from './hourly';

export {
	FIELD_ATTRIBUTES,
	METRIC_FIELDS,
	getFieldLabels,
	getMetricLabels,
} from './fields';

/**
 * Every layout, in the order the inserter and the sidebar should offer them.
 *
 * @type {Object[]}
 */
const ALL = [ inline, stacked, detailed, daily, hourly ];

/**
 * Every layout, keyed by name.
 *
 * @type {Object<string, Object>}
 */
export const LAYOUTS = Object.fromEntries(
	ALL.map( ( layout ) => [ layout.name, layout ] )
);

/**
 * Layout used when a block predates the attribute.
 *
 * @type {string}
 */
export const DEFAULT_LAYOUT = 'inline';

/**
 * Returns the definition for a layout, falling back to the default.
 *
 * @param {string} layout Layout name.
 * @return {Object} Layout definition.
 */
export function getLayout( layout ) {
	return LAYOUTS[ layout ] || LAYOUTS[ DEFAULT_LAYOUT ];
}

/**
 * Whether a layout can render a given field.
 *
 * @param {string} layout Layout name.
 * @param {string} field  Field name.
 * @return {boolean} True when the field has somewhere to go.
 */
export function supportsField( layout, field ) {
	return getLayout( layout ).fields.includes( field );
}

/**
 * Clamps a period count to what its layout allows.
 *
 * Switching layouts can leave a count out of bounds -- twelve hours becoming
 * twelve days -- so this runs on the way in as well as on the way out.
 *
 * @param {string} layout Layout name.
 * @param {number} count  Requested count.
 * @return {number} A count within range, or 1 for a single-reading layout.
 */
export function clampPeriodCount( layout, count ) {
	const range = getLayout( layout ).periodRange;

	if ( ! range ) {
		return 1;
	}

	if ( ! Number.isFinite( count ) ) {
		return range.fallback;
	}

	return Math.min( range.max, Math.max( range.min, Math.round( count ) ) );
}

/**
 * Options for the sidebar's layout select.
 *
 * @return {Object[]} `{ value, label }` pairs in registry order.
 */
export function getLayoutOptions() {
	return ALL.map( ( layout ) => ( {
		value: layout.name,
		label: layout.label,
	} ) );
}

/**
 * Block variations, one per layout.
 *
 * Each carries its layout in `attributes` and matches on it through `isActive`,
 * so the editor labels an existing block with the layout it is actually set to
 * rather than with whichever variation was inserted.
 *
 * @return {Object[]} Variations ready for `registerBlockVariation`.
 */
export function getVariations() {
	return ALL.map( ( layout ) => ( {
		name: layout.name,
		...layout.variation,
		scope: [ 'inserter', 'transform' ],
		attributes: {
			layout: layout.name,
			...layout.variation.attributes,
		},
		isActive: [ 'layout' ],
	} ) );
}
