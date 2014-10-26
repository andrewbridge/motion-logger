class TouchRecorder
	constructor: (@pingRate = 500, @stream = new Stream(), @mtntrckr = new MotionTracker(), start = true) ->
		@recorder = @recordEvent.bind this
		window.addEventListener "keydown", @recorder, false
		window.addEventListener "keyup", @recorder, false
		@pingUID = setInterval(@recorder, @pingRate, {type: "ping"})
		@running = start
		if start
			@start()

	start: ->
		if @running?
			@running = true
		else
			@destoryErr()

	pause: ->
		if @running?
			@running = false
		else
			@destoryErr()

	stop: ->
		window.removeEventListener "keydown", @recorder
		window.removeEventListener "keyup", @recorder
		clearInterval(@pingUID)
		delete @pingUID
		# Destroy self
		for key, val of this
			delete this[key]
		true

	recordEvent: (e) ->
		if @running? and @running
			@stream.add {event: e.type, datapoints: @mtntrckr.getSnapshot()}
		else if not @running?
			@destoryErr

	destoryErr: ->
		console.error "This instance of TouchRecorder has been destroyed, please create a new instance."