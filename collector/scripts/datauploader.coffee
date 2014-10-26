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
		@pingUID = setInterval(@ping.bind(this), @pingRate)

	upload: ->
		data = @stream.sweep()
		request = new XMLHttpRequest()
		request.open 'POST', @url, true
		request.setRequestHeader 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'
		request.send JSON.stringify(data)
		@ping()
		true
