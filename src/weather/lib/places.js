/**
 * Looking up a place by name.
 *
 * The request goes to this plugin's own REST route rather than to a geocoder
 * directly. `Simple_Weather_Block_Geocoder` explains why: an open geocoder wants
 * a `User-Agent` a browser will not send, and a shared cache is worth more than
 * a saved hop when the whole feature runs a handful of times per site.
 */

import apiFetch from '@wordpress/api-fetch';

/**
 * Shortest query worth sending.
 *
 * Mirrors the floor the REST route enforces, so a stray keystroke does not
 * become a request that comes back empty anyway.
 *
 * @type {number}
 */
const MINIMUM_LENGTH = 2;

/**
 * Searches for a place by name, ZIP code or landmark.
 *
 * @param {string} query What the user typed.
 * @return {Promise<Object[]>} Matching places, best first. Empty for a short query.
 * @throws {Error} When the geocoder is unreachable or returns an error.
 */
export async function searchPlaces( query ) {
	const trimmed = ( query || '' ).trim();

	if ( trimmed.length < MINIMUM_LENGTH ) {
		return [];
	}

	const response = await apiFetch( {
		path: `/simple-weather-block/v1/places?q=${ encodeURIComponent(
			trimmed
		) }`,
	} );

	return response?.results || [];
}

/**
 * Builds a stable key for one result.
 *
 * Two towns can share a name and a state, so the coordinates are part of it.
 *
 * @param {Object} place Result from `searchPlaces`.
 * @return {string} A key unique within one set of results.
 */
export function placeKey( place ) {
	return `${ place.name }|${ place.detail }|${ place.latitude },${ place.longitude }`;
}

/**
 * Builds the single line shown for one result.
 *
 * @param {Object} place Result from `searchPlaces`.
 * @return {string} e.g. `Orlando, Florida` or `32816, University, Florida`.
 */
export function placeLabel( place ) {
	return place.detail ? `${ place.name }, ${ place.detail }` : place.name;
}
