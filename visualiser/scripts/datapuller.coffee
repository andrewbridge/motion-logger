class DataPuller
  constructor: (@url, @autostart = true, @retryLimit = 7) ->
    @pingRate = 5000
    if not @url?
      console.error "A URL endpoint must be provided in order to upload data."
    if @autostart
      @start()

    @resolvers = {}
    getResolvers = (resolve, reject) -> this.resolve = resolve; this.reject = reject
    ret = new Promise getResolvers.bind(@resolvers)
    return ret

  deconstructor: ->
    @start = -> false

  start: ->
    if not @sessionUID?
      @getUID(@startCB.bind this)
    else
      @startCB()
    true

  startCB: ->
    @download()
    true

  error: (type, e) ->
    switch type
      when "network"
        msg = "Unfortunately the test page has lost contact with the server and is unable to reconnect.\n\nPlease reload the page."
        @resolvers.reject msg
      when "parsing"
        msg = "A parsing error occurred while retrieving data.\n\nIf this persists, reload the page."
        @resolvers.reject msg
      else
        msg = "An unexpected error occurred which could not be recovered from.\n\nPlease reload the page."
        @resolvers.reject msg

    if e?
      console.error e
    true

  getUID: (cb) ->
    error = console.error.bind console, "Retrieving a UID was unsuccessful."
    request = new XMLHttpRequest()
    request.open 'GET', @url+"/newsession", true
    that = this
    request.onload = ->
      console.log "hit"
      if (request.status >= 200 && request.status < 400)
        console.log "hit"
        try
          console.log "hat"
          that.sessionUID = JSON.parse(request.responseText).id
          console.log "hot"
          cb()
          return true
        catch e
          console.log "hit"
          that.error "network", e
          return false
      else
        @error "network", e
      false
    request.onerror = @error.bind this, "network"
    request.send()
    true

  download: ->
    console.log "wow"
    request = new XMLHttpRequest()
    request.open 'GET', @url+"/getnewdata/"+@sessionUID, true
    request.addEventListener "load", @setData.bind(this), false
    request.send()
    true

  setData: (evt) ->
    console.log "wut"
    if evt.currentTarget.status is 404
      @resolvers.reject "There are no sessions available to run."
    else
      try
        data = JSON.parse evt.currentTarget.response
      catch e
        @error "parsing", e
      console.log data
      @sky = new Sky(data)
      @resolvers.resolve @sky
