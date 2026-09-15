/**
 * The handful of DOM operations the front end needs.
 *
 * Every write goes into an element the server already printed. Which fields a
 * layout shows is decided in PHP, so anything switched off simply is not in the
 * document and the corresponding write is skipped rather than guarded.
 */

import { element } from '../lib/classes';
import { ALL_ICON_CLASSES } from '../lib/icons';

/**
 * Finds one element inside a block by its unprefixed class name.
 *
 * @param {HTMLElement} parent Element to search within.
 * @param {string}      name   Class name after the block prefix, e.g. `icon`.
 * @return {?HTMLElement} The element, or null when the field is switched off.
 */
export function find( parent, name ) {
	return parent.querySelector( `.${ element( name ) }` );
}

/**
 * Finds every element inside a block matching an unprefixed class name.
 *
 * @param {HTMLElement} parent Element to search within.
 * @param {string}      name   Class name after the block prefix.
 * @return {NodeList} Matching elements.
 */
export function findAll( parent, name ) {
	return parent.querySelectorAll( `.${ element( name ) }` );
}

/**
 * Writes text into an element, when that element exists.
 *
 * @param {?HTMLElement} target Target element.
 * @param {string}       text   Text to write.
 * @return {void}
 */
export function setText( target, text ) {
	if ( target ) {
		target.textContent = text;
	}
}

/**
 * Swaps the condition glyph on an icon element.
 *
 * Every class the mapping can produce is removed first, because the element
 * arrives carrying the placeholder glyph and may later be re-rendered.
 *
 * @param {?HTMLElement} target    Icon element.
 * @param {string}       iconClass Weather Icons class to apply.
 * @return {void}
 */
export function setIcon( target, iconClass ) {
	if ( ! target ) {
		return;
	}

	target.classList.remove( ...ALL_ICON_CLASSES );
	target.classList.add( iconClass );
}
