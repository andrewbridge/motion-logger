class TouchRecorder
	constructor: (@pingRate = 500, @stream = new Stream(), @mtntrckr = new MotionTracker(), start = true, @events = "keydown keyup") ->
		@initialiseEvents()
		@running = start
		if start
			@start()

	initialiseEvents: ->
		@recorder = @recordEvent.bind this
		@evtArr = @events.split(" ")
		window.addEventListener evt, @recorder, false for evt in @evtArr
		if @pingRate > 0
			@pingUID = setInterval(@recorder, @pingRate, {type: "ping"})
		else
			@pingUID = NaN
		true

	destroyEvents: ->
		if @evtArr?
			window.removeEventListener evt, @recorder for evt in @evtArr
			if not isNaN @pingUID
				clearInterval @pingUID
			true
		else
			false

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
		@destroyEvents()
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