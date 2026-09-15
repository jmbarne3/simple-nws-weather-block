=== Simple Weather Block ===
Contributors: jmbarne3
Tags: block, weather, forecast, temperature, nws
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Shows current conditions and short-range forecasts from the National Weather Service, fetched in the visitor’s browser.

== Description ==

Most weather plugins are a server-side affair: WordPress calls a third-party API on
page load, caches the response in a transient, and you hope the remote service stays
up. This one inverts that. **Nothing about the weather is fetched on the server**,
which means the block costs your site no request time, survives full-page caching
without going stale, and has no API key to rotate or leak.

There is a second reason, and on a busy site it is the more important one. A
server-side fetch funnels every visitor's forecast through the site's single IP
address, which is precisely the traffic shape the National Weather Service asks
callers to avoid — and the failure mode is that the API starts refusing your server
rather than any one visitor. Fetching from the browser spreads the same number of
forecasts across the same number of addresses, so the load the NWS sees from your
site never concentrates.

So the block renders a small placeholder carrying its configuration, and a script in
the visitor's browser calls the National Weather Service directly and fills it in. The
NWS API is public, free, and sends permissive CORS headers, so no credentials or
proxying are involved. Each visitor's browser caches the result in local storage for
an hour by default, so moving between pages costs nothing further.

The icon comes from Erik Flowers' [Weather Icons](https://erikflowers.github.io/weather-icons/),
a webfont rather than a set of images, which is why it takes a color and scales with
your type instead of sitting in the page as a fixed-size picture.

= Layouts =

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
  visitor's — so a campus in Florida reads the same whether the page is opened from
  Orlando or from Tokyo.

All five draw on the same two National Weather Service endpoints, so a seven-day
strip costs a visitor no more requests than a single temperature does.

Everything visible is configurable, and nothing is announced to screen readers as a
glyph and a bare number. A single reading becomes a sentence — "Current weather in
Orlando: Partly Cloudy, 78 degrees Fahrenheit" — and a forecast becomes a list with
one sentence per period.

== Requirements ==

The National Weather Service covers **the United States and its territories only**.
Outside that coverage area the API returns no forecast, and the block hides itself
rather than leaving a broken placeholder on the page. If you need international
coverage, this is the wrong plugin.

