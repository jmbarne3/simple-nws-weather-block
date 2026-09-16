<?php
/**
 * Site-wide options for the Weather block.
 *
 * @package SimpleNWSWeatherBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers and renders the Settings -> Simple NWS Weather Block screen and provides
 * typed access to the stored options.
 */
class Simple_NWS_Weather_Block_Settings {

	/**
	 * Name of the single option array all settings are stored in.
	 *
	 * @var string
	 */
	const OPTION = 'simple_nws_weather_block_settings';

	/**
	 * Settings API group.
	 *
	 * @var string
	 */
	const GROUP = 'simple_nws_weather_block_settings';

	/**
	 * Settings page slug.
	 *
	 * @var string
	 */
	const PAGE = 'simple-nws-weather-block';

	/**
	 * Hooks the settings screen into the admin.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_settings_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_filter(
			'plugin_action_links_' . plugin_basename( SIMPLE_NWS_WEATHER_BLOCK_FILE ),
			array( __CLASS__, 'add_action_link' )
		);
	}

	/**
	 * Default values for every stored option.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'cache_minutes'     => 60,
			'geocoder_endpoint' => '',
			'icon_color'        => '',
			'latitude'          => '',
			'longitude'         => '',
			'location_label'    => '',
			'units'             => 'us',
		);
	}

	/**
	 * Returns all settings merged over the defaults.
	 *
	 * @return array
	 */
	public static function all() {
		$stored = get_option( self::OPTION, array() );

		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return wp_parse_args( $stored, self::defaults() );
	}

	/**
	 * Returns a single setting.
	 *
	 * @param string $key Setting key.
	 * @return mixed Setting value, or null when the key is unknown.
	 */
	public static function get( $key ) {
		$settings = self::all();

		return isset( $settings[ $key ] ) ? $settings[ $key ] : null;
	}

	/**
	 * Returns the settings in the shape the JavaScript expects.
	 *
	 * Used both by `render.php` (to seed each block's data attributes) and by
	 * the editor (as the fallback for blocks with no overrides of their own).
	 *
	 * @return array
	 */
	public static function frontend_defaults() {
		$settings = self::all();

		return array(
			'latitude'      => $settings['latitude'],
			'longitude'     => $settings['longitude'],
			'locationLabel' => $settings['location_label'],
			'iconColor'     => $settings['icon_color'],
			'cacheMinutes'  => (int) $settings['cache_minutes'],
			'units'         => $settings['units'],
		);
	}

