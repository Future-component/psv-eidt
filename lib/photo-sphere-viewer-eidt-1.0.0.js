/**
 * PhotoSphereViewerEidt
 * 1.0.0
 * Copyright (c) 2018-09-13 13:54:20 Beth
 * 实现全景播放的插件
 * depend [three.js, dat.gui.js]
 */

 /**
  1.全景渲染
  2.添加一个点
  */

/* eslint-disable */
(function(global, factory) {
  // typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  //   typeof define === 'function' && define.amd ? define(factory) :
      (global.PhotoSphereViewerEidt = factory())
})(this, function() {
  'use strict';

	var Version = '1.0.0';
	var THREE = window.THREE;
	
	/**
	 * Detects whether canvas is supported.
	 * @private
	 * @return {boolean} `true` if canvas is supported, `false` otherwise
	 **/

	var isCanvasSupported = function() {
		var canvas = document.createElement('canvas');
		return !!(canvas.getContext && canvas.getContext('2d'));
	};

	/**
	 * Detects whether WebGL is supported.
	 * @private
	 * @return {boolean} `true` if WebGL is supported, `false` otherwise
	 **/

	var isWebGLSupported = function() {
		var canvas = document.createElement('canvas');
		return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
	};

	/**
	 * Attaches an event handler function to an element.
	 * @private
	 * @param {HTMLElement} elt - The element
	 * @param {string} evt - The event name
	 * @param {function} f - The handler function
	 * @return {void}
	 **/

	var addEvent = function(elt, evt, f) {
		if (!!elt.addEventListener)
			elt.addEventListener(evt, f, false);
		else
			elt.attachEvent('on' + evt, f);
	};

	/**
	 * Ensures that a number is in a given interval.
	 * @private
	 * @param {number} x - The number to check
	 * @param {number} min - First endpoint
	 * @param {number} max - Second endpoint
	 * @return {number} The checked number
	 **/

	var stayBetween = function(x, min, max) {
		return Math.max(min, Math.min(max, x));
	};

	/**
	 * Calculates the distance between two points (square of the distance is enough).
	 * @private
	 * @param {number} x1 - First point horizontal coordinate
	 * @param {number} y1 - First point vertical coordinate
	 * @param {number} x2 - Second point horizontal coordinate
	 * @param {number} y2 - Second point vertical coordinate
	 * @return {number} Square of the wanted distance
	 **/

	var dist = function(x1, y1, x2, y2) {
		var x = x2 - x1;
		var y = y2 - y1;
		return x*x + y*y;
	};

	/**
	 * Returns the measure of an angle (between 0 and 2π).
	 * @private
	 * @param {number} angle - The angle to reduce
	 * @param {boolean} [is_2pi_allowed=false] - Can the measure be equal to 2π?
	 * @return {number} The wanted measure
	 **/

	// var getAngleMeasure = function(angle, is_2pi_allowed) {
	// 	is_2pi_allowed = (is_2pi_allowed !== undefined) ? !!is_2pi_allowed : false;
	// 	return (is_2pi_allowed && angle == 2 * Math.PI) ? 2 * Math.PI :  angle - Math.floor(angle / (2.0 * Math.PI)) * 2.0 * Math.PI;
	// };

	/**
	 * Returns Google's XMP data.
	 * @private
	 * @param {string} file - Binary file
	 * @return {string} The data
	 **/

	var getXMPData = function(file) {
		var a = 0, b = 0;
		var data = '';

		while ((a = file.indexOf('<x:xmpmeta', b)) !== -1 && (b = file.indexOf('</x:xmpmeta>', a)) !== -1) {
			data = file.substring(a, b);
			if (data.indexOf('GPano:') !== -1)
				return data;
		}

		return '';
	};

	/**
	 * Returns the value of a given attribute in the panorama metadata.
	 * @private
	 * @param {string} data - The panorama metadata
	 * @param {string} attr - The wanted attribute
	 * @return {string} The value of the attribute
	 **/

	// var getAttribute = function(data, attr) {
	// 	var a = data.indexOf('GPano:' + attr) + attr.length + 8, b = data.indexOf('"', a);

	// 	if (b == -1) {
	// 		// XML-Metadata
	// 		a = data.indexOf('GPano:' + attr) + attr.length + 7;
	// 		b = data.indexOf('<', a);
	// 	}

	// 	return data.substring(a, b);
	// };

	/**
	 * 重组样式对象为字符串
	 * @param {object} new_style 
	 */
	// var getStyle = function(new_style) {
	// 	var styleAry = [];
	// 	// Properties to change
	// 	for (var property in new_style) {
	// 		// Is this property a property we'll use?
	// 		styleAry.push(`${property}: ${new_style[property]};`)
	// 	}
	// 	return styleAry.join('');
	// };

	/**
	 * Checks if a value exists in an array.
	 * @private
	 * @param {*} searched - The searched value
	 * @param {array} array - The array
	 * @return {boolean} `true` if the value exists in the array, `false` otherwise
	 **/

	var inArray = function(searched, array) {
		for (var i = 0, l = array.length; i < l; ++i) {
			if (array[i] == searched)
				return true;
		}

		return false;
	};

	// Properties types
	var colors = ['backgroundColor', 'buttonsColor', 'buttonsBackgroundColor', 'activeButtonsBackgroundColor'];
	var numbers = ['buttonsHeight', 'autorotateThickness', 'zoomRangeWidth', 'zoomRangeThickness', 'zoomRangeDisk', 'fullscreenRatio', 'fullscreenThickness'];

	/**
	 * Checks if a property is valid.
	 * @private
	 * @param {string} property - The property
	 * @param {*} value - The value to check
	 * @return {boolean} `true` if the value is valid, `false` otherwise
	 **/

	var checkValue = function(property, value) {
		return (
				// Color
				(
					inArray(property, colors) && (typeof value == 'string') &&
					(
						value == 'transparent' ||
						!!value.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/) ||
						!!value.match(/^rgb\((1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])(,\s*(1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}\)$/) ||
						!!value.match(/^rgba\(((1?[0-9]{1,2}|2[0-4][0-9]|25[0-5]),\s*){3}(0(\.[0-9]*)?|1)\)$/)
					)
				) ||

				// Number
				(inArray(property, numbers) && !isNaN(parseFloat(value)) && isFinite(value) && value >= 0)
			);
	};

  function PhotoSphereViewer(args) {
		/******* PhotoSphereViewer 依赖工具方法 *********/

		/**
		 * Parses an animation speed.
		 * @private
		 * @param {string} speed - The speed, in radians/degrees/revolutions per second/minute
		 * @return {number} The speed in radians
		 **/

		var parseAnimationSpeed = function(speed) {
			speed = speed.toString().trim();

			// Speed extraction
			var speed_value = parseFloat(speed.replace(/^(-?[0-9]+(?:\.[0-9]*)?).*$/, '$1'));
			var speed_unit = speed.replace(/^-?[0-9]+(?:\.[0-9]*)?(.*)$/, '$1').trim();

			// "per minute" -> "per second"
			if (speed_unit.match(/(pm|per minute)$/))
				speed_value /= 60;

			var rad_per_second = 0;

			// Which unit?
			switch (speed_unit) {
				// Revolutions per minute / second
				case 'rpm':
				case 'rev per minute':
				case 'revolutions per minute':
				case 'rps':
				case 'rev per second':
				case 'revolutions per second':
					// speed * 2pi
					rad_per_second = speed_value * 2 * Math.PI;
					break;

				// Degrees per minute / second
				case 'dpm':
				case 'deg per minute':
				case 'degrees per minute':
				case 'dps':
				case 'deg per second':
				case 'degrees per second':
					// Degrees to radians (rad = deg * pi / 180)
					rad_per_second = speed_value * Math.PI / 180;
					break;

				// Radians per minute / second
				case 'rad per minute':
				case 'radians per minute':
				case 'rad per second':
				case 'radians per second':
					rad_per_second = speed_value;
					break;

				// Unknown unit
				default:
					// m_anim = false;
			}

			// Longitude offset
			return rad_per_second * PSV_ANIM_TIMEOUT / 1000;
		};

		/**
		 * Parses an angle given in radians or degrees.
		 * @private
		 * @param {number|string} angle - Angle in radians (number) or in degrees (string)
		 * @return {number} The angle in radians
		 **/

		var parseAngle = function(angle) {
			// console.log('parseAngle', angle)
			angle = angle.toString().trim();

			// Angle extraction
			var angle_value = parseFloat(angle.replace(/^(-?[0-9]+(?:\.[0-9]*)?).*$/, '$1'));
			var angle_unit = angle.replace(/^-?[0-9]+(?:\.[0-9]*)?(.*)$/, '$1').trim();

			// Degrees
			if (angle_unit == 'deg')
				angle_value *= Math.PI / 180;

			// Radians by default, we don't have anyting to do
			return getAngleMeasure(angle_value);
		};

		/**
		 * Returns the measure of an angle (between 0 and 2π).
		 * @private
		 * @param {number} angle - The angle to reduce
		 * @param {boolean} [is_2pi_allowed=false] - Can the measure be equal to 2π?
		 * @return {number} The wanted measure
		 **/

		var getAngleMeasure = function(angle, is_2pi_allowed) {
			// console.log('getAngleMeasure', angle, is_2pi_allowed)
			is_2pi_allowed = (is_2pi_allowed !== undefined) ? !!is_2pi_allowed : false;
			return (is_2pi_allowed && angle == 2 * Math.PI) ? 2 * Math.PI : angle - Math.floor(angle / (2.0 * Math.PI)) * 2.0 * Math.PI;
		};

		/**
		 * Sets the viewer size.
		 * @private
		 * @param {object} size - An object containing the wanted width and height
		 * @return {void}
		 **/

		var setNewViewerSize = function(size) {
			// Checks all the values
			for (var dim in size) {
				// Only width and height matter
				if (dim == 'width' || dim == 'height') {
					// Size extraction
					var size_str = size[dim].toString().trim();

					var size_value = parseFloat(size_str.replace(/^([0-9]+(?:\.[0-9]*)?).*$/, '$1'));
					var size_unit = size_str.replace(/^[0-9]+(?:\.[0-9]*)?(.*)$/, '$1').trim();

					// Only percentages and pixels are allowed
					if (size_unit !== '%')
						size_unit = 'px';

					// We're good
					new_viewer_size[dim] = {
							css: size_value + size_unit,
							unit: size_unit
						};
				}
			}
		};

		/**
		 * Adds a function to execute when a given action occurs.
		 * @public
		 * @param {string} name - The action name
		 * @param {function} f - The handler function
		 * @return {void}
		 **/

		var addAction = function(name, f) {
			// New action?
			if (!(name in actions))
				actions[name] = [];

			actions[name].push(f);
		};

		/**
		 * Triggers an action.
		 * @private
		 * @param {string} name - Action name
		 * @param {*} arg - An argument to send to the handler functions
		 * @return {void}
		 **/

		var triggerAction = function(name, arg) {
			// Does the action have any function?
			if ((name in actions) && !!actions[name].length) {
				for (var i = 0, l = actions[name].length; i < l; ++i) {
					if (arg !== undefined)
						actions[name][i](arg);

					else
						actions[name][i]();
				}
			}
		};

		/**
		 * Resizes the canvas.
		 * @private
		 * @param {object} size - New dimensions
		 * @param {number} [size.width] - The new canvas width (default to previous width)
		 * @param {number} [size.height] - The new canvas height (default to previous height)
		 * @return {void}
		 **/

		var resize = function(size) {
			// console.log('resize', size)
			viewer_size.width = (size.width !== undefined) ? parseInt(size.width) : viewer_size.width;
			viewer_size.height = (size.height !== undefined) ? parseInt(size.height) : viewer_size.height;
			viewer_size.ratio = viewer_size.width / viewer_size.height;

			if (!!camera) {
				camera.aspect = viewer_size.ratio;
				camera.updateProjectionMatrix();
			}

			if (!!renderer) {
				renderer.setSize(viewer_size.width, viewer_size.height);
				render('renderer');
			}

			if (!!stereo_effect) {
				stereo_effect.setSize(viewer_size.width, viewer_size.height);
				render('stereo_effect');
			}
		};

		/**
		 * Returns the current position in radians弧度
		 * @return {object} A longitude/latitude couple
		 **/

		var getPosition = function() {
			return {
				longitude: long,
				latitude: lat
			};
		};

		/**
		 * Returns the current position in degrees角度
		 * @return {object} A longitude/latitude couple
		 **/

		var getPositionInDegrees = function() {
			return {
				longitude: long * 180.0 / Math.PI,
				latitude: lat * 180.0 / Math.PI
			};
		};

		/**
		 * Moves to a specific position
		 * @private
		 * @param {number|string} longitude - The longitude of the targeted point
		 * @param {number|string} latitude - The latitude of the targeted point
		 * @return {void}
		 **/

		var moveTo = function(longitude, latitude) {
			var long_tmp = parseAngle(longitude);

			if (!whole_circle)
				long_tmp = stayBetween(long_tmp, PSV_MIN_LONGITUDE, PSV_MAX_LONGITUDE);

			var lat_tmp = parseAngle(latitude);

			if (lat_tmp > Math.PI)
				lat_tmp -= 2 * Math.PI;

			lat_tmp = stayBetween(lat_tmp, PSV_TILT_DOWN_MAX, PSV_TILT_UP_MAX);

			long = long_tmp;
			lat = lat_tmp;

			/**
			 * Indicates that the position has been modified.
			 * @callback PhotoSphereViewer~onPositionUpdateed
			 * @param {object} position - The new position
			 * @param {number} position.longitude - The longitude in radians
			 * @param {number} position.latitude - The latitude in radians
			 **/

			triggerAction('position-updated', {
				longitude: long,
				latitude: lat
			});

			render('moveTo');
		};

		/**
		 * Rotates the view
		 * @private
		 * @param {number|string} dlong - The rotation to apply horizontally
		 * @param {number|string} dlat - The rotation to apply vertically
		 * @return {void}
		 **/

		var rotate = function(dlong, dlat) {
			dlong = parseAngle(dlong);
			dlat = parseAngle(dlat);

			moveTo(long + dlong, lat + dlat);
		};

		/**
		 * Attaches or detaches the keyboard events
		 * @private
		 * @param {boolean} attach - `true` to attach the event, `false` to detach it
		 * @return {void}
		 **/

		var toggleArrowKeys = function(attach) {
			var action = (attach) ? window.addEventListener : window.removeEventListener;
			action('keydown', keyDown);
		};

		/**
		 * Tries to standardize the code sent by a keyboard event
		 * @private
		 * @param {KeyboardEvent} evt - The event
		 * @return {string} The code
		 **/

		var retrieveKey = function(evt) {
			// The Holy Grail
			if (evt.key) {
				var key = (/^Arrow/.test(evt.key)) ? evt.key : 'Arrow' + evt.key;
				return key;
			}

			// Deprecated but still used
			if (evt.keyCode || evt.which) {
				var key_code = (evt.keyCode) ? evt.keyCode : evt.which;

				var keycodes_map = {
					38: 'ArrowUp',
					39: 'ArrowRight',
					40: 'ArrowDown',
					37: 'ArrowLeft'
				};

				if (keycodes_map[key_code] !== undefined)
					return keycodes_map[key_code];
			}

			// :/
			return '';
		};

		/**
		 * Rotates the view through keyboard arrows
		 * @private
		 * @param {KeyboardEvent} evt - The event
		 * @return {void}
		 **/

		var keyDown = function(evt) {
			var dlong = 0, dlat = 0;

			switch (retrieveKey(evt)) {
				case 'ArrowUp':
					dlat = PSV_KEYBOARD_LAT_OFFSET;
					break;

				case 'ArrowRight':
					dlong = -PSV_KEYBOARD_LONG_OFFSET;
					break;

				case 'ArrowDown':
					dlat = -PSV_KEYBOARD_LAT_OFFSET;
					break;

				case 'ArrowLeft':
					dlong = PSV_KEYBOARD_LONG_OFFSET;
					break;
			}

			rotate(dlong, dlat);
		};

		var changeCursor = function(type) {
			var container = document.getElementById('container');
			switch(type) {
				case 'mouseDown':
				case 'touchStart':
				case 'mouseMove':
				case 'touchMove':
					container.style.cursor = 'move';
					break;
				case 'mouseUp':
				case 'up':
				case 'move':
					container.style.cursor = 'pointer';
					break;
			}
		}

		/**
		 * The user wants to move.
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onMouseDown = function(evt) {
			startMove(parseInt(evt.clientX), parseInt(evt.clientY));
		};

		/**
		 * The user wants to move or to zoom (mobile version).
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onTouchStart = function(evt) {
			// console.log('onTouchStart', evt)
			// Move
			if (evt.touches.length == 1) {
				var touch = evt.touches[0];
				if (touch.target.parentNode == canvas_container)
					startMove(parseInt(touch.clientX), parseInt(touch.clientY));
			}

			// Zoom
			else if (evt.touches.length == 2) {
				onMouseUp();

				if (evt.touches[0].target.parentNode == canvas_container && evt.touches[1].target.parentNode == canvas_container)
					startTouchZoom(dist(evt.touches[0].clientX, evt.touches[0].clientY, evt.touches[1].clientX, evt.touches[1].clientY));
			}
		};

		/**
		 * Initializes the movement.
		 * @private
		 * @param {integer} x - Horizontal coordinate
		 * @param {integer} y - Vertical coordinate
		 * @return {void}
		 **/

		var startMove = function(x, y) {
			// Store the current position of the mouse
			mouse_x = x;
			mouse_y = y;

			// Start the movement
			mousedown = true;
		};

		/**
		 * Initializes the "pinch to zoom" action.
		 * @private
		 * @param {number} d - Square of the distance between the two fingers
		 * @return {void}
		 **/

		var startTouchZoom = function(d) {
			touchzoom_dist = d;

			touchzoom = true;
		};

		/**
		 * The user wants to stop moving (or stop zooming with their finger).
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onMouseUp = function(evt) {
			mousedown = false;
			touchzoom = false;
		};

		/**
		 * The user moves the image.
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onMouseMove = function(evt) {
			evt.preventDefault();
			move(parseInt(evt.clientX), parseInt(evt.clientY));
		};

		/**
		 * The user moves the image (mobile version).
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onTouchMove = function(evt) {
			// Move
			if (evt.touches.length == 1 && mousedown) {
				var touch = evt.touches[0];
				if (touch.target.parentNode == canvas_container) {
					evt.preventDefault();
					move(parseInt(touch.clientX), parseInt(touch.clientY));
				}
			}

			// Zoom
			else if (evt.touches.length == 2) {
				if (evt.touches[0].target.parentNode == canvas_container && evt.touches[1].target.parentNode == canvas_container && touchzoom) {
					evt.preventDefault();

					// Calculate the new level of zoom
					var d = dist(evt.touches[0].clientX, evt.touches[0].clientY, evt.touches[1].clientX, evt.touches[1].clientY);
					var diff = d - touchzoom_dist;

					if (diff !== 0) {
						var direction = diff / Math.abs(diff);
						zoom(zoom_lvl + direction * zoom_speed);

						touchzoom_dist = d;
					}
				}
			}
		};

		/**
		 * Movement.
		 * @private
		 * @param {integer} x - Horizontal coordinate
		 * @param {integer} y - Vertical coordinate
		 * @return {void}
		 **/

		var move = function(x, y) {
			changeCursor('move');
			if (mousedown) {
				// Smooth movement
				if (smooth_user_moves) {
					long += (x - mouse_x) / viewer_size.height * fov * Math.PI / 180;
					lat += (y - mouse_y) / viewer_size.height * fov * Math.PI / 180;
				}

				// No smooth movement
				else {
					long += (x - mouse_x) * PSV_LONG_OFFSET;
					lat += (y - mouse_y) * PSV_LAT_OFFSET;
				}

				// Save the current coordinates for the next movement
				mouse_x = x;
				mouse_y = y;

				// Coordinates treatments
				if (!whole_circle)
					long = stayBetween(long, PSV_MIN_LONGITUDE, PSV_MAX_LONGITUDE);

				long = getAngleMeasure(long, true);

				lat = stayBetween(lat, PSV_TILT_DOWN_MAX, PSV_TILT_UP_MAX);

				triggerAction('position-updated', {
					longitude: long,
					latitude: lat
				});

				render('move');
			}
		};

		/**
		 * The user wants to zoom.
		 * @private
		 * @param {Event} evt - The event
		 * @return {void}
		 **/

		var onMouseWheel = function(evt) {
			evt.preventDefault();
			evt.stopPropagation();

			var delta = (evt.detail) ? -evt.detail : evt.wheelDelta;

			if (delta !== 0) {
				var direction = parseInt(delta / Math.abs(delta));
				zoom(zoom_lvl + direction * zoom_speed);
			}
		};

		/**
		 * Sets the new zoom level.
		 * @private
		 * @param {integer} level - New zoom level
		 * @return {void}
		 **/

		var zoom = function(level) {
			// zoom_lvl = stayBetween(level, 0, 100);
			zoom_lvl = stayBetween(level, -500, 500);
			fov = PSV_FOV_MAX + (zoom_lvl / 100) * (PSV_FOV_MIN - PSV_FOV_MAX);

			camera.fov = fov;
			camera.updateProjectionMatrix();
			render('zoom');

			/**
			 * Indicates that the zoom level has changed.
			 * @callback PhotoSphereViewer~onZoomUpdated
			 * @param {number} zoom_level - The new zoom level
			 **/

			triggerAction('zoom-updated', zoom_lvl);
		};

		/**
		 * Zoom in.
		 * @public
		 * @return {void}
		 **/

		var zoomIn = function() {
			// if (zoom_lvl < 100)
				zoom(zoom_lvl + zoom_speed);
		};

		/**
		 * Zoom out.
		 * @public
		 * @return {void}
		 **/

		var zoomOut = function() {
			// if (zoom_lvl > 0)
				zoom(zoom_lvl - zoom_speed);
		};

	
		// Required parameters
		if (args === undefined || args.panorama === undefined || args.container === undefined) {
			console.log('PhotoSphereViewer: no value given for panorama or container');
			return;
		}

		// Should the movement be smooth?
		var smooth_user_moves = (args.smooth_user_moves !== undefined) ? !!args.smooth_user_moves : true;

		// Movement speed
		var PSV_LONG_OFFSET = (args.long_offset !== undefined) ? parseAngle(args.long_offset) : Math.PI / 360.0;
		var PSV_LAT_OFFSET = (args.lat_offset !== undefined) ? parseAngle(args.lat_offset) : Math.PI / 180.0;

		var PSV_KEYBOARD_LONG_OFFSET = (args.keyboard_long_offset !== undefined) ? parseAngle(args.keyboard_long_offset) : Math.PI / 60.0;
		var PSV_KEYBOARD_LAT_OFFSET = (args.keyboard_lat_offset !== undefined) ? parseAngle(args.keyboard_lat_offset) : Math.PI / 120.0;

		// Minimum and maximum fields of view in degrees
		var PSV_FOV_MIN = (args.min_fov !== undefined) ? stayBetween(parseFloat(args.min_fov), 1, 179) : 30;
		var PSV_FOV_MAX = (args.max_fov !== undefined) ? stayBetween(parseFloat(args.max_fov), 1, 179) : 90;

		// Minimum tilt up / down angles
		var PSV_TILT_UP_MAX = (args.tilt_up_max !== undefined) ? stayBetween(parseAngle(args.tilt_up_max), 0, Math.PI / 2.0) : Math.PI / 2.0;
		var PSV_TILT_DOWN_MAX = (args.tilt_down_max !== undefined) ? -stayBetween(parseAngle(args.tilt_down_max), 0, Math.PI / 2.0) : -Math.PI / 2.0;

		// Minimum and maximum visible longitudes
		var min_long = (args.min_longitude !== undefined) ? parseAngle(args.min_longitude) : 0;
		var max_long = (args.max_longitude !== undefined) ? parseAngle(args.max_longitude) : 0;
		var whole_circle = (min_long == max_long);
	
		if (whole_circle) {
			min_long = 0;
			max_long = 2 * Math.PI;
		}
	
		else if (max_long === 0)
			max_long = 2 * Math.PI;

		var PSV_MIN_LONGITUDE, PSV_MAX_LONGITUDE;
		if (min_long < max_long) {
			PSV_MIN_LONGITUDE = min_long;
			PSV_MAX_LONGITUDE = max_long;
		}

		else {
			PSV_MIN_LONGITUDE = max_long;
			PSV_MAX_LONGITUDE = min_long;
		}

		// Default position
		var lat = 0, long = PSV_MIN_LONGITUDE;
		
		if (args.default_position !== undefined) {
			if (args.default_position.lat !== undefined) {
				var lat_angle = parseAngle(args.default_position.lat);
				if (lat_angle > Math.PI)
					lat_angle -= 2 * Math.PI;
	
				lat = stayBetween(lat_angle, PSV_TILT_DOWN_MAX, PSV_TILT_UP_MAX);
			}
	
			if (args.default_position.long !== undefined)
				long = stayBetween(parseAngle(args.default_position.long), PSV_MIN_LONGITUDE, PSV_MAX_LONGITUDE);
		}

		// Sphere heightSegments and widthSegments
		var heightSegments = (args.heightSegments !== undefined) ? parseInt(args.heightSegments) : 100;
		var widthSegments = (args.widthSegments !== undefined) ? parseInt(args.widthSegments) : 100;

		// Default zoom level
		var zoom_lvl = 0;

		if (args.zoom_level !== undefined)
			zoom_lvl = stayBetween(parseInt(Math.round(args.zoom_level)), 0, 100);

		var fov = PSV_FOV_MAX + (zoom_lvl / 100) * (PSV_FOV_MIN - PSV_FOV_MAX);

		// Animation constants
		var PSV_FRAMES_PER_SECOND = 60;
		var PSV_ANIM_TIMEOUT = 1000 / PSV_FRAMES_PER_SECOND;

		// Delay before the animation
		var anim_delay = 3000;

		if (args.time_anim !== undefined) {
			if (typeof args.time_anim == 'number' && args.time_anim >= 0)
				anim_delay = args.time_anim;

			else
				anim_delay = false;
		}

		// Horizontal animation speed
		var anim_long_offset = (args.anim_speed !== undefined) ? parseAnimationSpeed(args.anim_speed) : parseAnimationSpeed('2rpm');

		// Reverse the horizontal animation if autorotate reaches the min/max longitude
		var reverse_anim = true;

		if (args.reverse_anim !== undefined)
			reverse_anim = !!args.reverse_anim;

		// Vertical animation speed
		var anim_lat_offset = (args.vertical_anim_speed !== undefined) ? parseAnimationSpeed(args.vertical_anim_speed) : parseAnimationSpeed('2rpm');

		// Vertical animation target (default: equator)
		var anim_lat_target = 0;

		if (args.vertical_anim_target !== undefined) {
			var lat_target_angle = parseAngle(args.vertical_anim_target);
			if (lat_target_angle > Math.PI)
				lat_target_angle -= 2 * Math.PI;

			anim_lat_target = stayBetween(lat_target_angle, PSV_TILT_DOWN_MAX, PSV_TILT_UP_MAX);
		}

		// Are user interactions allowed?
		var user_interactions_allowed = (args.allow_user_interactions !== undefined) ? !!args.allow_user_interactions : true;

		if (!user_interactions_allowed)
			display_navbar = false;

		// Is "scroll to zoom" allowed?
		var scroll_to_zoom = (args.allow_scroll_to_zoom !== undefined) ? !!args.allow_scroll_to_zoom : true;

		// User's zoom speed
		var zoom_speed = (args.zoom_speed !== undefined) ? parseFloat(args.zoom_speed) : 1.0;

		// Container (ID to retrieve?)
		var container = (typeof args.container == 'string') ? document.getElementById(args.container) : args.container;

		// Size of the viewer
		var viewer_size, new_viewer_size = {}, real_viewer_size = {};
		if (args.size !== undefined)
			setNewViewerSize(args.size);

		// Some useful attributes
		var panorama = args.panorama;
		var getMeshPosition = args.getMeshPosition;

		// 初始化容器
		var root;
		var canvas_container;

		// 初始化three相关对象
		var renderer = null;
		var scene = null;
		var camera = null;
		var light = null;
		var controls = null;

		var stereo_effect = null;
		var mousedown = false;
		var mouse_x = 0;
		var mouse_y = 0;
		var touchzoom = false;
		var touchzoom_dist = 0;

		var autorotate_timeout = null;
		var anim_timeout = null;

		var actions = {};

		// Can we use CORS?
		var cors_anonymous = (args.cors_anonymous !== undefined) ? !!args.cors_anonymous : true;

		// Cropped size?
		var pano_size = {
			full_width: null,
			full_height: null,
			cropped_width: null,
			cropped_height: null,
			cropped_x: null,
			cropped_y: null
		};

		// The user defines the real size of the panorama
		if (args.pano_size !== undefined) {
			for (var attr in pano_size) {
				if (args.pano_size[attr] !== undefined)
					pano_size[attr] = parseInt(args.pano_size[attr]);
			}
		}

		// Captured FOVs
		var captured_view = {
			horizontal_fov: 360,
			vertical_fov: 180
		};

		if (args.captured_view !== undefined) {
			for (var attr in captured_view) {
				if (args.captured_view[attr] !== undefined)
					captured_view[attr] = parseFloat(args.captured_view[attr]);
			}
		}

		// Will we have to recalculate the coordinates?
		var recalculate_coords = false;

		// Loading image
		var loading_img = (args.loading_img !== undefined) ? args.loading_img.toString() : null;

		// Function to call once panorama is ready?
		var self = this;
		if (args.onready !== undefined)
			addAction('ready', args.onready);

		// Go?
		var autoload = (args.autoload !== undefined) ? !!args.autoload : true;

		var psvLoading = null;

		var getPanoSize = function(img) {
			// Must the pano size be changed?
			var default_pano_size = {
				full_width: img.width,
				full_height: img.height,
				cropped_width: img.width,
				cropped_height: img.height,
				cropped_x: null,
				cropped_y: null
			};

			// Captured view?
			if (captured_view.horizontal_fov !== 360 || captured_view.vertical_fov !== 180) {
				// The indicated view is the cropped panorama
				pano_size.cropped_width = default_pano_size.cropped_width;
				pano_size.cropped_height = default_pano_size.cropped_height;
				pano_size.full_width = default_pano_size.full_width;
				pano_size.full_height = default_pano_size.full_height;

				// Horizontal FOV indicated
				if (captured_view.horizontal_fov !== 360) {
					var rh = captured_view.horizontal_fov / 360.0;
					pano_size.full_width = pano_size.cropped_width / rh;
				}

				// Vertical FOV indicated
				if (captured_view.vertical_fov !== 180) {
					var rv = captured_view.vertical_fov / 180.0;
					pano_size.full_height = pano_size.cropped_height / rv;
				}
			}

			else {
				// Cropped panorama: dimensions defined by the user
				for (var attr in pano_size) {
					if (pano_size[attr] === null && default_pano_size[attr] !== undefined)
						pano_size[attr] = default_pano_size[attr];
				}

				// Do we have to recalculate the coordinates?
				if (recalculate_coords) {
					if (pano_size.cropped_width !== default_pano_size.cropped_width) {
						var rx = default_pano_size.cropped_width / pano_size.cropped_width;
						pano_size.cropped_width = default_pano_size.cropped_width;
						pano_size.full_width *= rx;
						pano_size.cropped_x *= rx;
					}

					if (pano_size.cropped_height !== default_pano_size.cropped_height) {
						var ry = default_pano_size.cropped_height / pano_size.cropped_height;
						pano_size.cropped_height = default_pano_size.cropped_height;
						pano_size.full_height *= ry;
						pano_size.cropped_y *= ry;
					}
				}
			}

			// Middle if cropped_x/y is null
			if (pano_size.cropped_x === null)
				pano_size.cropped_x = (pano_size.full_width - pano_size.cropped_width) / 2;

			if (pano_size.cropped_y === null)
				pano_size.cropped_y = (pano_size.full_height - pano_size.cropped_height) / 2;

			// Size limit for mobile compatibility
			var max_width = 2048;
			if (isWebGLSupported()) {
				var canvas_tmp = document.createElement('canvas');
				var ctx_tmp = canvas_tmp.getContext('webgl');
				max_width = ctx_tmp.getParameter(ctx_tmp.MAX_TEXTURE_SIZE);
			}

			// Buffer width (not too big)
			var new_width = Math.min(pano_size.full_width, max_width);
			var r = new_width / pano_size.full_width;

			pano_size.full_width = new_width;
			pano_size.cropped_width *= r;
			pano_size.cropped_x *= r;
			

			// Buffer height (proportional to the width)
			pano_size.full_height *= r;
			pano_size.cropped_height *= r;
			pano_size.cropped_y *= r;

			return pano_size;
		}

		/**
		 * Creates an image in the right dimensions.
		 * @private
		 * @return {void}
		 **/

		var createBuffer = function(panorama) {
			return new Promise(function(resolve, reject) {
				var img = new Image();
	
				img.onload = function() {
					var pano_size = getPanoSize(img);
	
					img.width = pano_size.cropped_width;
					img.height = pano_size.cropped_height;
	
					// Buffer creation
					var buffer = document.createElement('canvas');
					buffer.width = pano_size.full_width;
					buffer.height = pano_size.full_height;
	
					var ctx = buffer.getContext('2d');
					ctx.drawImage(img, pano_size.cropped_x, pano_size.cropped_y, pano_size.cropped_width, pano_size.cropped_height);
	
					resolve(buffer.toDataURL('image/jpeg'));
				};
	
				// CORS when the panorama is not given as a base64 string
				if (cors_anonymous && !panorama.match(/^data:image\/[a-z]+;base64/)) {
					img.setAttribute('crossOrigin', 'anonymous');
				}
	
				img.src = panorama;
			})
		}

		/**
		 * Loads the sphere texture.
		 * @private
		 * @param {string} path - Path to the panorama
		 * @return {void}
		 **/
		var loadTexture = function(path) {
			// console.log('loadTexture', path)
			return new Promise((resolve, reject) => {	
				var texture = new THREE.Texture();
				var loader = new THREE.ImageLoader();
	
				var onLoad = function(img) {
					texture.needsUpdate = true;
					texture.image = img;
					// console.log('resolve', texture)
					resolve(texture, path);
				};
	
				loader.load(path, onLoad);
			});
		}

		var init = function() {
			// Is canvas supported?
			if (!isCanvasSupported()) {
				container.textContent = 'Canvas is not supported, update your browser!';
				return;
			}

			// Is Three.js loaded?
			if (window.THREE === undefined) {
				console.log('PhotoSphereViewer: Three.js is not loaded.');
				return;
			}

			// Adds a new container
			root = document.createElement('div');
			root.style.width = '100%';
			root.style.height = '100%';
			root.style.position = 'relative';
			root.style.overflow = 'hidden';

			// Current viewer size
			viewer_size = {
				width: 0,
				height: 0,
				ratio: 0
			};

			console.log('panorama', panorama);
      createBuffer(panorama).then(function(path) {
        loadTexture(path).then(function(texture) {
					panorama = texture;
          threeStart(texture);
        })	
      });		
		};

		var threeStart = function(texture, font) {
			initThree();
			initScene();
			initCamera();
			initObject(texture);
			initRender();

			initControls();
		}

		var canvasStyle = `
			position: absolute;
			z-index: 0;
			width: 100%;
			height: 100vh;
		`;

		var canvasSceneStyle = `
			position: absolute;
			-webkit-transition: all 0.5s ease-in;
			transition: all 0.5s ease-in;
			// transform: scale(0);
			opacity: 0;
		`;

		var initThree = function() {
			// New size?
			if (new_viewer_size.width !== undefined)
				container.style.width = new_viewer_size.width.css;

			if (new_viewer_size.height !== undefined)
				container.style.height = new_viewer_size.height.css;

			fitToContainer();

			// 创建渲染器
			// The chosen renderer depends on whether WebGL is supported or not
			renderer = (isWebGLSupported()) ? new THREE.WebGLRenderer({ antialias: true }) : new THREE.CanvasRenderer();
			renderer.setSize(viewer_size.width, viewer_size.height);
			
			// Canvas container
			canvas_container = document.getElementById('canvasContainer');
			if (!canvas_container) {
				canvas_container = document.createElement('div');
				canvas_container.setAttribute('id', 'canvasContainer');
				canvas_container.style = canvasStyle;
				root.appendChild(canvas_container);

			  initEvent();

				// First render
				container.innerHTML = '';
				container.appendChild(root);
			}

			// canvas_container.innerHTML = '';
			renderer.domElement.setAttribute('id', 'canvasScene');
			renderer.domElement.setAttribute('class', 'canvas-scene');
			renderer.domElement.style = canvasSceneStyle;
			canvas_container.appendChild(renderer.domElement);
			renderer.setClearColor(0xf2f2f2, 1.0);
		}

		var initEvent = function() {
			// Adding events
			addEvent(window, 'resize', fitToContainer);

			if (user_interactions_allowed) {
				addEvent(canvas_container, 'mousedown', onMouseDown);
				addEvent(document, 'mousemove', onMouseMove);
				addEvent(document, 'mouseup', onMouseUp);

				addEvent(canvas_container, 'touchstart', onTouchStart);
				addEvent(document, 'touchend', onMouseUp);
				addEvent(document, 'touchmove', onTouchMove);

				if (scroll_to_zoom) {
					addEvent(canvas_container, 'mousewheel', onMouseWheel);
					addEvent(canvas_container, 'DOMMouseScroll', onMouseWheel);
				}
			}
		}

		var initScene = function() {
			// 创建场景
			scene = new THREE.Scene();
		}
		
		var initCamera = function() {
			// Camera
			camera = new THREE.PerspectiveCamera(PSV_FOV_MAX, viewer_size.ratio, 1, 300);
			camera.position.set(0, 0, 0);
			scene.add(camera);
		}
		
		var mesh = null;
		function createMesh(geom, texture) {
			// assign two materials
			// var meshMaterial = new THREE.MeshNormalMaterial({
			// 	map: texture,
			// });

			// texture.offset.x = (1 % 2) / 2;
			// meshMaterial.side = THREE.DoubleSide;
			var wireFrameMat = new THREE.MeshBasicMaterial({
				color: 'red',
				map: texture,
			});
			// wireFrameMat.wireframe = true;

			// create a multimaterial
			// var mesh = THREE.SceneUtils.createMultiMaterialObject(geom, [meshMaterial, wireFrameMat]);
			var mesh = new THREE.Mesh(geom, wireFrameMat);
			mesh.position.set(0, 0, -90);
			return mesh;
		}

		var material = null;
		var initObject = function(texture) {
			// Sphere
			var geometry = new THREE.SphereGeometry(100, widthSegments, heightSegments, 2 * Math.PI, 2 * Math.PI);
			material = new THREE.MeshBasicMaterial({
				map: texture,
				side: THREE.DoubleSide,
			});
			var mesh0 = new THREE.Mesh(geometry, material);
			mesh0.scale.x = -1;
			scene.add(mesh0);

			mesh = createMesh(new THREE.CircleGeometry(
				5, 40, 1 * Math.PI * 2, 1 * Math.PI * 2
			), panorama)
			scene.add(mesh);
		}

		var objectEvent = function(type, object) {
			console.log('-objectEvent-', name, object, object.goTo)
			switch (type) {
				case 'clickEgg':
					console.log('egg');
					break;
				case 'clickSpot':
					var index = object.goTo;
					updatePanorama(index)
					break;
				default:
					break;
			}	
		}

		function onDocumentMouseDown(event) {
			var vector = new THREE.Vector3(( event.clientX / window.innerWidth ) * 2 - 1, -( event.clientY / window.innerHeight ) * 2 + 1, 0.5);
			vector = vector.unproject(camera);
			var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
			var intersects = raycaster.intersectObjects(objects, true);
			if (intersects.length > 0) {
					console.log("wow, it worked", intersects, objects, scene.children);
					objectEvent(intersects[0].object.type, intersects[0].object);
			}
		}

		var initControls = function() {
			// call the render function
			// setup the control gui
			controls = new function () {
				this.radius = 5;
				this.thetaStart = 1 * Math.PI * 2;
				this.thetaLength = 1 * Math.PI * 2;
				this.heightSegments = 40;
				this.x = 0;
				this.y = 0;
        this.z = -90;
        this.rx = 0;
        this.ry = 0;
        this.rz = 0;

				this.redraw = function () {
					// remove the old plane
					scene.remove(mesh);
					// create a new one
					mesh = createMesh(new THREE.CircleGeometry(
						controls.radius,
						controls.heightSegments,
						controls.thetaStart,
						controls.thetaLength,
					), panorama);
					mesh.position.z = controls.z;
					mesh.position.y = controls.y;
          mesh.position.x = controls.x;
          mesh.rotation.x = controls.rx;
          mesh.rotation.y = controls.ry;
					mesh.rotation.z = controls.rz;
					
					getMeshPosition({
						r: controls.radius,
						x: controls.x,
						y: controls.y,
						z: controls.z,
						rx: controls.rx,
						ry: controls.ry,
						rz: controls.rz,
					});

					// add it to the scene.
					scene.add(mesh);
					render();
				};
			}

			var gui = new dat.GUI();
			gui.add(controls, 'radius', 0, 240).onChange(controls.redraw);
			gui.add(controls, 'x', -360, 360).onChange(controls.redraw);
			gui.add(controls, 'y', -360, 360).onChange(controls.redraw);
      gui.add(controls, 'z', -360, 360).onChange(controls.redraw);
      gui.add(controls, 'rx', -360, 360).onChange(controls.redraw);
      gui.add(controls, 'ry', -360, 360).onChange(controls.redraw);
      gui.add(controls, 'rz', -360, 360).onChange(controls.redraw);
		}

		var initRender = function(cb) {
			render('create-scene');

			// Zoom?
			if (zoom_lvl > 0)
				zoom(zoom_lvl);

			/**
			 * Indicates that the loading is finished: the first image is rendered
			 * @callback PhotoSphereViewer~onReady
			 **/

			triggerAction('ready');

			console.log('加载完成')
			var canvasScene = document.querySelector('.canvas-scene');
			canvasScene.style.opacity = '1';

			if (cb) cb();
		}

		/**
		* Renders an image.
		* @private
		* @return {void}
		**/
		var point = null;
		var render = function(source_msg) {
			console.log('render:', source_msg)
			// annie.update();

			// return null;
			point = new THREE.Vector3();
			// long 转动的角度计算的三维坐标
			point.setX(Math.cos(lat) * Math.sin(long));
			point.setY(Math.sin(lat));
			point.setZ(Math.cos(lat) * Math.cos(long));

			// console.log(point, 'point')
			camera.lookAt(point);

			// Stereo?
			if (stereo_effect !== null) {
				stereo_effect.render(scene, camera);
			} else {
				renderer.render(scene, camera);
			}
		};

		/**
		* Automatically rotates the panorama.
		* @private
		* @return {void}
		**/

		var autorotate = function(noloop) {
			// console.log('autorotate')
			// console.log('aaa', lat, long, anim_lat_target, anim_lat_offset)
			lat -= (lat - anim_lat_target) * anim_lat_offset;

			long += anim_long_offset;
			// console.log('bb', lat, long)

			var again = true;

			if (!whole_circle) {
				long = stayBetween(long, PSV_MIN_LONGITUDE, PSV_MAX_LONGITUDE);

				if (long == PSV_MIN_LONGITUDE || long == PSV_MAX_LONGITUDE) {
					// Must we reverse the animation or simply stop it?
					if (reverse_anim)
						anim_long_offset *= -1;

					else {
						again = false;
					}
				}
			}

			long = getAngleMeasure(long, true);
			// console.log(long, 'long', lat)

			triggerAction('position-updated', {
				longitude: long,
				latitude: lat
			});

			render('autorotate');
			rotateViewer.updateProgress(long * 100)

			if (again && !noloop) {
				if (autorotate_timeout) {
					clearTimeout(autorotate_timeout)
					autorotate_timeout = null;
				}
				autorotate_timeout = setTimeout(autorotate, PSV_ANIM_TIMEOUT);
			}
		};

		/**
		 * 更新全景图片
		 */
		var updateTimer = null;
		var clearUpdateTimer = function() {
			if (updateTimer) {
				clearTimeout(updateTimer);
				updateTimer = null;
			}
		}

		/**
		 * Resizes the canvas to make it fit the container.
		 * @private
		 * @return {void}
		 **/

		var fitToContainer = function() {
			// console.log('fitToContainer')
			if (container.clientWidth !== viewer_size.width || container.clientHeight !== viewer_size.height) {
				resize({
					width: container.clientWidth,
					height: container.clientHeight
				});
			}
		};

		// 放到这里，就能自动监听屏幕变化？
		this.fitToContainer = fitToContainer;
		this.willUnMountScene = function() {
			container.innerHTML = '';
			var guiEle = document.querySelector('.dg');
			guiEle.innerHTML = '';
		}

		init();

		return this;
	}

	console.log(PhotoSphereViewer, '???')

  var PhotoSphereViewer$1 = PhotoSphereViewer;
  
  return PhotoSphereViewer$1;
})
