/**
 * Site-wide defaults, as the plugin hands them to the editor.
 *
 * `simple_nws_weather_block_enqueue_editor_defaults()` prints these before the
 * editor script runs. Reading them through one function means a change to that
 * contract lands in one place rather than wherever a panel happens to need a
 * default.
 */

/**
 * Returns the site's configured defaults.
 *
 * @return {Object} Default settings, or an empty object when unavailable.
 */
export function getDefaults() {
	return window.simpleNwsWeatherBlockDefaults || {};
}
