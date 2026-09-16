<?php
/**
 * The place search REST route.
 *
 * @package SimpleNWSWeatherBlock
 */

/**
 * Place search: permissions, US-only results, caching and failure handling.
 *
 * Every outbound request is intercepted, so nothing here contacts Photon.
 */
class GeocoderTest extends WP_UnitTestCase {

	/**
	 * Requests the intercepted HTTP layer saw.
	 *
	 * @var array
	 */
	private $requests = array();

	/**
	 * Response the intercepted HTTP layer returns.
	 *
	 * @var array|WP_Error
	 */
	private $response;

	public function set_up() {
		parent::set_up();

		$this->requests = array();
		$this->response = $this->photon_response( array() );

		add_filter( 'pre_http_request', array( $this, 'intercept' ), 10, 3 );
	}

	public function tear_down() {
		remove_filter( 'pre_http_request', array( $this, 'intercept' ), 10 );
		delete_option( Simple_NWS_Weather_Block_Settings::OPTION );
		parent::tear_down();
	}

	/**
	 * Stands in for the network.
	 *
	 * @param false|array $preempt Whether to short-circuit.
	 * @param array       $args    Request arguments.
	 * @param string      $url     Request URL.
	 * @return array|WP_Error
	 */
	public function intercept( $preempt, $args, $url ) {
		$this->requests[] = array(
			'url'  => $url,
			'args' => $args,
		);

		return $this->response;
	}

	/**
	 * A Photon-shaped HTTP response.
	 *
	 * @param array $features GeoJSON features.
	 * @param int   $status   HTTP status.
	 * @return array
	 */
	private function photon_response( array $features, $status = 200 ) {
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode( array( 'features' => $features ) ),
			'response' => array(
				'code'    => $status,
				'message' => '',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	}

	/**
	 * One Photon feature.
	 *
	 * @param array $properties Feature properties.
	 * @param float $lon        Longitude.
	 * @param float $lat        Latitude.
	 * @return array
	 */
	private function feature( array $properties, $lon, $lat ) {
		return array(
			'geometry'   => array( 'coordinates' => array( $lon, $lat ) ),
			'properties' => $properties,
		);
	}

	private function search( $query, $role = 'editor' ) {
		wp_set_current_user( self::factory()->user->create( array( 'role' => $role ) ) );

		$request = new WP_REST_Request( 'GET', '/simple-nws-weather-block/v1/places' );

		if ( null !== $query ) {
			$request->set_param( 'q', $query );
		}

		return rest_get_server()->dispatch( $request );
	}

	public function test_subscribers_cannot_search() {
		$this->assertSame( 403, $this->search( 'Orlando', 'subscriber' )->get_status() );
		$this->assertSame( array(), $this->requests );
	}

	public function test_query_is_required() {
		$this->assertSame( 400, $this->search( null )->get_status() );
	}

	public function test_results_outside_the_united_states_are_dropped() {
		$this->response = $this->photon_response(
			array(
				$this->feature( array( 'name' => 'Orlando', 'countrycode' => 'US', 'state' => 'Florida', 'osm_key' => 'place' ), -81.37923456, 28.53833456 ),
				$this->feature( array( 'name' => 'Orléans', 'countrycode' => 'FR', 'osm_key' => 'place' ), 1.909, 47.902 ),
				$this->feature( array( 'name' => 'San Juan', 'countrycode' => 'US', 'state' => 'Puerto Rico', 'osm_key' => 'place' ), -66.106, 18.466 ),
			)
		);

		$response = $this->search( 'Orl' );
		$results  = $response->get_data()['results'];

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( array( 'Orlando', 'San Juan' ), wp_list_pluck( $results, 'name' ) );
		$this->assertSame( 28.5383, $results[0]['latitude'] );
		$this->assertSame( -81.3792, $results[0]['longitude'] );
	}

	public function test_populated_places_rank_above_landmarks() {
		$this->response = $this->photon_response(
			array(
				$this->feature( array( 'name' => 'Orlando International Airport', 'countrycode' => 'US', 'osm_key' => 'aeroway' ), -81.3, 28.4 ),
				$this->feature( array( 'name' => 'Orlando', 'countrycode' => 'US', 'osm_key' => 'place' ), -81.37, 28.53 ),
			)
		);

		$this->assertSame( 'Orlando', $this->search( 'Orlando' )->get_data()['results'][0]['name'] );
	}

	public function test_results_are_cached() {
		$this->search( 'Tampa' );
		$this->search( 'tampa' );

		$this->assertCount( 1, $this->requests );
	}

	public function test_request_identifies_the_plugin() {
		$this->search( 'Miami' );

		$user_agent = $this->requests[0]['args']['headers']['User-Agent'];

		$this->assertStringStartsWith( 'SimpleNWSWeatherBlock/' . SIMPLE_NWS_WEATHER_BLOCK_VERSION, $user_agent );
		$this->assertStringContainsString( 'github.com/jmbarne3/simple-nws-weather-block', $user_agent );
	}

	public function test_unreachable_service_is_a_503() {
		$this->response = new WP_Error( 'http_request_failed', 'timeout' );

		$this->assertSame( 503, $this->search( 'Denver' )->get_status() );
	}

	public function test_service_error_is_a_502() {
		$this->response = $this->photon_response( array(), 500 );

		$this->assertSame( 502, $this->search( 'Boise' )->get_status() );
	}

	public function test_configured_endpoint_is_used() {
		update_option( Simple_NWS_Weather_Block_Settings::OPTION, array( 'geocoder_endpoint' => 'http://localhost:2322/api' ) );

		$this->search( 'Austin' );

		$this->assertStringStartsWith( 'http://localhost:2322/api?', $this->requests[0]['url'] );
	}

	public function test_malformed_endpoint_falls_back_to_default() {
		$this->assertSame( '', Simple_NWS_Weather_Block_Geocoder::sanitize_endpoint( 'not a url' ) );
		$this->assertSame( '', Simple_NWS_Weather_Block_Geocoder::sanitize_endpoint( 'javascript:alert(1)' ) );
	}
}
