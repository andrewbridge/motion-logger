initDataFeed = ->
    if (window.DeviceOrientationEvent? or window.OrientationEvent? or window.DeviceMotionEvent?) and typeof window.ontouchstart isnt "undefined"
        touchrec = new TouchRecorder(50)
        stream = touchrec.stream
        motiontrck = touchrec.mtntrckr
        dataupldr = new DataUploader(window.location.protocol+'//'+window.location.hostname+':8080', stream, false)
        window.motionTracking = {touchrec: touchrec, stream: stream, motiontrck: motiontrck, dataupldr: dataupldr}
        true
    else
        console.error "This system requires a touchscreen and motion sensors in order to run correctly."
        alert "Unfortunately, your device appears to be unsupported. You must be using a device with a touchscreen and"+
              " an accelerometer or orientation sensor. Most smart phones and tablets have these as standard.\n\n"+
              "If you think you're seeing this message in error, you can let me know by email (ab@shrew.me) or Twitter"+
              " (@andrewbridge).\n\n"+
              "Sorry the inconvenience, and thank you anyway!"
        false

apocalypseNow = ->
    window.motionTracking.touchrec.deconstructor()
    window.motionTracking.motiontrck.deconstructor()
    window.motionTracking.stream.deconstructor()
    window.motionTracking.dataupldr.deconstructor()
    window.apocalypseNow = ->
        false
    true

document.addEventListener "DOMContentLoaded", initDataFeed, false