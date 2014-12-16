###
  Plotter

  Renders and updates a graph with up to 3 axis

  @param canvas Either a string representing the selector for a canvas
                 or a element object for a canvas element. This will be
                 used to render the graph.
  @param valRanges An array of objects, each containing a "min" and "max"
                   property for each value of the graph.
  @param cumulativeRender Whether to remove previously drawn points when
                          drawing new ones.
  @param showTime Whether to render the time.
###
class Plotter
  constructor: (canvas, @valRanges, @cumulativeRender = false, @showTime = false) ->
    if typeof canvas is "string"
      @canvas = document.querySelector(canvas)
    else if canvas instanceof HTMLCanvasElement
      @canvas = canvas

    if not @canvas?
      console.error "A valid canvas selector or object must be specified."
      return false
    else
      @context = @canvas.getContext "2d"
      @width = @canvas.width
      @height = @canvas.height
      @axis = 2
      @initStyles()

    @valRanges = @valRanges.splice(0, @axis)

    #@drawAxes()
    @pathInProg = false

  initStyles: ->
    @context.lineWidth = 1
    @context.lineCap = "round"
    @context.strokeStyle = "#000"
    @graphPadding = 10
    @numIndicHeight = 5

  drawAxes: ->
    if @axis is 1
      # x axis
      @drawAxis(@valRanges[0], 0 + @graphPadding, @height - @graphPadding - @numIndicHeight)
    else if @axis is 2
      # x axis
      xOrigin = @findOrigin @valRanges[0]
      yOrigin = @findOrigin @valRanges[1]
      @drawAxis(@valRanges[0], 0 + @graphPadding, @height - @graphPadding - @numIndicHeight)
      #y axis
      @drawAxis(@valRanges[1], 0 + @graphPadding, @height - @graphPadding - @numIndicHeight)

  drawAxis: (valRange, startx, starty) ->
    halfIndic = (@numIndicHeight/2)
    xPos = startx
    yPos = starty + halfIndic
    @context.beginPath()
    @context.moveTo(xPos, yPos)
    for i in [0..@findRange(valRange)]
      yPos -= halfIndic
      @context.lineTo(xPos, yPos)
      yPos += @numIndicHeight
      @context.lineTo(xPos, yPos)
      @context.closePath()
      yPos -= halfIndic
      @context.beginPath()
      @context.moveTo(xPos, yPos)
      xPos += ((@width-@graphPadding*2)/findRange(valRange))
      @context.lineTo(xPos, yPos)
    yPos -= halfIndic
    @context.lineTo(xPos, yPos)
    yPos += @numIndicHeight
    @context.lineTo(xPos, yPos)
    @context.closePath()

  plotPoint: (pointsObj, timeElapsed, isKeyFrame) ->
    # Redraw the required points
    if not @pathInProg
      @context.beginPath()
      @pathInProg = true
      @context.moveTo(pointsObj.values[0]-@valRanges[0].min, pointsObj.values[1]-@valRanges[1].min)
    else
      @context.lineTo(pointsObj.values[0]-@valRanges[0].min, pointsObj.values[1]-@valRanges[1].min)
    if isKeyFrame
      @context.fillRect(pointsObj.values[0]-@valRanges[0].min-5, pointsObj.values[1]-@valRanges[1].min-5, 10, 10)
      @context.moveTo(pointsObj.values[0]-@valRanges[0].min, pointsObj.values[1]-@valRanges[1].min)
    @context.stroke()

  findOrigin: (valRange) ->
    range = @findRange valRange
    pog = valRange.max / range
    heightWithPadding = @height - (@graphPadding*2)
    pog * heightWithPadding

  findRange: (valRange) ->
    if valRange.range?
      valRange.range = valRange.max - valRange.min
    valRange.range