class Stream
	constructor: ->
		@store = []
		@startTime = new Date().getTime()
		@add({event: "start", startTime: @startTime})

	add: (entryData) ->
		time = new Date().getTime()
		diff = time - @startTime
		obj = {data: entryData, time: diff}
		@store.push obj
		true

	isEmpty: (minVal = 0) ->
		@store.length < minVal

	sweep: ->
		@store.splice(0, @store.length)