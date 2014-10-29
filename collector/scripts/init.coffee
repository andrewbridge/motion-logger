init = ->
    if (window.DeviceOrientationEvent? or window.OrientationEvent?) and typeof window.ontouchstart isnt "undefined"
        touchrec = new TouchRecorder()
        stream = touchrec.stream
        motiontrck = touchrec.mtntrckr
        dataupldr = new DataUploader(window.location.protocol+'//'+window.location.hostname+':8080', stream)
        window.motionTracking = {touchrec: touchrec, stream: stream, motiontrck: motiontrck, dataupldr: dataupldr}
        true
    else
        console.error "This system requires a touchscreen and motion sensors in order to run correctly."
        false

document.addEventListener "DOMContentLoaded", init, false