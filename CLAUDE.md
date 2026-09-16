# Simple NWS Weather Block

A WordPress block plugin that shows National Weather Service conditions and forecasts. It is for **US locations only** and fetches forecasts **in the visitor's browser**, never on the server. `README.md` explains the design; read its Development section before changing architecture.

## Before you say work is done

CI (`.github/workflows/tests.yml`) runs on pushes to `main`, on pull requests and before every release. It does **not** run on `develop`, so run the checks locally before merging:

```sh
npm run lint:js && npm run lint:css && npm run readme:check && npm run lint:php
npm run env -- start && npm run test:php && npm run test:e2e
```

Run `composer install` and `npm install` first. The lint commands must pass with `vendor/` present, because CI installs Composer before linting.

## What gets linted

Linters and the formatter cover only code this project writes. The same ignore list lives in `.stylelintignore`, `.prettierignore` and `eslint.config.cjs`: `node_modules/`, `vendor/`, `build/`, `assets/` (vendored Weather Icons) and test output. **If you add a directory of generated or third-party files, add it to all three.** A project ignore file replaces the `wp-scripts` default instead of extending it, which is how `vendor/` CSS once failed CI.

Never lint, format or edit `build/`, `vendor/`, `node_modules/` or `assets/weather-icons/`.

## JavaScript (ESLint + Prettier via `@wordpress/scripts`)

- Tabs, 80-column lines, single quotes, semicolons, trailing commas where ES5 allows, and **spaces inside parentheses and brackets**: `foo( a, [ 1, 2 ] )`. Run `npm run format` rather than hand-formatting; it is what `prettier/prettier` checks.
- Every translatable string uses `__()`, `_x()`, `_n()` or `sprintf()` from `@wordpress/i18n` with the text domain `'simple-nws-weather-block'`. A wrong or missing domain is a lint error.
- No variables inside translation functions; use `sprintf()` with placeholders and a `/* translators: */` comment above it.
- Document every function with JSDoc: a description, then `@param {Type} name Description.` for each parameter and `@return {Type} Description.` The `jsdoc/require-*` rules check types and descriptions.
- `===` only, no `console.*`, no unused variables, camelCase names. Hooks follow `react-hooks/rules-of-hooks` and list complete dependencies.
- Import `@wordpress/*` packages rather than reading `window.wp`; they are externals that WordPress core supplies.
- CSS class names come from `src/weather/lib/classes.js` (`element()`, `layoutClass()`). Never hardcode the `wp-block-simple-nws-weather-block-weather` prefix.

## SCSS (stylelint, `@wordpress/stylelint-config/scss-stylistic`)

- Tab indentation, one selector per line in a selector list, and `property: value` with one space after the colon.
- No named colors (`lightgrey`): use hex or a custom property. Numeric font weights (`700`, not `bold`). No quotes around font family names that don't need them. No empty rule blocks.
- The stylesheet ships structure only. It sets no fonts, borders, backgrounds or shadows, because the block's supports provide those. Adjustable values are custom properties prefixed `--wb-`.

## PHP

Two automated checks read their minimums from the header in `simple-nws-weather-block.php`, so **never hardcode a version in either config**:

- **`Requires at least` (WordPress).** PHPStan level 5 with WPCompat fails on any WordPress function, method, parameter or hook introduced after that version. Wrap a newer API in a `function_exists()` or `method_exists()` guard, or raise the header deliberately and record why in the README's "Supported WordPress and PHP versions" section.
- **`Requires PHP`.** PHPCompatibilityWP fails on newer syntax or functions. Currently 7.4: no `match`, named arguments, constructor promotion, nullsafe `?->`, union types, enums or `readonly`.

Not enforced by a tool, but followed throughout. Match it:

- WordPress Coding Standards formatting: tabs, spaces inside parentheses, Yoda conditions (`'site' === $source`), long `array()` syntax.
- Every file starts with a file docblock (`@package SimpleNWSWeatherBlock`) and `if ( ! defined( 'ABSPATH' ) ) { exit; }`, except `render.php` and the partials, which WordPress includes.
- Prefix everything global: classes `Simple_NWS_Weather_Block_*`, functions and hooks `simple_nws_weather_block_*`, constants `SIMPLE_NWS_WEATHER_BLOCK_*`. Variables in `render.php` and `partials/` use the `$simple_nws_weather_block_` prefix, because they share the global scope.
- Escape on output (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`). Sanitize on input. Colors must pass `sanitize_color()` before reaching a `style` attribute.
- Every string uses the `'simple-nws-weather-block'` text domain.

## Project rules the linters can't catch

- **Forecasts are fetched in the browser.** Never add a server-side request to `api.weather.gov`; see the design notes in `README.md`. The Photon place search is the one deliberate server-side exception.
- **No visitor geolocation.** Locations come only from the site default or the block's own coordinates. `locationSource` is `site` or `custom`.
- **Layouts are defined twice.** Any change in `src/weather/layouts/` must be mirrored in `includes/class-simple-nws-weather-block-layouts.php`. `PluginTest` checks that the `block.json` layout enum matches the PHP registry.
- **`build/` is committed.** After changing anything in `src/`, run `npm run build` and commit the result. `PluginTest` fails if the built `block.json` version is stale.
- **Never edit `readme.txt`.** Edit `README.md`, then run `npm run readme`.
- **Versions change only through the scripts.** Use `npm run version:set -- <version>` for the plugin version and `npm run tested-up-to -- <version>` for Tested up to, and only after tests pass on that WordPress version.
- **Tests never touch real services.** PHP tests intercept HTTP with `pre_http_request`, and browser tests mock NWS through `tests/e2e/nws-mock.js`.

## Tests

- **PHP** (`tests/php/*Test.php`) extends `WP_UnitTestCase` and runs inside wp-env through `npm run test:php`. New behavior in `includes/` or `render.php` needs a test here.
- **Browser** (`tests/e2e/*.spec.js`) uses `@wordpress/e2e-test-utils-playwright` through `npm run test:e2e`. Editor or front-end behavior changes need a test here.
- **Order doesn't matter.** The PHPUnit bootstrap reinstalls the tests database. `tests/e2e/global-setup.js` reactivates a theme and the plugin, so the suites can run in either order.
- **Testing the minimum version.** Export `WP_ENV_CORE` and `WP_ENV_PHP_VERSION` for the whole shell before `npm run env -- start --update`. On this machine the PHP 7.4 image cannot build because of a large group ID, so use `WP_ENV_PHP_VERSION=8.3` locally and rely on CI for PHP 7.4.
