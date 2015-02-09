class MotionTracker
	constructor: ->
		@ox = @oy = @oz = @ax = @ay = @az = @rx = @ry = @rz = NaN
		@tiltListen = @tilt.bind(this)
		@foxListen = @foxTilt.bind(this)
		@accelListen = @accel.bind(this)
		if window.DeviceOrientationEvent
    		# Listen for the deviceorientation event and handle DeviceOrientationEvent object, deviceorientation returns a value between -90 and 90.
            window.addEventListener 'deviceorientation', @tiltListen, false
		else if window.OrientationEvent
    		# Listen for the MozOrientation event and handle OrientationData object by multiplying it by 90 (MozOrientation returns a value between -1 and 1).
            window.addEventListener 'MozOrientation', @foxListen, false

		if window.DeviceMotionEvent
			# We can get infomation on acceleration and rotation rate if this exists
			window.addEventListener 'devicemotion', @accelListen, false

	deconstructor: ->
		window.removeEventListener 'deviceorientation', @tiltListen
		window.removeEventListener 'MozOrientation', @foxListen
		window.removeEventListener 'devicemotion', @accelListen
		@ox = @oy = @oz = @ax = @ay = @az = @rx = @ry = @rz = NaN

	foxTilt: (e) ->
		e.x = e.x * 90
		e.y = e.y * -90
		@tilt(e)

	tilt: (e) ->
		if e? and e.x? or e.beta?
			@ox = (e.x||e.beta)
			@oy = (e.y||e.gamma)
			@oz = (e.z||e.alpha)
		true

	accel: (e) ->
		if e? and e.acceleration? and e.acceleration.x? or e.acceleration.beta?
			@ax = (e.acceleration.x||e.acceleration.beta)
			@ay = (e.acceleration.y||e.acceleration.gamma)
			@az = (e.acceleration.z||e.acceleration.alpha)
		if e? and e.rotationRate? and e.rotationRate.beta?
			@rx = e.rotationRate.beta
			@ry = e.rotationRate.gamma
			@rz = e.rotationRate.alpha
		true

	getSnapshot: ->
		orientation: 
			x: @ox
			y: @oy
			z: @oz
		acceleration:
			x: @ax
			y: @ay
			z: @az
		rotation:
			x: @rx
			y: @ry
			z: @rz