	/**
	 * Adds a "Settings" link to the plugin's row on the Plugins screen.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public static function add_action_link( $links ) {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );

		array_unshift(
			$links,
			sprintf( '<a href="%s">%s</a>', esc_url( $url ), esc_html__( 'Settings', 'simple-nws-weather-block' ) )
		);

		return $links;
	}

	/**
	 * Adds the settings page under the Settings menu.
	 *
	 * @return void
	 */
	public static function add_settings_page() {
		$hook = add_options_page(
			__( 'Simple NWS Weather Block', 'simple-nws-weather-block' ),
			__( 'Simple NWS Weather Block', 'simple-nws-weather-block' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render_settings_page' )
		);

		if ( $hook ) {
			add_action( 'admin_print_scripts-' . $hook, array( __CLASS__, 'enqueue_color_picker' ) );
		}
	}

	/**
	 * Loads the core colour picker on the settings screen only.
	 *
	 * @return void
	 */
	public static function enqueue_color_picker() {
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_script( 'wp-color-picker' );
		wp_add_inline_script(
			'wp-color-picker',
			'jQuery( function ( $ ) { $( ".simple-nws-weather-block-color-field" ).wpColorPicker(); } );'
		);

		self::enqueue_location_search();
	}

	/**
	 * Enqueues the location search built from `src/settings/`.
	 *
	 * Depends on `wp-api-fetch`, which WordPress configures with the REST root
	 * and a nonce of its own accord, so nothing has to be passed through to the
	 * script. If the build is missing the screen simply renders without it.
	 *
	 * @return void
	 */
	protected static function enqueue_location_search() {
		$asset_file = SIMPLE_NWS_WEATHER_BLOCK_DIR . 'build/settings/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'simple-nws-weather-block-settings',
			SIMPLE_NWS_WEATHER_BLOCK_URL . 'build/settings/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_set_script_translations( 'simple-nws-weather-block-settings', 'simple-nws-weather-block' );

		wp_enqueue_style( 'wp-components' );

		/*
		 * Keeps the search the same width as the .regular-text inputs it fills
		 * in, so the Settings API table does not end up with one row spanning
		 * the whole screen.
		 */
		wp_add_inline_style(
			'wp-components',
			'.simple-nws-weather-block-location-search{max-width:25em}'
			. '.simple-nws-weather-block-location-search .components-notice{margin:8px 0 0}'
		);
	}

	/**
	 * Registers the option, its sections and its fields.
	 *
	 * @return void
	 */
	public static function register_settings() {
		register_setting(
			self::GROUP,
			self::OPTION,
			array(
				'type'              => 'object',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
			)
		);

		add_settings_section(
			'simple_nws_weather_block_appearance',
			__( 'Appearance', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_appearance_section' ),
			self::PAGE
		);

		add_settings_field(
			'icon_color',
			__( 'Default icon color', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_icon_color_field' ),
			self::PAGE,
			'simple_nws_weather_block_appearance'
		);

		add_settings_section(
			'simple_nws_weather_block_location',
			__( 'Default location', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_location_section' ),
			self::PAGE
		);

		add_settings_field(
			'location_search',
			__( 'Find a location', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_location_search_field' ),
			self::PAGE,
			'simple_nws_weather_block_location'
		);

		add_settings_field(
			'latitude',
			__( 'Latitude', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_latitude_field' ),
			self::PAGE,
			'simple_nws_weather_block_location'
		);

		add_settings_field(
			'longitude',
			__( 'Longitude', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_longitude_field' ),
			self::PAGE,
			'simple_nws_weather_block_location'
		);

		add_settings_field(
			'location_label',
			__( 'Location label', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_location_label_field' ),
			self::PAGE,
			'simple_nws_weather_block_location'
		);

		add_settings_field(
			'units',
			__( 'Units', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_units_field' ),
			self::PAGE,
			'simple_nws_weather_block_location'
		);

		add_settings_section(
			'simple_nws_weather_block_data',
			__( 'Data and caching', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_data_section' ),
			self::PAGE
		);

		add_settings_field(
			'cache_minutes',
			__( 'Cache lifetime', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_cache_minutes_field' ),
			self::PAGE,
			'simple_nws_weather_block_data'
		);

		add_settings_field(
			'geocoder_endpoint',
			__( 'Location search endpoint', 'simple-nws-weather-block' ),
			array( __CLASS__, 'render_geocoder_endpoint_field' ),
			self::PAGE,
			'simple_nws_weather_block_data'
		);
	}

	/**
	 * Validates and normalises submitted settings.
	 *
	 * @param mixed $input Raw submitted values.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$defaults = self::defaults();
		$output   = $defaults;

		if ( ! is_array( $input ) ) {
			return $output;
		}

		// Cache lifetime, in minutes. Zero disables caching; one week is the ceiling.
		if ( isset( $input['cache_minutes'] ) && '' !== $input['cache_minutes'] ) {
			$output['cache_minutes'] = min( 10080, max( 0, (int) $input['cache_minutes'] ) );
		}

		/*
		 * Only hex colours are accepted. The value ends up inside a `style`
		 * attribute, so anything sanitize_hex_color() rejects is discarded
		 * rather than escaped, which keeps arbitrary CSS out of the markup.
		 */
		if ( isset( $input['icon_color'] ) ) {
			$color = sanitize_hex_color( trim( (string) $input['icon_color'] ) );

			$output['icon_color'] = $color ? $color : '';
		}

		$output['latitude']  = self::sanitize_coordinate( isset( $input['latitude'] ) ? $input['latitude'] : '', 90 );
		$output['longitude'] = self::sanitize_coordinate( isset( $input['longitude'] ) ? $input['longitude'] : '', 180 );

		if ( isset( $input['location_label'] ) ) {
			$output['location_label'] = sanitize_text_field( $input['location_label'] );
		}

		if ( isset( $input['units'] ) && in_array( $input['units'], array( 'us', 'si' ), true ) ) {
			$output['units'] = $input['units'];
		}

		/*
		 * A self-hosted geocoder, for a site that would rather not call a public
		 * instance. Anything that is not an http or https URL is discarded, so a
		 * typo falls back to the default rather than breaking the search.
		 */
		if ( isset( $input['geocoder_endpoint'] ) ) {
			$output['geocoder_endpoint'] = Simple_NWS_Weather_Block_Geocoder::sanitize_endpoint( $input['geocoder_endpoint'] );
		}

		// A location is only usable when both halves of the pair are present.
		if ( '' === $output['latitude'] || '' === $output['longitude'] ) {
			$output['latitude']  = '';
			$output['longitude'] = '';
		}

		return $output;
	}

	/**
	 * Validates a colour for use in an inline style attribute.
	 *
	 * Accepts a hex colour, or a WordPress preset custom property such as
	 * `var(--wp--preset--color--primary)` so a colour chosen from the theme's
	 * palette survives. Anything else is discarded rather than escaped, which
	 * keeps arbitrary CSS out of the `style` attribute.
	 *
	 * @param mixed $value Raw colour value.
	 * @return string A safe colour, or an empty string.
	 */
	public static function sanitize_color( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return '';
		}

		$hex = sanitize_hex_color( $value );

		if ( $hex ) {
			return $hex;
		}

		if ( preg_match( '/^var\(\s*--wp--preset--color--[a-z0-9-]+\s*\)$/i', $value ) ) {
			return $value;
		}

		return '';
	}

	/**
	 * Validates a single latitude or longitude value.
	 *
	 * NWS asks that coordinates be sent with no more than four decimal places,
	 * so values are rounded here rather than in the browser.
	 *
	 * @param mixed $value Raw coordinate.
	 * @param int   $limit Maximum absolute value (90 for latitude, 180 for longitude).
	 * @return string Normalised coordinate, or an empty string when invalid.
	 */
	public static function sanitize_coordinate( $value, $limit ) {
		$value = trim( (string) $value );

		if ( '' === $value || ! is_numeric( $value ) ) {
			return '';
		}

		$number = (float) $value;

		if ( abs( $number ) > $limit ) {
			return '';
		}

		return (string) round( $number, 4 );
	}

	/**
	 * Renders the Appearance section description.
	 *
	 * @return void
	 */
	public static function render_appearance_section() {
		echo '<p>' . esc_html__( 'Applies to every Weather block that has not set its own color. Individual blocks can override this in the block sidebar.', 'simple-nws-weather-block' ) . '</p>';
	}

	/**
	 * Renders the Default location section description.
	 *
	 * @return void
	 */
	public static function render_location_section() {
		echo '<p>' . esc_html__( 'The National Weather Service covers the United States and its territories only, so this must be a location inside that coverage area. Blocks fall back to it unless they specify their own.', 'simple-nws-weather-block' ) . '</p>';
	}

	/**
	 * Renders the Data and caching section description.
	 *
	 * @return void
	 */
	public static function render_data_section() {
		echo '<p>' . wp_kses_post(
			sprintf(
				/* translators: %s: link to the NWS API documentation. */
				__( 'Forecasts are requested by the visitor\'s browser directly from the <a href="%s" target="_blank" rel="noopener noreferrer">National Weather Service API</a> and cached in that browser\'s local storage. The API is free and requires no key.', 'simple-nws-weather-block' ),
				'https://www.weather.gov/documentation/services-web-api'
			)
		) . '</p>';
	}

	/**
	 * Renders the icon colour field.
	 *
	 * @return void
	 */
	public static function render_icon_color_field() {
		$value = self::get( 'icon_color' );
		?>
		<input
			type="text"
			class="simple-nws-weather-block-color-field"
			id="simple_nws_weather_block_icon_color"
			name="<?php echo esc_attr( self::OPTION . '[icon_color]' ); ?>"
			value="<?php echo esc_attr( $value ); ?>"
			data-default-color=""
		/>
		<p class="description">
			<?php esc_html_e( 'Leave empty to inherit the surrounding text color from the theme.', 'simple-nws-weather-block' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the latitude field.
	 *
	 * @return void
	 */
	public static function render_location_search_field() {
		/*
		 * Only a mount point. `src/settings/` renders the search into it and
		 * writes whatever is chosen into the coordinate fields below. If that
		 * script fails to load, or the geocoder is unreachable, nothing here
		 * breaks -- the coordinate fields are still the thing being saved.
		 */
		?>
		<div id="simple-nws-weather-block-location-search"></div>
		<noscript>
			<p class="description">
				<?php esc_html_e( 'Searching for a location needs JavaScript. Enter coordinates below instead.', 'simple-nws-weather-block' ); ?>
			</p>
		</noscript>
		<?php
	}

	/**
	 * Renders the geocoder endpoint field.
	 *
	 * @return void
	 */
	public static function render_geocoder_endpoint_field() {
		?>
		<input
			type="url"
			class="regular-text code"
			id="simple_nws_weather_block_geocoder_endpoint"
			name="<?php echo esc_attr( self::OPTION . '[geocoder_endpoint]' ); ?>"
			value="<?php echo esc_attr( self::get( 'geocoder_endpoint' ) ); ?>"
			placeholder="<?php echo esc_attr( Simple_NWS_Weather_Block_Geocoder::DEFAULT_ENDPOINT ); ?>"
		/>
		<p class="description">
			<?php
			printf(
				/* translators: 1: the default endpoint URL, 2: opening link tag, 3: closing link tag. */
				esc_html__( 'Leave empty to use %1$s. Set this to your own %2$sPhoton%3$s or Nominatim instance if you would rather not call a public one. Only affects the search on this screen and in the editor; forecasts never pass through it.', 'simple-nws-weather-block' ),
				'<code>' . esc_html( Simple_NWS_Weather_Block_Geocoder::DEFAULT_ENDPOINT ) . '</code>',
				'<a href="https://github.com/komoot/photon" target="_blank" rel="noopener noreferrer">',
				'</a>'
			);
			?>
		</p>
		<?php
	}

	/**
	 * Renders the latitude field.
	 *
	 * @return void
	 */
	public static function render_latitude_field() {
		?>
		<input
			type="number"
			step="0.0001"
			min="-90"
			max="90"
			class="regular-text"
			id="simple_nws_weather_block_latitude"
			name="<?php echo esc_attr( self::OPTION . '[latitude]' ); ?>"
			value="<?php echo esc_attr( self::get( 'latitude' ) ); ?>"
		/>
		<p class="description"><?php esc_html_e( 'For example, 28.6024 for Orlando, Florida.', 'simple-nws-weather-block' ); ?></p>
		<?php
	}

	/**
	 * Renders the longitude field.
	 *
	 * @return void
	 */
	public static function render_longitude_field() {
		?>
		<input
			type="number"
			step="0.0001"
			min="-180"
			max="180"
			class="regular-text"
			id="simple_nws_weather_block_longitude"
			name="<?php echo esc_attr( self::OPTION . '[longitude]' ); ?>"
			value="<?php echo esc_attr( self::get( 'longitude' ) ); ?>"
		/>
		<p class="description"><?php esc_html_e( 'For example, -81.2001 for Orlando, Florida.', 'simple-nws-weather-block' ); ?></p>
		<?php
	}

	/**
	 * Renders the location label field.
	 *
	 * @return void
	 */
	public static function render_location_label_field() {
		?>
		<input
			type="text"
			class="regular-text"
			id="simple_nws_weather_block_location_label"
			name="<?php echo esc_attr( self::OPTION . '[location_label]' ); ?>"
			value="<?php echo esc_attr( self::get( 'location_label' ) ); ?>"
		/>
		<p class="description">
			<?php esc_html_e( 'Used in the text announced to screen readers, for example "Orlando". Optional.', 'simple-nws-weather-block' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the units field.
	 *
	 * @return void
	 */
	public static function render_units_field() {
		$value = self::get( 'units' );
		?>
		<select id="simple_nws_weather_block_units" name="<?php echo esc_attr( self::OPTION . '[units]' ); ?>">
			<option value="us" <?php selected( $value, 'us' ); ?>><?php esc_html_e( 'Fahrenheit', 'simple-nws-weather-block' ); ?></option>
			<option value="si" <?php selected( $value, 'si' ); ?>><?php esc_html_e( 'Celsius', 'simple-nws-weather-block' ); ?></option>
		</select>
		<?php
	}

	/**
	 * Renders the cache lifetime field.
	 *
	 * @return void
	 */
	public static function render_cache_minutes_field() {
		?>
		<input
			type="number"
			step="1"
			min="0"
			max="10080"
			class="small-text"
			id="simple_nws_weather_block_cache_minutes"
			name="<?php echo esc_attr( self::OPTION . '[cache_minutes]' ); ?>"
			value="<?php echo esc_attr( self::get( 'cache_minutes' ) ); ?>"
		/>
		<?php esc_html_e( 'minutes', 'simple-nws-weather-block' ); ?>
		<p class="description">
			<?php esc_html_e( 'How long a forecast is reused before the browser asks the National Weather Service again. Defaults to 60 minutes; set to 0 to disable caching.', 'simple-nws-weather-block' ); ?>
		</p>
		<?php
	}

	/**
	 * Renders the settings page.
	 *
	 * @return void
	 */
	public static function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}
}
