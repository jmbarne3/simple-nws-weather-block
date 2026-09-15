/**
 * The class names the block renders under.
 *
 * Three different runtimes write this markup -- PHP on the server, React in the
 * editor, plain DOM calls on the front end -- and all three have to agree on
 * every class name. Keeping the prefix in one place is what makes a rename a
 * one-line change rather than a search across the plugin.
 */

/**
 * Prefix shared by every class inside the block.
 *
 * Matches the class WordPress generates from the block name, so the wrapper and
 * its children read as one family in a theme's stylesheet.
 *
 * @type {string}
 */
export const BASE = 'wp-block-simple-weather-block-weather';

/**
 * Builds the class for one element inside the block.
 *
 * @param {string} name Element name, e.g. `icon`.
 * @return {string} The full class name.
 */
export function element( name ) {
	return `${ BASE }__${ name }`;
}

/**
 * Builds the class that marks which layout a block is rendering.
 *
 * @param {string} layout Layout name.
 * @return {string} The full class name.
 */
export function layoutClass( layout ) {
	return `is-weather-${ layout }`;
}
