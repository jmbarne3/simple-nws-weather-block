<?php
// This file is generated. Do not modify it manually.
return array(
	'weather' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'simple-nws-weather-block/weather',
		'version' => '0.1.0',
		'title' => 'Weather',
		'category' => 'widgets',
		'icon' => 'cloud',
		'description' => 'Show current conditions and forecasts from the National Weather Service. United States locations only.',
		'keywords' => array(
			'weather',
			'forecast',
			'temperature',
			'hourly',
			'nws'
		),
		'textdomain' => 'simple-nws-weather-block',
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
					'custom'
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
			'simple-nws-weather-block-weather-icons'
		),
		'render' => 'file:./render.php',
		'viewScript' => 'file:./view.js'
	)
);
