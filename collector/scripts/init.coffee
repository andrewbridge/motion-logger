initDataFeed = ->
    if (window.DeviceOrientationEvent? or window.OrientationEvent?) and typeof window.ontouchstart isnt "undefined"
        touchrec = new TouchRecorder()
        stream = touchrec.stream
        motiontrck = touchrec.mtntrckr
        dataupldr = new DataUploader(window.location.protocol+'//'+window.location.hostname+':8080', stream, false)
        window.motionTracking = {touchrec: touchrec, stream: stream, motiontrck: motiontrck, dataupldr: dataupldr}
        true
    else
        console.error "This system requires a touchscreen and motion sensors in order to run correctly."
        false

apocalypseNow = ->
    window.motionTracking.touchrec.deconstructor()
    window.motionTracking.motiontrck.deconstructor()
    window.motionTracking.stream.deconstructor()
    window.motionTracking.dataupldr.deconstructor()
    true

document.addEventListener "DOMContentLoaded", initDataFeed, false