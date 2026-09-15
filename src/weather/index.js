/**
 * Registers the Weather block and its layout variations.
 *
 * The variations are built from the layout modules rather than declared in
 * `block.json`, so that everything about a layout -- what it reads, what it can
 * show, and how it introduces itself in the inserter -- lives in that layout's
 * own file.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */

import { registerBlockType, registerBlockVariation } from '@wordpress/blocks';

import Edit from './edit';
import metadata from './block.json';
import { getVariations } from './layouts';
import './style.scss';

registerBlockType( metadata.name, {
	/**
	 * @see ./edit.js
	 */
	edit: Edit,
} );

registerBlockVariation( metadata.name, getVariations() );
