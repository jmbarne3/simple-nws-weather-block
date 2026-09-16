/**
 * Browser tests, on top of the `@wordpress/scripts` Playwright defaults.
 *
 * Runs against the wp-env tests site on port 8889. Which WordPress that is
 * depends on how wp-env was started; see "Testing" in README.md.
 */

const path = require( 'path' );
const baseConfig = require( '@wordpress/scripts/config/playwright.config' );

module.exports = {
	...baseConfig,
	testDir: path.join( __dirname, 'tests/e2e' ),
	globalSetup: require.resolve( './tests/e2e/global-setup.js' ),
	webServer: {
		...baseConfig.webServer,
		command: 'npm run env -- start',
	},
};
