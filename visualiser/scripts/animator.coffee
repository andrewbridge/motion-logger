class Animator
  ###
    Animator

    Handles animation of a given set of values.

    @param datafeed A function which takes no parameters and
                    returns an object with the following properties:
                      - values: An array of values a given time. Each value
                                will be animated between after each call to the function.
                                e.g. values: [xCoord, yCoord, zCoord]
                      - timeElapsed: The number of milliseconds that had elapsed when the
                                     given values were taken.
    @param drawer   A function which takes an object with the same properties as the datafeed
                    returns as a single parameter and returns nothing.
    @param autostart A boolean as to whether animation should begin as soon as the constructor
                     finishes. Default true
    @param speed     A number representing the speed that the animation should run at. Lower than
                     1 will run the animation in slow motion. Default 1.
  ###
  constructor: (@datafeed, @drawer, @autostart = true, @speed = 1) ->
    if not @datafeed? or not @drawer?
      console.error "A datafeed and drawer function must be specified."
      return false
    # Collect all the browser prefixed versions into one variable
    @raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
    if @autostart
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