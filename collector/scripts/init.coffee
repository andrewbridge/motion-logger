//Find out if the feature's available.
    this.compatible = "none";
    if (window.DeviceOrientationEvent) {
        console.log("DeviceOrientation is supported");
        this.compatible = "standards";
    } else if (window.OrientationEvent) {
        console.log("MozOrientation is supported");
        this.compatible = "moz-alternative";
    }

    function is_touch_device() {
 return (('ontouchstart' in window)
      || (navigator.MaxTouchPoints > 0)
      || (navigator.msMaxTouchPoints > 0));
}
 
if (!is_touch_device()) {
 document.getElementById('touchOnly').style.display='none';
}