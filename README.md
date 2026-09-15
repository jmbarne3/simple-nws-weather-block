<!-- wporg
Contributors: jmbarne3
Tags: block, weather, forecast, temperature, nws
Tested up to: 6.8
Skip sections: Development
-->

# Simple Weather Block

A block for WordPress block themes that shows current conditions and short-range
forecasts from the National Weather Service, fetched in the visitor's browser.

## Description

Simple Weather Block adds one block to the editor: **Weather**. It shows current
conditions or a short-range forecast for a location, using data from the National
Weather Service.

**The forecast is fetched by the visitor's browser, not by your server.** There is no
API key to obtain, nothing to sign up for and no credentials to store. The page your
server sends carries the block's settings and never a temperature, so the block works
behind full-page caching without going stale and adds no request time to a page load.
Each visitor's browser keeps the result for an hour by default.

Icons come from Erik Flowers' [Weather Icons](https://erikflowers.github.io/weather-icons/),
a webfont rather than a set of images, so they take a color and scale with the type
around them.

### Layouts

The block ships five layouts. Each is offered as its own item in the inserter, and
each is switchable at any time from the sidebar without losing the rest of the
block's configuration.

- **Inline.** An icon and a rounded temperature on one line, small enough to sit in a
  site header or beside a sentence. This is the default.
- **Stacked.** The same reading as a centered column with the conditions and the place
  name beneath it, for a sidebar or the inside of a card.
- **Detailed.** Current conditions beside a list of readings — humidity, wind, chance
  of precipitation and dew point — any of which can be turned off.
- **Daily forecast.** Two to seven days across the page, each with a high, a low and a
  chance of precipitation.
- **Hourly forecast.** The next two to twelve hours, each with an icon and a
  temperature, labeled in the *forecast location's* time zone rather than the
  visitor's.

Every field is optional, and the sidebar offers only the ones the chosen layout can
show. Whatever is on screen, screen readers get a sentence rather than a glyph and a
bare number: a single reading is announced as "Current weather in Orlando: Partly
Cloudy, 78 degrees Fahrenheit", and a forecast as a list with one sentence per
period.

## Requirements

The National Weather Service covers **the United States and its territories only**.
Outside that coverage area the API returns no forecast, and the block hides itself
rather than leaving a broken placeholder on the page. If you need international
coverage, this is the wrong plugin.

You will also need WordPress 6.8 or newer and PHP 7.4 or newer.

## External services

The plugin contacts two external services. Neither requires an account or an API key,
and neither is contacted until a block is rendered or a location is searched.

### National Weather Service

Forecasts come from the National Weather Service API at `api.weather.gov`. The request
is made by each visitor's browser when a page containing a Weather block loads, not by
your server.

**What is sent:** a latitude and longitude, and nothing else — no cookies, no
credentials, no site or visitor identifier. For a block set to *Visitor's location*,
the coordinates sent are the ones that visitor's own browser reports; the browser asks
them for permission first, and a refusal falls back to the site's configured location.
Responses are stored in the visitor's browser in `localStorage` and reused for the
cache lifetime.

