class DataUploader
	constructor: (@url, @stream, @pingRate = 5000, @minDataSet = 10) ->
		if not @stream instanceof Stream
			console.error "The stream object has either not been provided or is not a Stream object."
		if not @url?
			console.error "A URL endpoint must be provided in order to upload data."
		@start()

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
		else
			@startCB()
		true

	startCB: ->
		@pingUID = setInterval(@ping.bind(this), @pingRate)
		true

	getUID: (cb) ->
		error = console.error.bind console, "Retrieving a UID was unsuccessful."
		request = new XMLHttpRequest()
		request.open 'GET', @url+"/newsession", true
		that = this
		request.onload = ->
			if (request.status >= 200 && request.status < 400)
				try
					that.sessionUID = JSON.parse(request.responseText).id
					cb()
					return true
				catch e
					error(e)
					return false
			else
				error()
			false
		request.onerror = error
		request.send()
		true

	upload: ->
		data = @stream.sweep()
		request = new XMLHttpRequest()
		request.open 'PUT', @url+"/session/"+@sessionUID, true
		request.setRequestHeader 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'
		request.send "data="+JSON.stringify(data)
		@ping()
		true
