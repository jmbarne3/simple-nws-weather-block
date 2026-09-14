<!-- wporg
Contributors: jmbarne3
Tags: block, weather, forecast, temperature, nws
Tested up to: 6.8
Skip sections: Development
-->

# Weather Block

A block for WordPress block themes that shows the current weather as an icon and a
temperature, fetched in the visitor's browser from the National Weather Service.

## Description

Most weather plugins are a server-side affair: WordPress calls a third-party API on
page load, caches the response in a transient, and you hope the remote service stays
up. This one inverts that. **Nothing about the weather is fetched on the server**,
which means the block costs your site no request time, survives full-page caching
without going stale, and has no API key to rotate or leak.

Instead, the block renders a small placeholder carrying its configuration, and a
script in the visitor's browser calls the National Weather Service directly and fills
it in. The NWS API is public, free, and sends permissive CORS headers, so no
credentials or proxying are involved. Each visitor's browser caches the result in
local storage for an hour by default, so moving between pages costs nothing further.

The icon comes from Erik Flowers' [Weather Icons](https://erikflowers.github.io/weather-icons/),
a webfont rather than a set of images, which is why it takes a color and scales with
your type instead of sitting in the page as a fixed-size picture.

### What it looks like

By default: an icon and a rounded temperature, side by side, inheriting the
surrounding text color and font. Everything visible is configurable, and the block is
announced to screen readers as a sentence — "Current weather in Orlando: Partly
Cloudy, 78 degrees Fahrenheit" — rather than as a glyph and a bare number.

## Requirements

The National Weather Service covers **the United States and its territories only**.
Outside that coverage area the API returns no forecast, and the block hides itself
rather than leaving a broken placeholder on the page. If you need international
coverage, this is the wrong plugin.

You will also need WordPress 6.8 or newer and PHP 7.4 or newer.

## Installation

1. Upload the plugin to `/wp-content/plugins/weather-block`, or install it through the
   Plugins screen.
1. Activate it through the Plugins screen.
1. Visit **Settings → Weather Block** and set a default location. Until you do, blocks
   set to "Site default" will not render.
1. Add the **Weather** block to a post, page or template.

## Settings

Site-wide defaults live at **Settings → Weather Block**. Every one of them is a
fallback: an individual block can override the location, units and color, and will
only fall back here when it has not.

- **Default icon color.** Applies to any block that has not chosen its own. Leave it
  empty to inherit the surrounding text color, which is usually what you want in a
  block theme.
- **Default location.** A latitude and longitude, plus an optional label used in the
  text read aloud to screen readers. Coordinates are rounded to four decimal places,
  as the NWS asks.
- **Units.** Fahrenheit or Celsius.
- **Cache lifetime.** How long a forecast is reused in the visitor's browser before it
  is fetched again. Defaults to 60 minutes. Set it to 0 to disable caching.

## Block options

Each block's sidebar carries its own overrides.

- **Location source.** *Site default* uses the settings above. *Specific location*
  takes its own coordinates, for a campus page or a regional landing page.
  *Visitor's location* asks the browser for permission on page load and quietly falls
  back to the site default if it is refused.
- **Conditions.** *Right now* reads the current hour from the hourly forecast.
  *Today's forecast* reads the current daily period, which is the high or low
  depending on the time of day.
- **Units.** Fahrenheit, Celsius, or whatever the site default is.
- **Show icon / Show temperature.** Either can be turned off. Turning off both hides
  the block.
- **Show unit letter.** Renders `72°F` rather than `72°`.
- **Icon color.** Accepts a color from the theme palette or a custom one.

## Theming

### Typography

The block deliberately **declares no font of its own**. The temperature inherits
whatever the theme sets on its surroundings, so in a well-built block theme it already
matches the text around it without configuration.

Where you want to be explicit, the block supports the full typography panel — size,
family, weight, style, line height, letter spacing and text transform — so any font
registered in the theme's `theme.json` is selectable per block. The icon is sized in
`em`, so it scales with whatever type it lands in rather than fighting it.

To set a default for every Weather block at once, target it from `theme.json`:

```json
{
	"styles": {
		"blocks": {
			"weather-block/weather": {
				"typography": {
					"fontFamily": "var:preset|font-family|heading",
					"fontSize": "var:preset|font-size|large"
				}
			}
		}
	}
}
```

### Icon color

The icon's color resolves in three steps: the block's own setting, then the site
default, then `currentColor`. It is applied through a custom property, so a stylesheet
can override it without fighting specificity:

```css
.wp-block-weather-block-weather {
	--wb-icon-color: #ffc904;
}
```

### Classes

