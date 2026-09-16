<?php
/**
 * Turning a place name into coordinates.
 *
 * @package SimpleNWSWeatherBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A place search, proxied through WordPress.
 *
 * Note that this is the one thing the plugin does *not* do in the visitor's
 * browser, and the reason is worth stating. Forecasts are fetched client-side
 * because they are per-visitor and per-pageview, and routing them through the
 * server would concentrate every one of them onto a single IP address. A place
 * search is the opposite: an administrator types a city name once while setting
 * the site up. Going through the server costs nothing at that volume and buys
 * two things a browser cannot provide -- a `User-Agent` identifying the site,
 * which every open geocoder asks for and `fetch()` refuses to set, and a shared
 * cache so that two editors looking up the same city make one request between
 * them.
 *
 * The default service is the public Photon instance: open source, built on
 * OpenStreetMap data, no API key, and no policy against being called from
 * software distributed to many sites. It offers no uptime guarantee, so a
 * failed lookup degrades to the coordinate fields rather than blocking anyone.
 *
 * @see https://photon.komoot.io/
 * @see https://github.com/komoot/photon
 */
class Simple_NWS_Weather_Block_Geocoder {

	/**
	 * REST namespace the search is exposed under.
	 *
	 * @var string
	 */
	const REST_NAMESPACE = 'simple-nws-weather-block/v1';

	/**
	 * Photon-compatible endpoint used when nothing else is configured.
	 *
	 * @var string
	 */
	const DEFAULT_ENDPOINT = 'https://photon.komoot.io/api';

	/**
	 * Prefix for the transients holding cached results.
	 *
	 * @var string
	 */
	const CACHE_PREFIX = 'swb_geocode_';

	/**
	 * How many results to offer.
	 *
	 * @var int
	 */
	const LIMIT = 8;

	/**
	 * Hooks the REST route into WordPress.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * The endpoint searches are sent to.
	 *
	 * Resolves in three steps: the filter, then the setting, then the bundled
	 * default. A site running its own Photon or Nominatim points at it here
	 * rather than needing a different code path.
	 *
	 * @return string An absolute http or https URL.
	 */
	public static function endpoint() {
		$configured = self::sanitize_endpoint( Simple_NWS_Weather_Block_Settings::get( 'geocoder_endpoint' ) );
		$endpoint   = '' !== $configured ? $configured : self::DEFAULT_ENDPOINT;

		/**
		 * Filters the Photon-compatible endpoint place searches are sent to.
		 *
		 * @param string $endpoint Absolute URL, without a query string.
		 */
		$endpoint = (string) apply_filters( 'simple_nws_weather_block_geocoder_endpoint', $endpoint );

		// A misconfigured endpoint falls back rather than issuing an odd request.
		$endpoint = self::sanitize_endpoint( $endpoint );

		return '' !== $endpoint ? $endpoint : self::DEFAULT_ENDPOINT;
	}

	/**
	 * Validates an endpoint URL, or rejects it.
	 *
	 * `esc_url_raw()` alone is too forgiving here: it turns "not a url" into
	 * `http://not%20a%20url`, which has a scheme and would then be requested on
	 * every search. So the host is checked too. A port is allowed and loopback
	 * is not blocked, because a self-hosted Photon on `localhost:2322` is the
	 * most likely reason anyone sets this at all.
	 *
	 * @param mixed $value Raw value.
	 * @return string A usable URL, or an empty string.
	 */
	public static function sanitize_endpoint( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return '';
		}

		$parts = wp_parse_url( $value );

