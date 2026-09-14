/**
 * Translates National Weather Service condition codes into Weather Icons classes.
 *
 * NWS returns an icon as a URL rather than a bare code, in the shape
 * `https://api.weather.gov/icons/land/day/tsra_hi,60?size=medium`. The path
 * carries everything we need: the day/night segment and one or two condition
 * codes, each optionally followed by a probability. Only the first condition is
 * used, because it describes the start of the period the temperature belongs to.
 *
 * @see https://www.weather.gov/documentation/services-web-api
 * @see https://erikflowers.github.io/weather-icons/
 */

/**
 * Class used when a condition code cannot be matched.
 *
 * @type {string}
 */
export const FALLBACK_ICON = 'wi-na';

/**
 * Maps each NWS condition code to `[ dayClass, nightClass ]`.
 *
 * Codes that describe a hazard rather than a sky condition (tornado, smoke,
 * extreme heat) use the same glyph regardless of time of day.
 *
 * @type {Object<string, [string, string]>}
 */
const ICON_MAP = {
	// Sky cover, clear through overcast.
	skc: [ 'wi-day-sunny', 'wi-night-clear' ],
	few: [ 'wi-day-sunny-overcast', 'wi-night-alt-partly-cloudy' ],
	sct: [ 'wi-day-cloudy', 'wi-night-alt-cloudy' ],
	bkn: [ 'wi-day-cloudy-high', 'wi-night-alt-cloudy-high' ],
	ovc: [ 'wi-cloudy', 'wi-cloudy' ],

	// The same sky cover, but windy.
	wind_skc: [ 'wi-day-windy', 'wi-windy' ],
	wind_few: [ 'wi-day-cloudy-windy', 'wi-night-alt-cloudy-windy' ],
	wind_sct: [ 'wi-day-cloudy-windy', 'wi-night-alt-cloudy-windy' ],
	wind_bkn: [ 'wi-day-cloudy-windy', 'wi-night-alt-cloudy-windy' ],
	wind_ovc: [ 'wi-cloudy-windy', 'wi-cloudy-windy' ],

	// Rain.
	rain: [ 'wi-day-rain', 'wi-night-alt-rain' ],
	rain_showers: [ 'wi-day-showers', 'wi-night-alt-showers' ],
	rain_showers_hi: [ 'wi-day-showers', 'wi-night-alt-showers' ],

	// Thunderstorms.
	tsra: [ 'wi-day-thunderstorm', 'wi-night-alt-thunderstorm' ],
	tsra_sct: [ 'wi-day-thunderstorm', 'wi-night-alt-thunderstorm' ],
	tsra_hi: [ 'wi-day-thunderstorm', 'wi-night-alt-thunderstorm' ],

	// Snow, sleet and freezing rain.
	snow: [ 'wi-day-snow', 'wi-night-alt-snow' ],
	sleet: [ 'wi-day-sleet', 'wi-night-alt-sleet' ],
	rain_snow: [ 'wi-day-rain-mix', 'wi-night-alt-rain-mix' ],
	rain_sleet: [ 'wi-day-sleet', 'wi-night-alt-sleet' ],
	snow_sleet: [ 'wi-day-sleet', 'wi-night-alt-sleet' ],
	fzra: [ 'wi-day-rain-mix', 'wi-night-alt-rain-mix' ],
	rain_fzra: [ 'wi-day-rain-mix', 'wi-night-alt-rain-mix' ],
	snow_fzra: [ 'wi-day-rain-mix', 'wi-night-alt-rain-mix' ],
	blizzard: [ 'wi-snow-wind', 'wi-snow-wind' ],

	// Reduced visibility.
	fog: [ 'wi-day-fog', 'wi-night-fog' ],
	haze: [ 'wi-day-haze', 'wi-night-fog' ],
	smoke: [ 'wi-smoke', 'wi-smoke' ],
	dust: [ 'wi-dust', 'wi-dust' ],

	// Severe weather and temperature extremes.
	tornado: [ 'wi-tornado', 'wi-tornado' ],
	hurricane: [ 'wi-hurricane', 'wi-hurricane' ],
	tropical_storm: [ 'wi-hurricane', 'wi-hurricane' ],
	hot: [ 'wi-hot', 'wi-hot' ],
	cold: [ 'wi-snowflake-cold', 'wi-snowflake-cold' ],
};

/**
 * Every Weather Icons class this module can return.
 *
 * The front end swaps icon classes on an element that already carries one, so
 * it needs to know the full set in order to remove the previous class.
 *
 * @type {string[]}
 */
export const ALL_ICON_CLASSES = [
	...new Set( [ FALLBACK_ICON, ...Object.values( ICON_MAP ).flat() ] ),
];

/**
 * Extracts the condition code and time of day from an NWS icon URL.
 *
 * @param {string} iconUrl Icon URL as returned by the forecast endpoint.
 * @return {{code: string, isDaytime: (boolean|null)}} Parsed parts. `code` is
 *     an empty string and `isDaytime` is null when the URL is unrecognised.
 */
export function parseIconUrl( iconUrl ) {
	const empty = { code: '', isDaytime: null };

	if ( typeof iconUrl !== 'string' ) {
		return empty;
	}

	// e.g. /icons/land/day/tsra_hi,60/sct?size=medium
	const match = iconUrl.match(
		/\/icons\/[^/]+\/(day|night)\/([a-z_]+)(?:,\d+)?/
	);

	if ( ! match ) {
		return empty;
	}

	return { code: match[ 2 ], isDaytime: match[ 1 ] === 'day' };
}

/**
 * Returns the Weather Icons class for a forecast period.
 *
 * @param {Object}  period             Normalised forecast period.
 * @param {string}  [period.icon]      NWS icon URL.
 * @param {boolean} [period.isDaytime] Whether the period is during the day.
 * @return {string} A `wi-*` class name. Never empty.
 */
export function getIconClass( period = {} ) {
	const { code, isDaytime: fromUrl } = parseIconUrl( period.icon );

	if ( ! code || ! ICON_MAP[ code ] ) {
		return FALLBACK_ICON;
	}

	/*
	 * The URL is the more reliable source for time of day, because a daily
	 * period's `isDaytime` describes the whole period rather than the icon.
	 * Fall back to the period's own flag, then to daytime.
	 */
	const isDaytime = fromUrl !== null ? fromUrl : period.isDaytime !== false;

	return ICON_MAP[ code ][ isDaytime ? 0 : 1 ];
}