The wrapper carries `is-weather-loading` until data arrives, then `is-weather-loaded`,
or `is-weather-error` if the forecast could not be fetched. An errored block is hidden
by default; override `.is-weather-error { display: inline-flex; }` if you would rather
it stayed visible. Inside are `__icon`, `__temperature` and a visually hidden
`__description`, each prefixed with `wp-block-weather-block-weather`.

## Caching

Forecasts are cached in each visitor's browser in `localStorage`, keyed by rounded
coordinates, forecast type and units. Two details are worth knowing.

Expiry is checked against the **current** setting rather than one frozen into each
cached entry, so shortening the cache lifetime takes effect on the next page load
instead of waiting for existing entries to age out. And the coordinate-to-grid lookup
that the NWS requires before a forecast is cached separately for thirty days, because
that mapping never changes — so a warm visitor loading a page makes no requests at
all, and a cold one makes two.

Several Weather blocks sharing a location on one page collapse into a single request
between them. If local storage is unavailable — private browsing, blocked site data —
the block falls back to an in-memory cache for the life of the page rather than
failing.

## Frequently Asked Questions

### Does this need an API key?

No. The National Weather Service API is public and unauthenticated, and sends
`Access-Control-Allow-Origin: *`, so the browser can call it directly. There is
nothing to sign up for and nothing to store.

### Does it work outside the United States?

No. See Requirements above.

### Does it work with full-page caching?

Yes, and that is the point of the design. The HTML that gets cached contains only the
block's configuration, never a temperature, so a cached page is never a stale one.

### My block is not showing up. Why?

Most likely no default location is set, or the block is set to a specific location
whose coordinates are invalid or outside NWS coverage. A block with nothing to show
renders nothing at all rather than leaving a placeholder behind. Check
**Settings → Weather Block**.

### Which icons are used?

[Weather Icons 2.0.10](https://erikflowers.github.io/weather-icons/) by Erik Flowers,
bundled with the plugin rather than loaded from a CDN. All 34 NWS condition codes are
mapped to day and night variants.

## Changelog

### 0.1.0

* Initial release.
* Weather block showing a Weather Icons glyph and a temperature, fetched client-side
  from the National Weather Service.
* Per-block location (site default, specific coordinates, or visitor geolocation),
  units, conditions period and icon color.
* Settings screen for the default location, icon color, units and cache lifetime.
* Browser-side caching with a configurable lifetime, request de-duplication and a
  long-lived cache for NWS grid lookups.
* Full typography and color block supports, inheriting the theme's fonts by default.

## Development

The plugin is built with [`@wordpress/scripts`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/)
and no custom build configuration.

```sh
npm install
npm start          # watch and rebuild
npm run build      # production build
npm run lint:js
npm run lint:css
npm run format
```

### Project layout

```
weather-block.php                 Plugin header, constants, block and asset registration
includes/                         Settings screen and option access
src/weather/                      Block source
  block.json                      Block metadata, attributes and supports
  index.js  edit.js               Editor registration and sidebar
  view.js                         Front-end runtime
  render.php                      Server-rendered placeholder
  lib/nws.js                      API access, caching, request de-duplication
  lib/icons.js                    NWS condition code to Weather Icons mapping
  style.scss  editor.scss         Styles
assets/weather-icons/             Vendored Weather Icons font and CSS
utils/                            Release tooling
build/                            Generated; do not edit
```

### Documentation

`README.md` is the source of truth. `readme.txt` — the WordPress.org format — is
generated from it, so **edit this file and never `readme.txt` directly**.

```sh
npm run readme          # regenerate readme.txt
npm run readme:check    # fail if readme.txt is out of date, for CI
```

Sections listed under `Skip sections` in the hidden metadata block at the top of this
file are left out of `readme.txt`. Everything else — the version, the WordPress and
PHP requirements, the license, and the short description — is read from the plugin
header in `weather-block.php`, so those are never entered twice.

### Releasing

One command updates the version everywhere it appears — `package.json`,
`package-lock.json`, the plugin header, the `WEATHER_BLOCK_VERSION` constant and
`block.json` — and regenerates `readme.txt`:

```sh
npm run version:set -- 0.2.0     # or: patch | minor | major
npm run build                    # block.json is copied into build/, so rebuild after
```

The script warns if the new version has no entry under Changelog above. Add one before
tagging.

## Credits

Weather data from the [National Weather Service](https://www.weather.gov/documentation/services-web-api).

Icons from [Weather Icons](https://erikflowers.github.io/weather-icons/) by Erik
Flowers, licensed [SIL OFL 1.1](https://scripts.sil.org/OFL) (font) and
[MIT](https://opensource.org/licenses/mit-license.html) (CSS).
