<?php
// This file is generated. Do not modify it manually.
return array(
	'weather' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'simple-weather-block/weather',
		'version' => '0.1.0',
		'title' => 'Weather',
		'category' => 'widgets',
		'icon' => 'cloud',
		'description' => 'Show conditions and forecasts from the National Weather Service.',
		'keywords' => array(
			'weather',
			'forecast',
			'temperature',
			'hourly',
			'nws'
		),
		'textdomain' => 'simple-weather-block',
		'example' => array(
			
		),
		'attributes' => array(
			'layout' => array(
				'type' => 'string',
				'default' => 'inline',
				'enum' => array(
					'inline',
					'stacked',
					'detailed',
					'daily',
					'hourly'
				)
			),
			'periodCount' => array(
				'type' => 'number',
				'default' => 5
			),
			'locationSource' => array(
				'type' => 'string',
				'default' => 'site',
				'enum' => array(
					'site',
					'custom',
					'visitor'
				)
			),
			'latitude' => array(
				'type' => 'string',
				'default' => ''
			),
			'longitude' => array(
				'type' => 'string',
				'default' => ''
			),
			'locationLabel' => array(
				'type' => 'string',
				'default' => ''
			),
			'forecastType' => array(
				'type' => 'string',
				'default' => 'current',
				'enum' => array(
					'current',
					'today'
				)
			),
			'units' => array(
				'type' => 'string',
				'default' => '',
				'enum' => array(
					'',
					'us',
					'si'
				)
			),
			'iconColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'showIcon' => array(
				'type' => 'boolean',
				'default' => true
			),
			'showTemperature' => array(
				'type' => 'boolean',
				'default' => true
			),
			'showUnit' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showCondition' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showLocation' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showHumidity' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showWind' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showPrecipitation' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showDewPoint' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'variations' => array(
			array(
				'name' => 'inline',
				'title' => 'Weather',
				'description' => 'An icon and a temperature on one line, sized to sit in a header or a sentence.',
				'icon' => 'editor-alignleft',
				'isDefault' => true,
				'scope' => array(
					'inserter',
					'transform'
				),
				'attributes' => array(
					'layout' => 'inline'
				),
				'isActive' => array(
					'layout'
				)
			),
			array(
				'name' => 'stacked',
				'title' => 'Weather (stacked)',
				'description' => 'Icon, temperature, conditions and place in a column, for a sidebar or a card.',
				'icon' => 'align-center',
				'scope' => array(
					'inserter',
					'transform'
				),
				'attributes' => array(
					'layout' => 'stacked',
					'showCondition' => true,
					'showLocation' => true
				),
				'isActive' => array(
					'layout'
				)
			),
			array(
				'name' => 'detailed',
				'title' => 'Weather (detailed)',
				'description' => 'Current conditions beside a list of readings: humidity, wind and chance of precipitation.',
				'icon' => 'info-outline',
				'scope' => array(
					'inserter',
					'transform'
				),
				'attributes' => array(
					'layout' => 'detailed',
					'showCondition' => true,
					'showLocation' => true,
					'showHumidity' => true,
					'showWind' => true,
					'showPrecipitation' => true
				),
				'isActive' => array(
					'layout'
				)
			),
			array(
				'name' => 'daily',
				'title' => 'Daily forecast',
				'description' => 'Several days across the page, each with a high, a low and a chance of precipitation.',
				'icon' => 'calendar-alt',
				'scope' => array(
					'inserter',
					'transform'
				),
				'attributes' => array(
					'layout' => 'daily',
					'periodCount' => 5,
					'showPrecipitation' => true
				),
				'isActive' => array(
					'layout'
				)
			),
			array(
				'name' => 'hourly',
				'title' => 'Hourly forecast',
				'description' => 'The next few hours across the page, each with an icon and a temperature.',
				'icon' => 'clock',
				'scope' => array(
					'inserter',
					'transform'
				),
				'attributes' => array(
					'layout' => 'hourly',
					'periodCount' => 6
				),
				'isActive' => array(
					'layout'
				)
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => false
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => true,
					'radius' => true,
					'style' => true,
					'width' => true
				)
			),
			'shadow' => true,
			'typography' => array(
				'fontSize' => true,
				'lineHeight' => true,
				'__experimentalFontFamily' => true,
				'__experimentalFontWeight' => true,
				'__experimentalFontStyle' => true,
				'__experimentalLetterSpacing' => true,
				'__experimentalTextTransform' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true,
					'fontFamily' => true
				)
			),
			'interactivity' => array(
				'clientNavigation' => false
			)
		),
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => array(
			'file:./style-index.css',
			'simple-weather-block-weather-icons'
		),
		'render' => 'file:./render.php',
		'viewScript' => 'file:./view.js'
	)
);