**Terms and privacy:** the API is operated by the United States National Weather
Service. See its [API documentation](https://www.weather.gov/documentation/services-web-api),
the [weather.gov disclaimer](https://www.weather.gov/disclaimer) and the
[weather.gov privacy policy](https://www.weather.gov/privacy).

### Photon

Place searches go to the Photon geocoding service at `photon.komoot.io`, operated by
komoot and built on OpenStreetMap data. The request is made by your server on behalf
of a signed-in administrator or editor using the location search.

**What is sent:** the text typed into the search box, and a `User-Agent` header naming
the plugin, its project URL and your site's home URL. Nothing about your visitors is
sent, and the service is never contacted from the front end. Results are cached on
your server for one day.

**Terms and privacy:** see the [Photon usage terms](https://photon.komoot.io/), the
[komoot privacy policy](https://www.komoot.com/privacy) and the
[OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright).

Searches can be pointed at your own Photon or Nominatim instance instead, so that no
third party is contacted at all. See Location search below.

## Installation

1. Upload the plugin to `/wp-content/plugins/simple-weather-block`, or install it through the
   Plugins screen.
1. Activate it through the Plugins screen.
1. Visit **Settings → Simple Weather Block** and set a default location — search for a
   city, a ZIP code or a landmark, and the coordinates fill themselves in. Until you
   do, blocks set to "Site default" will not render.
1. Add the **Weather** block to a post, page or template, or insert one of its
   layouts directly: **Weather (stacked)**, **Weather (detailed)**, **Daily
   forecast** or **Hourly forecast**.

## Settings

Site-wide defaults live at **Settings → Simple Weather Block**. Every one of them is a
fallback: an individual block can override the location, units and color, and will
only fall back here when it has not.

- **Default icon color.** Applies to any block that has not chosen its own. Leave it
  empty to inherit the surrounding text color, which is usually what you want in a
  block theme.
- **Default location.** Search for a place by name, ZIP code or landmark and the
  latitude and longitude fill themselves in; both fields stay editable for anyone who
  already has coordinates. The label used in the text read aloud to screen readers is
  filled in too, but only when it is empty — wording you have written is never
  replaced. Coordinates are rounded to four decimal places, as the NWS asks.
- **Location search endpoint.** Blank unless you want your own. See Location search
  below.
- **Units.** Fahrenheit or Celsius.
- **Cache lifetime.** How long a forecast is reused in the visitor's browser before it
  is fetched again. Defaults to 60 minutes. Set it to 0 to disable caching.

## Block options

Each block's sidebar carries its own overrides. Which controls appear depends on the
layout: a toggle only shows up when the chosen layout has somewhere to put the thing
it switches on, so a daily forecast is not offered a dew point and an inline block is
not offered wind.

- **Layout.** Any of the five above. Switching keeps the location, units and color.
- **Days shown / Hours shown.** Two to seven days, or two to twelve hours. Forecast
  layouts only.
- **Location source.** *Site default* uses the settings above. *Specific location*
  carries the same place search the settings screen has, for a campus page or a
  regional landing page. *Visitor's location* asks the browser for permission on page
  load and quietly falls back to the site default if it is refused.
- **Conditions.** *Right now* reads the current hour from the hourly forecast.
  *Today's forecast* reads the current daily period, which is the high or low
  depending on the time of day. Single-reading layouts only.
- **Units.** Fahrenheit, Celsius, or whatever the site default is.
- **Fields.** Icon, temperature, conditions text, location name, humidity, wind,
  chance of precipitation and dew point, each its own toggle. Turning off every field
  a layout can show hides the block.
- **Show unit letter.** Renders `72°F` rather than `72°`.
- **Icon color.** Accepts a color from the theme palette or a custom one.

## Theming

### Typography

**The block declares no font of its own.** The temperature inherits whatever the theme
sets around it, so in a block theme it matches the surrounding text with no
configuration.

To be explicit instead, the block supports the full typography panel — size, family,
weight, style, line height, letter spacing and text transform — so any font registered
in the theme's `theme.json` is selectable per block. The icon is sized in `em`, so it
scales with the type it sits in.

To set a default for every Weather block at once, target it from `theme.json`:

```json
{
	"styles": {
		"blocks": {
			"simple-weather-block/weather": {
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
.wp-block-simple-weather-block-weather {
	--wb-icon-color: #ffc904;
}
```

### Structure and chrome

The stylesheet sets structure only — how the pieces sit next to each other. It
declares no font, border, background or shadow, so a card is something you build from
the block's own border, background, shadow and padding controls.

Three custom properties are the intended adjustment points:

- `--wb-icon-color` — the condition glyph's color. Falls back to the surrounding text.
- `--wb-weather-gap` — space between the pieces of a single reading. Defaults to
  `0.3em`; the wider gaps in a forecast strip are multiples of it.
- `--wb-period-width` — the narrowest a forecast column may get before the strip wraps
  onto another row. Defaults to `4.5em`.

### Classes

The wrapper carries `is-weather-loading` until data arrives, then `is-weather-loaded`,
or `is-weather-error` if the forecast could not be fetched. It also carries the chosen
layout as `is-weather-inline`, `is-weather-stacked`, `is-weather-detailed`,
`is-weather-daily` or `is-weather-hourly`. An errored block is hidden by default;
override `.is-weather-error { display: flex; }` if you would rather it stayed visible.

Inside, every class is prefixed with `wp-block-simple-weather-block-weather`. A
single-reading layout holds `__reading` (`__icon`, `__temperature`) beside `__details`
(`__condition`, `__location`, and `__metrics` → `__metric` → `__metric-label` plus
`__metric-value`). A forecast layout holds `__periods` → `__period`, each with
`__period-name`, `__icon`, `__temperatures` (`__temperature` and, on a daily forecast,
`__temperature-low`), `__condition` and `__precipitation`. Every block carries a
visually hidden `__description`; every forecast period carries its own
`__period-description`.

## Caching

Forecasts are cached in each visitor's browser in `localStorage`, keyed by rounded
coordinates, endpoint and units. The lifetime is the **Cache lifetime** setting, 60
minutes by default.

Expiry is checked against the current setting rather than one stored with each entry,
so shortening the lifetime takes effect on the next page load. The coordinate-to-grid
lookup the NWS requires before a forecast is cached separately for thirty days: a
returning visitor makes no requests at all, and a first-time visitor makes two.

Several Weather blocks sharing a location on one page make a single request between
them, and daily and hourly blocks in the same place share the grid lookup. Where local
storage is unavailable — private browsing, blocked site data — the block falls back to
an in-memory cache for the life of the page.

## Location search

The settings screen and the block's **Specific location** option both search for a
place by name, ZIP code or landmark, and fill in the coordinates from whatever you
pick. The coordinate fields stay editable, so you can enter a pair directly instead.

A chosen location is confirmed against the National Weather Service before the
settings screen accepts it, so a place the NWS does not cover is caught while you are
choosing it. The location label is filled in too, but only when it is empty — wording
you have written is never replaced. If the search is unavailable it says so, and the
coordinate fields go on working.

Searches run in `wp-admin` and the block editor only, require the `edit_posts`
capability, and go through this plugin's own REST route. Results are cached for a day.
**No forecast passes through this route**, and the front-end script does not contain
it, so a visitor never loads or contacts it.

The service is [Photon](https://github.com/komoot/photon): open source, built on
OpenStreetMap data, and needing no API key. Results outside the United States are
discarded, since the NWS publishes no forecast for them, and populated places are
ranked above landmarks. Each search identifies the plugin, the project and your site:

<pre>User-Agent: SimpleWeatherBlock/0.1.0 (+https://github.com/jmbarne3/simple-weather-block; site: https://example.edu/)</pre>

Two filters adjust this. Add a contact address to that header:

<pre>add_filter( 'simple_weather_block_geocoder_user_agent', function ( $user_agent ) {
	return $user_agent . ' contact: webmaster@example.edu';
} );</pre>

Or send searches to your own Photon or Nominatim instance, which is also settable
under **Settings → Simple Weather Block → Location search endpoint**:

<pre>add_filter( 'simple_weather_block_geocoder_endpoint', function () {
	return 'https://photon.example.edu/api';
} );</pre>

## Frequently Asked Questions

### Does this need an API key?

No. The National Weather Service API is public and unauthenticated, and sends
`Access-Control-Allow-Origin: *`, so the browser can call it directly. There is
nothing to sign up for and nothing to store.

### Does it work outside the United States?

No. See Requirements above.

### Does it work with full-page caching?

Yes. The cached HTML contains only the block's configuration, never a temperature, so
a cached page is never a stale one.

### My block is not showing up. Why?

Most likely no default location is set, or the block is set to a specific location
whose coordinates are invalid or outside NWS coverage. A block with nothing to show
renders nothing at all rather than leaving a placeholder behind. Check
**Settings → Simple Weather Block**.

### Does the location search send my visitors' data anywhere?

No. It runs only in `wp-admin` and the block editor, needs the `edit_posts`
capability, and sends nothing but the place name you type. The front-end script does
not include it, so a visitor never loads or contacts it.

### Which icons are used?

[Weather Icons 2.0.10](https://erikflowers.github.io/weather-icons/) by Erik Flowers,
bundled with the plugin rather than loaded from a CDN. All 34 NWS condition codes are
mapped to day and night variants.

## Changelog

### 0.1.0

* Initial release.
* Weather block showing a Weather Icons glyph and a temperature, fetched client-side
  from the National Weather Service.
* Five layouts — inline, stacked, detailed, daily forecast and hourly forecast — each
  registered as a block variation and switchable from the sidebar.
* Per-field display toggles, filtered to what the chosen layout can render: icon,
  temperature, conditions text, location name, humidity, wind, chance of
  precipitation and dew point.
* Per-block location (site default, specific coordinates, or visitor geolocation),
  units, conditions period and icon color.
* Settings screen for the default location, icon color, units and cache lifetime.
* Browser-side caching with a configurable lifetime, request de-duplication and a
  long-lived cache for NWS grid lookups.
* Full typography, color, border, shadow, spacing and wide/full alignment block
  supports, inheriting the theme's fonts by default.
* Place search on the settings screen and in the block inspector: type a city, ZIP
  code or landmark and the coordinates fill themselves in. Backed by Photon, proxied
  and cached through WordPress, with the endpoint overridable for a self-hosted
  instance, and confirmed against the National Weather Service before it is accepted.
  Searches identify the plugin, the project and the calling site in the `User-Agent`,
  which a filter can extend with a contact address.

## Development

The plugin is built with [`@wordpress/scripts`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/).
The only custom build configuration is `webpack.config.js`, which adds the settings
screen as a second entry point; `wp-scripts` discovers the block's entries from
`block.json` on its own but would not otherwise see `src/settings/`.

```sh
npm install
npm start          # watch and rebuild
npm run build      # production build
npm run lint:js
npm run lint:css
npm run format
```

### Design notes

The user-facing documentation above says what the plugin does. This says why it does
it that way, because several of the decisions look arbitrary until you know what they
are avoiding.

**Forecasts are fetched in the browser for two reasons, and the second is the one that
matters on a busy site.** The obvious reason is caching: a server-side fetch has to be
stored in a transient, and a page cache in front of it then serves a temperature that
may be an hour stale. The less obvious reason is traffic shape. A server-side fetch
funnels every visitor's forecast through the site's single IP address, which is
precisely what the National Weather Service asks callers not to do — and the failure
mode is that the API starts refusing your server rather than any one visitor. Fetching
from each browser spreads the same number of requests across the same number of
addresses, so the load the NWS attributes to your site never concentrates. Anyone
tempted to "just proxy it through PHP for the caching" should weigh that second reason
before doing so.

**The place search is a deliberate exception to that rule, not an oversight.** The
concentration argument depends on a request happening per visitor and per pageview. A
place search happens when an administrator types a city name once while setting the
site up, so at that volume it does not apply — and running it server-side buys two
things a browser cannot provide. A `User-Agent` identifying the caller, which every
open geocoder asks for and `fetch()` flatly refuses to set. And a shared cache, so two
editors looking up the same city make one request between them rather than two.

**The `User-Agent` names the project as well as the site** because the situation the
header exists for is the one where traffic from this plugin *in aggregate* becomes a
problem, and the operator needs someone to talk to before they start blocking. A site
URL alone identifies which install called; it does not tell them what the software is
or who maintains it. Sending the site URL gives away nothing, incidentally — WordPress
core does the same on every outbound HTTP request it makes.

**The stylesheet ships structure and no chrome** — no fonts, borders, backgrounds or
shadows — because the block already supports border, background, shadow and padding
through core's own controls. Shipping a card style would mean every author who wanted
something else had to undo ours first.

**`wp_remote_get()` is used rather than `wp_safe_remote_get()`** for the geocoder. The
safe variant blocks loopback and private addresses, which would make a self-hosted
Photon on `localhost:2322` impossible — the most likely reason anyone overrides the
endpoint at all. The URL is administrator- or filter-controlled and validated for
scheme and host shape, and an administrator who can set it can already do worse.

### Project layout

```
simple-weather-block.php          Plugin header, constants, block and asset registration
includes/
  class-...-settings.php          Settings screen and option access
  class-...-layouts.php           Server-side layout registry
  class-...-geocoder.php          Place search, proxied and cached
src/weather/
  block.json                      Block metadata, attributes and supports
  index.js                        Registers the block and its variations
  edit.js                         Editor entry: fetches the preview, composes the panels
  view.js                         Front-end entry: finds placeholders, fetches, dispatches
  render.php                      Resolves configuration, dispatches to a partial
  layouts/                        One file per layout, plus the registry
  inspector/                      Sidebar panels
  components/                     Editor canvas previews and the place search
  hydrate/                        Front-end DOM writers
  partials/                       Server markup, one per layout family
  lib/nws.js                      National Weather Service API access
  lib/places.js                   Place search, via this plugin's REST route
  lib/cache.js                    Browser-side caching, with an in-memory fallback
  lib/periods.js                  Forecast periods into the shape the block uses
  lib/format.js                   Values into the text a visitor sees
  lib/describe.js                 Values into the text a visitor hears
  lib/icons.js                    NWS condition code to Weather Icons mapping
  lib/classes.js                  The class names all three runtimes agree on
  lib/geolocation.js  lib/defaults.js
  style.scss  editor.scss         Styles
src/settings/                     The place search on the settings screen
webpack.config.js                 Adds the settings entry to the wp-scripts build
assets/weather-icons/             Vendored Weather Icons font and CSS
utils/                            Release tooling
build/                            Generated; do not edit
```

Three runtimes render this block — PHP on the server, React in the editor, plain DOM
calls on the front end — and the directories are cut so that each one's share of a
given concern sits next to the others. The daily layout, for instance, is declared in
`layouts/daily.js`, previewed by `components/forecast-preview.js`, printed by
`partials/forecast.php` and filled in by `hydrate/forecast.js`.

### Adding a layout

Everything about a layout lives in `src/weather/layouts/<name>.js`: which endpoint it
reads, which fields it can render, how many periods it may show, and how it introduces
itself in the inserter. Add the file, add one line to `layouts/index.js`, and the
sidebar select, the inserter variation and the field toggles all follow.

Two things do not follow automatically. **`includes/class-simple-weather-block-layouts.php`
mirrors the structural half of those modules** — kind, fields and period range — because
PHP cannot read them, and the two have to be changed together. And a layout with a
genuinely new shape needs its own partial, preview and hydrator; the five that ship
reuse two of each, because a layout is a rearrangement far more often than it is new
markup.

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
header in `simple-weather-block.php`, so those are never entered twice.

### Releasing

One command updates the version everywhere it appears — `package.json`,
`package-lock.json`, the plugin header, the `SIMPLE_WEATHER_BLOCK_VERSION` constant and
`block.json` — and regenerates `readme.txt`:

```sh
npm run version:set -- 0.2.0     # or: patch | minor | major
npm run build                    # block.json is copied into build/, so rebuild after
```

The script warns if the new version has no entry under Changelog above. Add one before
tagging.

## Source code

Development happens at
[github.com/jmbarne3/simple-weather-block](https://github.com/jmbarne3/simple-weather-block).

The JavaScript and CSS in `build/` are compiled from the unminified sources in `src/`
using [`@wordpress/scripts`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/).
Those sources and the build configuration are both in that repository; `npm install`
followed by `npm run build` reproduces exactly what ships.

## Credits

Weather data from the [National Weather Service](https://www.weather.gov/documentation/services-web-api).

Icons from [Weather Icons](https://erikflowers.github.io/weather-icons/) by Erik
Flowers, licensed [SIL OFL 1.1](https://scripts.sil.org/OFL) (font) and
[MIT](https://opensource.org/licenses/mit-license.html) (CSS).
