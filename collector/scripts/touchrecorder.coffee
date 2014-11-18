class TouchRecorder
	constructor: (@pingRate = 500, @stream = new Stream(), @mtntrckr = new MotionTracker(), start = true, @events = "keydown keyup") ->
		@initialiseEvents()
		@running = start
		if start
			@start()

	deconstructor: ->
		@stop()

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
			@destroyErr()

	pause: ->
		if @running?
			@running = false
		else
			@destroyErr()

	stop: ->
		@destroyEvents()
		# Destroy self
		for key, val of this
			delete this[key]
		true

	recordEvent: (e) ->
		if @running? and @running
			streamEntry = {event: e.type, datapoints: @mtntrckr.getSnapshot()}
			if e.keyCode? and e.keyIdentifier?
				streamEntry.keyInfo = {code: e.keyCode, indent: e.keyIdentifier}
			@stream.add streamEntry
			# Add an aftershock for detailed second readings of logged events
			if e instanceof Event and e.type is not "aftershock"
				e.type = "aftershock"
				for i in [1..3]
					setTimeout(@recorder, 50*i, e)
		else if not @running?
			@destroyErr

	destroyErr: ->
		console.error "This instance of TouchRecorder has been destroyed, please create a new instance."