quadPress = ->
  resultBox = document.querySelector(".results")
  orientationBox = resultBox.querySelector("#orientation")
  accelBox = resultBox.querySelector("#acceleration")
  rotBox = resultBox.querySelector("#rotation")
  if orientationBox? and accelBox? and rotBox?
    handleSnapshot window.qate.motiontracker.getSnapshot(), orientationBox, accelBox, rotBox
  true

handleSnapshot = (snapshotObj, o, a, r) ->
  printDetails o, snapshotObj.orientation
  printDetails a, snapshotObj.acceleration
  printDetails r, snapshotObj.rotation
  true

printDetails = (elm, coords) ->
  elm.querySelector(".x").innerHTML = coords.x
  elm.querySelector(".y").innerHTML = coords.y
  elm.querySelector(".z").innerHTML = coords.z
  true

init = ->
  window.qate = {}
  window.qate.motiontracker = new MotionTracker()
  quad.addEventListener("click", quadPress, false) for quad in document.querySelectorAll(".quad")
  true

document.addEventListener("DOMContentLoaded", init, false)