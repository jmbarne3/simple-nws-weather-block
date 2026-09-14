# Weather Icons (vendored)

These files are copied verbatim from [Weather Icons](https://erikflowers.github.io/weather-icons/)
by Erik Flowers, at tag `2.0.10`.

They are vendored rather than installed through npm so that the font stays a
plain static asset: WordPress enqueues the stylesheet directly and no build step
touches it. Nothing here is generated, and nothing here should be edited. To
update, replace `css/` and `font/` from the upstream release and bump
`WEATHER_BLOCK_ICONS_VERSION` in `weather-block.php`.

## Licensing

- **Font** (`font/`) — [SIL OFL 1.1](https://scripts.sil.org/OFL)
- **CSS** (`css/`) — [MIT](https://opensource.org/licenses/mit-license.html)

Upstream: <https://github.com/erikflowers/weather-icons>
