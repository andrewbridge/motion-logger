###
	Sky

  Based on the Stream class but it mirrors a previously observed Stream (hence Sky)


###
class Sky
	constructor: (streamArr) ->
		@store = streamArr
		@startTime = @store[0].data.startTime

	deconstructor: ->
		@endTime = new Date().getTime()
		@add({event: "finish", endTime: @endTime})
		@add = -> false

	get: (index) -> @store[index]

	pick: (index) -> if index >= @store.length then (@store.pop()||false) else (@store.splice(index, 1)||false)

	isEmpty: (minVal = 0) ->
		@store.length < minVal