		if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return '';
		}

		if ( ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ) {
			return '';
		}

		// Letters, digits, dots and hyphens; anything else is not a host name.
		if ( ! preg_match( '/^[A-Za-z0-9.-]+$/', $parts['host'] ) ) {
			return '';
		}

		return esc_url_raw( $value, array( 'http', 'https' ) );
	}

	/**
	 * Registers the search route.
	 *
	 * Readable by anyone who can edit content, because the block inspector
	 * offers the same search and an author needs it there.
	 *
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/places',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'handle_request' ),
				'permission_callback' => static function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'q' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Answers a search request.
	 *
	 * @param WP_REST_Request $request The request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_request( $request ) {
		$results = self::search( (string) $request->get_param( 'q' ) );

		if ( is_wp_error( $results ) ) {
			return $results;
		}

		return rest_ensure_response( array( 'results' => $results ) );
	}

	/**
	 * Searches for a place.
	 *
	 * @param string $query What the user typed.
	 * @return array|WP_Error Matching places, or an error when the service is unreachable.
	 */
	public static function search( $query ) {
		$query = trim( $query );

		// Anything shorter matches most of the country and helps nobody.
		if ( mb_strlen( $query ) < 2 ) {
			return array();
		}

		$endpoint  = self::endpoint();
		$cache_key = self::CACHE_PREFIX . md5( $endpoint . '|' . mb_strtolower( $query ) );
		$cached    = get_transient( $cache_key );

		if ( is_array( $cached ) ) {
			return $cached;
		}

		$response = wp_remote_get(
			add_query_arg(
				array(
					'q'     => $query,
					'limit' => 20,
					'lang'  => 'en',
				),
				$endpoint
			),
			array(
				'timeout' => 8,
				'headers' => array(
					'Accept'     => 'application/json',
					'User-Agent' => self::user_agent(),
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'simple_nws_weather_block_geocoder_unavailable',
				__( 'The location search could not be reached. Enter coordinates manually, or try again shortly.', 'simple-nws-weather-block' ),
				array( 'status' => 503 )
			);
		}

		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return new WP_Error(
				'simple_nws_weather_block_geocoder_failed',
				__( 'The location search returned an error. Enter coordinates manually, or try again shortly.', 'simple-nws-weather-block' ),
				array( 'status' => 502 )
			);
		}

		$body     = json_decode( wp_remote_retrieve_body( $response ), true );
		$features = isset( $body['features'] ) && is_array( $body['features'] ) ? $body['features'] : array();
		$results  = self::normalise( $features );

		/*
		 * An empty result is cached too. A misspelling asked for twice should
		 * not cost the service two requests.
		 */
		set_transient( $cache_key, $results, DAY_IN_SECONDS );

		return $results;
	}

	/**
	 * How the plugin introduces itself to the geocoder.
	 *
	 * Every open geocoder asks callers to identify themselves, and the reason is
	 * practical: when traffic from some piece of software becomes a problem,
	 * they want somebody to talk to before they start blocking. So the string
	 * names three things -- what the software is, where to find it, and which
	 * site made this particular call. A browser cannot set this header at all,
	 * which is half the reason the search runs on the server.
	 *
	 * Sending the site URL is what WordPress core itself does on every outbound
	 * HTTP request, so it gives away nothing a geocoder would not already see.
	 *
	 * @return string e.g. `SimpleNWSWeatherBlock/0.1.0 (+https://github.com/...; site: https://example.edu/)`.
	 */
	public static function user_agent() {
		$user_agent = sprintf(
			'SimpleNWSWeatherBlock/%s (+%s; site: %s)',
			SIMPLE_NWS_WEATHER_BLOCK_VERSION,
			SIMPLE_NWS_WEATHER_BLOCK_URI,
			home_url( '/' )
		);

		/**
		 * Filters the `User-Agent` sent with a place search.
		 *
		 * The place to add a contact address if you run enough sites to want
		 * the geocoder's operator to reach you directly rather than through the
		 * project.
		 *
		 * @param string $user_agent The header value.
		 */
		$user_agent = (string) apply_filters( 'simple_nws_weather_block_geocoder_user_agent', $user_agent );

		// A header cannot carry a line break; an empty one tells them nothing.
		$user_agent = trim( preg_replace( '/\s+/', ' ', $user_agent ) );

		return '' !== $user_agent ? $user_agent : 'SimpleNWSWeatherBlock/' . SIMPLE_NWS_WEATHER_BLOCK_VERSION;
	}

	/**
	 * Converts Photon features into the shape the editor uses.
	 *
	 * Three things happen here. Anything outside the United States is dropped,
	 * because the National Weather Service publishes no forecast for it and an
	 * unusable result is worse than no result. Populated places are ranked above
	 * airports, theme parks and buildings, which OpenStreetMap returns freely
	 * for a query like "Orlando". And duplicates are collapsed, because the same
	 * town frequently appears two or three times under different OSM objects.
	 *
	 * @param array $features Raw `features` array from the response.
	 * @return array Normalised results, best first.
	 */
	protected static function normalise( $features ) {
		$places = array();
		$others = array();
		$seen   = array();

		foreach ( $features as $feature ) {
			$properties  = isset( $feature['properties'] ) ? $feature['properties'] : array();
			$coordinates = isset( $feature['geometry']['coordinates'] ) ? $feature['geometry']['coordinates'] : array();

			// US territories carry the US country code, so this keeps them.
			if ( 'US' !== ( isset( $properties['countrycode'] ) ? $properties['countrycode'] : '' ) ) {
				continue;
			}

			if ( ! isset( $coordinates[0], $coordinates[1] ) || ! is_numeric( $coordinates[0] ) || ! is_numeric( $coordinates[1] ) ) {
				continue;
			}

			$name = isset( $properties['name'] ) ? (string) $properties['name'] : '';

			if ( '' === $name && isset( $properties['postcode'] ) ) {
				$name = (string) $properties['postcode'];
			}

			if ( '' === $name ) {
				continue;
			}

			// The town a postcode or a landmark sits in, when it adds something.
			$detail = array();
			$city   = isset( $properties['city'] ) ? (string) $properties['city'] : '';
			$state  = isset( $properties['state'] ) ? (string) $properties['state'] : '';

			if ( '' !== $city && $city !== $name ) {
				$detail[] = $city;
			}

			if ( '' !== $state ) {
				$detail[] = $state;
			}

			/*
			 * `name` identifies the result in a list; `label` is the name a
			 * person would give the place. They differ for a postcode, where
			 * the list has to show "32816" but nobody wants a block announcing
			 * "Current weather in 32816".
			 */
			$is_postcode = 'postcode' === ( isset( $properties['osm_value'] ) ? $properties['osm_value'] : '' );

			$result = array(
				'name'      => $name,
				'label'     => ( $is_postcode && '' !== $city ) ? $city : $name,
				'detail'    => implode( ', ', $detail ),
				'latitude'  => round( (float) $coordinates[1], 4 ),
				'longitude' => round( (float) $coordinates[0], 4 ),
			);

			$key = mb_strtolower( $result['name'] . '|' . $result['detail'] );

			if ( isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;

			if ( 'place' === ( isset( $properties['osm_key'] ) ? $properties['osm_key'] : '' ) ) {
				$places[] = $result;
			} else {
				$others[] = $result;
			}
		}

		return array_slice( array_merge( $places, $others ), 0, self::LIMIT );
	}
}
