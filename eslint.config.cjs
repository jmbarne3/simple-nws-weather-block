/**
 * ESLint configuration: the `@wordpress/scripts` defaults, with the same
 * ignore list as .stylelintignore and .prettierignore.
 *
 * Linting covers only code this project writes -- never dependencies, compiled
 * output, vendored third-party assets or test output.
 */

const defaultConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	{
		ignores: [
			'node_modules/**',
			'vendor/**',
			'build/**',
			'assets/**',
			'artifacts/**',
			'playwright-report/**',
			'test-results/**',
		],
	},
	...defaultConfig,
	{
		// Every translatable string must use this plugin's text domain.
		rules: {
			'@wordpress/i18n-text-domain': [
				'error',
				{ allowedTextDomain: 'simple-nws-weather-block' },
			],
		},
	},
];
