init = ->
    # Get a reference to the canvas to work on.
    graph = {}
    window.graph = graph

    # Initialise the Stream
    graph.stream = new Stream()
    # Initialise the plotter
    graph.plotter = new Plotter()
    # Initialise the animator
    graph.animator = new Animator graph.plotter.draw.bind(graph.plotter)

    true

document.addEventListener "DOMContentLoaded", init, false