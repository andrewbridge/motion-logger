init = ->
    # Get a reference to the canvas to work on.
    graph = {}
    window.graph = graph

    # Initialise the Stream
    # Dummy data is being used
    graph.stream = new Sky([{data: {event: "start", startTime: 1417479021913}, time: 0}, {data: {event: "ping", datapoints: {x: 30, y: 30}}, time: 0}, {data: {event: "ping", datapoints: {x: 45, y: 45}}, time: 5000}, {data: {event: "ping", datapoints: {x: 67, y: 100}}, time: 10000}, {data: {event: "ping", datapoints: {x: 80, y: 4}}, time: 15000}])
    # Initialise the plotter
    # Don't use that string selector in production!
    graph.plotter = new Plotter("canvas", [{min: 0, max: 180}, {min: 0, max: 180}])
    # Initialise the animator
    graph.animator = new Animator quickPick, graph.plotter.plotPoint.bind(graph.plotter)

    true

document.addEventListener "DOMContentLoaded", init, false

# Dummy drawer function
quickPick = ->
    val = window.graph.stream.pick(0)
    console.log val
    if val
        while (val[0].data.event == "start")
            val = window.graph.stream.pick(0)
        {values: [val[0].data.datapoints.x, val[0].data.datapoints.y], time: val[0].time}
    else
        false