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
                  If the function returns false, animation ends.
  @param drawer   A function which takes an object with the same properties as the datafeed
                  returns as a parameter and the time elapsed as another and returns nothing.
  @param autostart A boolean as to whether animation should begin as soon as the constructor
                   finishes. Default true
  @param speed     A number representing the speed that the animation should run at. Lower than
                   1 will run the animation in slow motion. Default 1.
###
class Animator
  constructor: (@datafeed, @drawer, @autostart = true, @speed = 1) ->
    if not @datafeed? or not @drawer?
      console.error "A datafeed and drawer function must be specified."
      return false
    # Collect all the browser prefixed versions into one variable
    @raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
    @oldData = {values: [], time: -1}
    @newData = {values: [], time: -1}
    if @autostart
      @start()
    else
      @stop()

  animate: (lastAnimTime) ->
    # Get the current time
    time = @currentTimeElapsed()

    # Get the difference between the time last animated and now
    timeDiff = time - lastAnimTime

    # Get the new log of data if required
    if @newData.timeElapsed < time
      @oldData = @newData
      @newData = @datafeed()
      if @newData
        stop()
        return false

    # Run through each value, find the number of frames left and calculate the required change this time round
    i = 0
    timeLeft = (@newData.time - @oldData.time) / timeDiff # The number of frames left to complete the transition
    for val in @newData.values
      oldVal = (@oldData.values[i]||0)
      dist = val - oldVal
      valChange = dist / timeLeft
      @oldData.values[i] = oldVal + valChange
      i++

    # Pass the time difference to the drawer
    @drawer @oldData time

    # Check to see if the square is at the edge
    if @running
      # Request a new frame and call this function again
      @raf(@animate.bind(this, time))
      true
    else
      false

  currentTimeElapsed: ->
    new Date().getTime() - @startTime

  start: ->
    @running = true
    @startTime = new Date().getTime()
    @animate @currentTimeElapsed()
    true

  stop: ->
    @running = false
    true