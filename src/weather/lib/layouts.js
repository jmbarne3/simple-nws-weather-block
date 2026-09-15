/**
 * What each layout is made of.
 *
 * Every layout draws on the same block attributes, but not every field means
 * something in every layout: a dew point reading has nowhere to go in a
 * one-line inline block, and a location name would repeat itself seven times
 * across a daily forecast. Rather than let the inspector offer toggles that do
 * nothing, each layout declares the fields it can actually render, and the
 * editor, `view.js` and `render.php` all defer to that list.
 *
 * `render.php` carries a deliberate copy of this map, because PHP cannot read
 * it. Anything changed here must be changed there too.
 */

/**
 * Attribute backing each field name.
 *
 * @type {Object<string, string>}
 */
export const FIELD_ATTRIBUTES = {
	icon: 'showIcon',
	temperature: 'showTemperature',
	condition: 'showCondition',
	location: 'showLocation',
	humidity: 'showHumidity',
	wind: 'showWind',
	precipitation: 'showPrecipitation',
	dewPoint: 'showDewPoint',
};

/**
 * Fields rendered as a labelled metric rather than as their own element.
 *
 * @type {string[]}
 */
export const METRIC_FIELDS = [
	'humidity',
	'wind',
	'precipitation',
	'dewPoint',
];

/**
 * Every layout, in the order the inserter should offer them.
 *
 * `kind` decides which request the block makes: `current` reads a single
 * period, `daily` and `hourly` read a run of them.
 *
 * @type {Object<string, {kind: string, fields: string[], multiple: boolean}>}
 */
export const LAYOUTS = {
	inline: {
		kind: 'current',
		fields: [ 'icon', 'temperature', 'condition', 'location' ],
		multiple: false,
	},
	stacked: {
		kind: 'current',
		fields: [ 'icon', 'temperature', 'condition', 'location' ],
		multiple: false,
	},
	detailed: {
		kind: 'current',
		fields: [
			'icon',
			'temperature',
			'condition',
			'location',
			'humidity',
			'wind',
			'precipitation',
			'dewPoint',
		],
		multiple: false,
	},
	daily: {
		kind: 'daily',
		fields: [ 'icon', 'temperature', 'condition', 'precipitation' ],
		multiple: true,
	},
	hourly: {
		kind: 'hourly',
		fields: [ 'icon', 'temperature', 'condition', 'precipitation' ],
		multiple: true,
	},
};

/**
 * Default layout, used when a block predates the attribute.
 *
 * @type {string}
 */
export const DEFAULT_LAYOUT = 'inline';

/**
 * How many periods a multi-period layout may show.
 *
 * The daily endpoint publishes seven days; the hourly one publishes far more
 * than anybody should put on a page, so its ceiling is a judgement rather than
 * a limit of the data.
 *
 * @type {Object<string, {min: number, max: number, fallback: number}>}
 */
export const PERIOD_RANGE = {
	daily: { min: 2, max: 7, fallback: 5 },
	hourly: { min: 2, max: 12, fallback: 6 },
};

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
 * @param {string} layout Layout name.
 * @param {number} count  Requested count.
 * @return {number} A count within range.
 */
export function clampPeriodCount( layout, count ) {
	const range = PERIOD_RANGE[ getLayout( layout ).kind ];

	if ( ! range ) {
		return 1;
	}

	if ( ! Number.isFinite( count ) ) {
		return range.fallback;
	}

	return Math.min( range.max, Math.max( range.min, Math.round( count ) ) );
}