You will also need WordPress 6.8 or newer and PHP 7.4 or newer.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/simple-weather-block`, or install it through the
   Plugins screen.
1. Activate it through the Plugins screen.
1. Visit **Settings → Simple Weather Block** and set a default location. Until you do, blocks
   set to "Site default" will not render.
1. Add the **Weather** block to a post, page or template, or insert one of its
   layouts directly: **Weather (stacked)**, **Weather (detailed)**, **Daily
   forecast** or **Hourly forecast**.

== Settings ==

Site-wide defaults live at **Settings → Simple Weather Block**. Every one of them is a
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

== Block options ==

Each block's sidebar carries its own overrides. Which controls appear depends on the
layout: a toggle only shows up when the chosen layout has somewhere to put the thing
it switches on, so a daily forecast is not offered a dew point and an inline block is
not offered wind.

- **Layout.** Any of the five above. Switching keeps the location, units and color.
- **Days shown / Hours shown.** Two to seven days, or two to twelve hours. Forecast
  layouts only.
- **Location source.** *Site default* uses the settings above. *Specific location*
  takes its own coordinates, for a campus page or a regional landing page.
  *Visitor's location* asks the browser for permission on page load and quietly falls
  back to the site default if it is refused.
- **Conditions.** *Right now* reads the current hour from the hourly forecast.
  *Today's forecast* reads the current daily period, which is the high or low
  depending on the time of day. Single-reading layouts only.
- **Units.** Fahrenheit, Celsius, or whatever the site default is.
- **Fields.** Icon, temperature, conditions text, location name, humidity, wind,
  chance of precipitation and dew point, each its own toggle. Turning off every field
  a layout can show hides the block.
- **Show unit letter.** Renders `72°F` rather than `72°`.
- **Icon color.** Accepts a color from the theme palette or a custom one.

== Theming ==

= Typography =

The block deliberately **declares no font of its own**. The temperature inherits
whatever the theme sets on its surroundings, so in a well-built block theme it already
matches the text around it without configuration.

Where you want to be explicit, the block supports the full typography panel — size,
family, weight, style, line height, letter spacing and text transform — so any font
registered in the theme's `theme.json` is selectable per block. The icon is sized in
`em`, so it scales with whatever type it lands in rather than fighting it.

To set a default for every Weather block at once, target it from `theme.json`:

<pre>{
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
}</pre>

= Icon color =

The icon's color resolves in three steps: the block's own setting, then the site
default, then `currentColor`. It is applied through a custom property, so a stylesheet
can override it without fighting specificity:

<pre>.wp-block-simple-weather-block-weather {
	--wb-icon-color: #ffc904;
}</pre>

= Structure and chrome =

The stylesheet ships **structure and nothing else** — how the pieces sit next to each
other, and not one font, border or background. That is deliberate. A card is something
you build out of the block's own border, background, shadow and padding controls,
rather than something we pick for you and you then have to undo.

Three custom properties are the intended adjustment points:

- `--wb-icon-color` — the condition glyph's color. Falls back to the surrounding text.
- `--wb-weather-gap` — space between the pieces of a single reading. Defaults to
  `0.3em`, and the wider gaps in a forecast strip are multiples of it.
- `--wb-period-width` — how narrow a forecast column may get before the strip wraps
  onto another row. Defaults to `4.5em`, which is how a seven-day strip becomes four
  and three on a phone without a media query deciding where the break goes.

= Classes =

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

== Caching ==

Forecasts are cached in each visitor's browser in `localStorage`, keyed by rounded
coordinates, endpoint and units. Two details are worth knowing.

Expiry is checked against the **current** setting rather than one frozen into each
cached entry, so shortening the cache lifetime takes effect on the next page load
instead of waiting for existing entries to age out. And the coordinate-to-grid lookup
that the NWS requires before a forecast is cached separately for thirty days, because
that mapping never changes — so a warm visitor loading a page makes no requests at
all, and a cold one makes two.

Several Weather blocks sharing a location on one page collapse into a single request
between them, and a daily and an hourly block in the same place share the grid lookup
even though they read different endpoints. If local storage is unavailable — private
browsing, blocked site data — the block falls back to an in-memory cache for the life
of the page rather than failing.

== Frequently Asked Questions ==

= Does this need an API key? =

No. The National Weather Service API is public and unauthenticated, and sends
`Access-Control-Allow-Origin: *`, so the browser can call it directly. There is
nothing to sign up for and nothing to store.

= Does it work outside the United States? =

No. See Requirements above.

= Does it work with full-page caching? =

Yes, and that is the point of the design. The HTML that gets cached contains only the
block's configuration, never a temperature, so a cached page is never a stale one.

= My block is not showing up. Why? =

Most likely no default location is set, or the block is set to a specific location
whose coordinates are invalid or outside NWS coverage. A block with nothing to show
renders nothing at all rather than leaving a placeholder behind. Check
**Settings → Simple Weather Block**.

= Which icons are used? =

[Weather Icons 2.0.10](https://erikflowers.github.io/weather-icons/) by Erik Flowers,
bundled with the plugin rather than loaded from a CDN. All 34 NWS condition codes are
mapped to day and night variants.

== Changelog ==

= 0.1.0 =

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

== Credits ==

Weather data from the [National Weather Service](https://www.weather.gov/documentation/services-web-api).

Icons from [Weather Icons](https://erikflowers.github.io/weather-icons/) by Erik
Flowers, licensed [SIL OFL 1.1](https://scripts.sil.org/OFL) (font) and
[MIT](https://opensource.org/licenses/mit-license.html) (CSS).
