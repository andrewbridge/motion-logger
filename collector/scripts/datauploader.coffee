class DataUploader
	constructor: (@url, @stream, @autostart = true, @pingRate = 5000, @minDataSet = 10, @retryLimit = 7) ->
		if not @stream instanceof Stream
			console.error "The stream object has either not been provided or is not a Stream object."
		if not @url?
			console.error "A URL endpoint must be provided in order to upload data."
		if @autostart
			@start()

	deconstructor: ->
		@upload()
		if not isNaN @pingUID
			@pause()
		@start = -> false

	ping: ->
		if not @stream.isEmpty(@minDataSet)
			@pause()
			@upload()
		else if isNaN @pingUID
			@start()

	pause: ->
		clearInterval(@pingUID)
		@pingUID = NaN

	start: ->
		if not @sessionUID?
			@getUID(@startCB.bind this)
		else if isNaN @pingUID
			@startCB()
		true

	startCB: ->
		@pingUID = setInterval(@ping.bind(this), @pingRate)
		true

	error: (type, e) ->
		switch type
			when "network"
				alert "Unfortunately the test page has lost contact with the server and is unable to reconnect.\n\nPlease reload the page."
			else
				alert "An unexpected error occurred which could not be recovered from.\n\nPlease reload the page."

		if e?
			console.error e
		true

	getUID: (cb) ->
		error = console.error.bind console, "Retrieving a UID was unsuccessful."
		request = new XMLHttpRequest()
		request.open 'POST', @url+"/newsession", true
		request.setRequestHeader 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'
		that = this
		request.onload = ->
			if (request.status >= 200 && request.status < 400)
				try
					that.sessionUID = JSON.parse(request.responseText).id
					cb()
					return true
				catch e
					@error "network", e
					return false
			else
				@error "network", e
			false
		request.onerror = @error.bind this, "network"
		request.send "clientEnvr="+JSON.stringify @getEnvrObj()
		true

	getEnvrObj: ->
		try
			screenObj = document.body.getBoundingClientRect()
		catch e
			screenObj = {height: screen.height, width: screen.width}

		os: navigator.platform
		browser:
			userAgent: navigator.userAgent
			vendor: navigator.vendor
			language: JSON.stringify (navigator.languages||[navigator.language])
		screen: JSON.stringify screenObj

	upload: (setData, retryAttempt) ->
		data = (setData||@stream.sweep())
		request = new XMLHttpRequest()
		request.open 'PUT', @url+"/session/"+@sessionUID, true
		request.setRequestHeader 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'
		request.onload = @ping.bind(this)
		request.onerror = if not isNaN(retryAttempt) and retryAttempt >= @retryLimit then @error.bind this, "network" else setTimeout.bind window, @upload.bind(this, data, (parseInt(retryAttempt)+1||1)), @pingRate
		request.send "data="+JSON.stringify data
		true
