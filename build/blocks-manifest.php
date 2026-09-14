<?php
// This file is generated. Do not modify it manually.
return array(
	'weather' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'weather-block/weather',
		'version' => '0.1.0',
		'title' => 'Weather',
		'category' => 'widgets',
		'icon' => 'cloud',
		'description' => 'Show current conditions from the National Weather Service as an icon and a temperature.',
		'keywords' => array(
			'weather',
			'forecast',
			'temperature',
			'nws'
		),
		'textdomain' => 'weather-block',
		'example' => array(
			
		),
		'attributes' => array(
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
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => false
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true
			),
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
			'weather-block-weather-icons'
		),
		'render' => 'file:./render.php',
		'viewScript' => 'file:./view.js'
	)
);
