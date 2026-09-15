/**
 * Asking the browser where the visitor is.
 *
 * Only used by a block set to "Visitor's location". Nothing is stored and
 * nothing is sent anywhere: the coordinates go straight into the forecast
 * request the browser makes on its own behalf.
 */

/**
 * Asks the browser for the visitor's coordinates.
 *
 * @param {number} [timeout] How long to wait, in milliseconds.
 * @return {Promise<{latitude: number, longitude: number}>} The visitor's position.
 * @throws {Error} When geolocation is unsupported, denied or times out.
 */
export function getVisitorCoordinates( timeout = 10000 ) {
	return new Promise( ( resolve, reject ) => {
		if ( ! window.navigator?.geolocation ) {
			reject( new Error( 'This browser does not support geolocation.' ) );

			return;
		}

		window.navigator.geolocation.getCurrentPosition(
			( position ) =>
				resolve( {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				} ),
			() => reject( new Error( 'Could not determine your location.' ) ),
			{ timeout, maximumAge: 15 * 60 * 1000 }
		);
	} );
}
