class Animator
  constructor: (@drawer, @autostart = true, @speed = 100) ->
    # Collect all the browser prefixed versions into one variable
    @raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
    if @autostart and @drawer?
      @start()
    else
      @stop()

  animate: (lastAnimTime) ->
    # Get the current time (The value we created in setup will not update)
    time = new Date().getTime()

    # Get the difference between the time last animated (or on setup) and now
    timeDiff = time - lastAnimTime

    # Pass the time difference to the drawer
    @drawer timeDiff

    # Check to see if the square is at the edge
    if @running
      # Request a new frame and call this function again
      @raf(@animate.bind(this, time))
      true
    else
      false

    start: ->
      @animate new Date().getTime()
      @running = true
      true

    stop: ->
      @running = false
      true