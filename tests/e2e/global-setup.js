/**
 * Signs in, as the `@wordpress/scripts` setup does, then puts the site into a
 * known state.
 *
 * The PHPUnit suite shares the wp-env tests database, and its bootstrap
 * reinstalls WordPress with a theme that does not exist and no plugins active.
 * Without a real theme, core resolves every block asset URL against the missing
 * theme directory and the block never loads in the editor. So a theme and this
 * plugin are activated here, whatever ran before.
 */

const { request } = require( '@playwright/test' );
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );

module.exports = async function globalSetup( config ) {
	const { storageState, baseURL } = config.projects[ 0 ].use;
	const requestContext = await request.newContext( { baseURL } );
	const requestUtils = new RequestUtils( requestContext, {
		storageStatePath:
			typeof storageState === 'string' ? storageState : undefined,
	} );

	await requestUtils.setupRest();
	await requestUtils.activateTheme( 'twentytwentyfive' );
	await requestUtils.activatePlugin( 'simple-nws-weather-block' );
	await requestContext.dispose();
};
