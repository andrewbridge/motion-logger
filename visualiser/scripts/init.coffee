`//Shim for promises, see mdn.io/web%20promise
if (typeof Promise == "undefined") {
    !function(){var a,b,c,d;!function(){var e={},f={};a=function(a,b,c){e[a]={deps:b,callback:c}},d=c=b=function(a){function c(b){if("."!==b.charAt(0))return b;for(var c=b.split("/"),d=a.split("/").slice(0,-1),e=0,f=c.length;f>e;e++){var g=c[e];if(".."===g)d.pop();else{if("."===g)continue;d.push(g)}}return d.join("/")}if(d._eak_seen=e,f[a])return f[a];if(f[a]={},!e[a])throw new Error("Could not find module "+a);for(var g,h=e[a],i=h.deps,j=h.callback,k=[],l=0,m=i.length;m>l;l++)"exports"===i[l]?k.push(g={}):k.push(b(c(i[l])));var n=j.apply(this,k);return f[a]=g||n}}(),a("promise/all",["./utils","exports"],function(a,b){"use strict";function c(a){var b=this;if(!d(a))throw new TypeError("You must pass an array to all.");return new b(function(b,c){function d(a){return function(b){f(a,b)}}function f(a,c){h[a]=c,0===--i&&b(h)}var g,h=[],i=a.length;0===i&&b([]);for(var j=0;j<a.length;j++)g=a[j],g&&e(g.then)?g.then(d(j),c):f(j,g)})}var d=a.isArray,e=a.isFunction;b.all=c}),a("promise/asap",["exports"],function(a){"use strict";function b(){return function(){process.nextTick(e)}}function c(){var a=0,b=new i(e),c=document.createTextNode("");return b.observe(c,{characterData:!0}),function(){c.data=a=++a%2}}function d(){return function(){j.setTimeout(e,1)}}function e(){for(var a=0;a<k.length;a++){var b=k[a],c=b[0],d=b[1];c(d)}k=[]}function f(a,b){var c=k.push([a,b]);1===c&&g()}var g,h="undefined"!=typeof window?window:{},i=h.MutationObserver||h.WebKitMutationObserver,j="undefined"!=typeof global?global:this,k=[];g="undefined"!=typeof process&&"[object process]"==={}.toString.call(process)?b():i?c():d(),a.asap=f}),a("promise/cast",["exports"],function(a){"use strict";function b(a){if(a&&"object"==typeof a&&a.constructor===this)return a;var b=this;return new b(function(b){b(a)})}a.cast=b}),a("promise/config",["exports"],function(a){"use strict";function b(a,b){return 2!==arguments.length?c[a]:(c[a]=b,void 0)}var c={instrument:!1};a.config=c,a.configure=b}),a("promise/polyfill",["./promise","./utils","exports"],function(a,b,c){"use strict";function d(){var a="Promise"in window&&"cast"in window.Promise&&"resolve"in window.Promise&&"reject"in window.Promise&&"all"in window.Promise&&"race"in window.Promise&&function(){var a;return new window.Promise(function(b){a=b}),f(a)}();a||(window.Promise=e)}var e=a.Promise,f=b.isFunction;c.polyfill=d}),a("promise/promise",["./config","./utils","./cast","./all","./race","./resolve","./reject","./asap","exports"],function(a,b,c,d,e,f,g,h,i){"use strict";function j(a){if(!w(a))throw new TypeError("You must pass a resolver function as the first argument to the promise constructor");if(!(this instanceof j))throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");this._subscribers=[],k(a,this)}function k(a,b){function c(a){p(b,a)}function d(a){r(b,a)}try{a(c,d)}catch(e){d(e)}}function l(a,b,c,d){var e,f,g,h,i=w(c);if(i)try{e=c(d),g=!0}catch(j){h=!0,f=j}else e=d,g=!0;o(b,e)||(i&&g?p(b,e):h?r(b,f):a===F?p(b,e):a===G&&r(b,e))}function m(a,b,c,d){var e=a._subscribers,f=e.length;e[f]=b,e[f+F]=c,e[f+G]=d}function n(a,b){for(var c,d,e=a._subscribers,f=a._detail,g=0;g<e.length;g+=3)c=e[g],d=e[g+b],l(b,c,d,f);a._subscribers=null}function o(a,b){var c,d=null;try{if(a===b)throw new TypeError("A promises callback cannot return that same promise.");if(v(b)&&(d=b.then,w(d)))return d.call(b,function(d){return c?!0:(c=!0,b!==d?p(a,d):q(a,d),void 0)},function(b){return c?!0:(c=!0,r(a,b),void 0)}),!0}catch(e){return c?!0:(r(a,e),!0)}return!1}function p(a,b){a===b?q(a,b):o(a,b)||q(a,b)}function q(a,b){a._state===D&&(a._state=E,a._detail=b,u.async(s,a))}function r(a,b){a._state===D&&(a._state=E,a._detail=b,u.async(t,a))}function s(a){n(a,a._state=F)}function t(a){n(a,a._state=G)}var u=a.config,v=(a.configure,b.objectOrFunction),w=b.isFunction,x=(b.now,c.cast),y=d.all,z=e.race,A=f.resolve,B=g.reject,C=h.asap;u.async=C;var D=void 0,E=0,F=1,G=2;j.prototype={constructor:j,_state:void 0,_detail:void 0,_subscribers:void 0,then:function(a,b){var c=this,d=new this.constructor(function(){});if(this._state){var e=arguments;u.async(function(){l(c._state,d,e[c._state-1],c._detail)})}else m(this,d,a,b);return d},"catch":function(a){return this.then(null,a)}},j.all=y,j.cast=x,j.race=z,j.resolve=A,j.reject=B,i.Promise=j}),a("promise/race",["./utils","exports"],function(a,b){"use strict";function c(a){var b=this;if(!d(a))throw new TypeError("You must pass an array to race.");return new b(function(b,c){for(var d,e=0;e<a.length;e++)d=a[e],d&&"function"==typeof d.then?d.then(b,c):b(d)})}var d=a.isArray;b.race=c}),a("promise/reject",["exports"],function(a){"use strict";function b(a){var b=this;return new b(function(b,c){c(a)})}a.reject=b}),a("promise/resolve",["exports"],function(a){"use strict";function b(a){var b=this;return new b(function(b){b(a)})}a.resolve=b}),a("promise/utils",["exports"],function(a){"use strict";function b(a){return c(a)||"object"==typeof a&&null!==a}function c(a){return"function"==typeof a}function d(a){return"[object Array]"===Object.prototype.toString.call(a)}var e=Date.now||function(){return(new Date).getTime()};a.objectOrFunction=b,a.isFunction=c,a.isArray=d,a.now=e}),b("promise/polyfill").polyfill()}();
}`

init = ->
    # Get a reference to the canvas to work on.
    graph = {}
    window.graph = graph
    graph.letterInfo = {}

    # Initialise the Stream
    # Dummy data is being used
    # graph.stream = new Sky([{data: {event: "start", startTime: 1417479021913}, time: 0}, {data: {event: "ping", datapoints: {x: 30, y: 30}}, time: 0}, {data: {event: "ping", datapoints: {x: 45, y: 45}}, time: 5000}, {data: {event: "ping", datapoints: {x: 67, y: 100}}, time: 10000}, {data: {event: "ping", datapoints: {x: 80, y: 4}}, time: 15000}])
    # graph.datapull = new DataPuller(window.location.protocol+'//'+window.location.hostname+':8080').then(
    graph.datapull = new DataPuller('http://motionlogger.shrew.me:8080', graph).then(
        (data) ->
          graph.stream = data;
          # Initialise the plotter
          # Don't use that string selector in production!
          graph.plotter = new Plotter "canvas", getRange(graph.stream)
          # Initialise the animator
          graph.animator = new Animator quickPick.bind(window, graph.stream), graph.plotter.plotPoint.bind(graph.plotter)
    , alert.bind(window))


    true

document.addEventListener "DOMContentLoaded", init, false

getMore = ->
  graph = window.graph
  graph.datapull = new DataPuller('http://motionlogger.shrew.me:8080', graph, graph.sessionUID).then(
    (data) ->
      graph.stream = data;
      # Initialise the plotter
      # Don't use that string selector in production!
      graph.plotter = new Plotter "canvas", getRange(graph.stream)
      # Initialise the animator
      graph.animator = new Animator quickPick.bind(window, graph.stream), graph.plotter.plotPoint.bind(graph.plotter)
  , alert.bind(window))

quickPick = (stream) ->
    val = stream.pick(0)
    if val
        console.log val
        while (eventBlacklist.indexOf(val[0].data.event) > -1 || not val)
            val = stream.pick(0)
        console.log val
        {values: [val[0].data.datapoints.orientation.x, val[0].data.datapoints.orientation.y], time: val[0].time, event: val[0].data.event, key: (val[0].data.keyInfo||{})}
    else
        false

getRange = (stream) ->
  lowest = {x: 0, y: 0}
  highest = {x: 0, y: 0}
  i = 0
  val = stream.get(i)
  while(val)
    if eventBlacklist.indexOf(val.data.event) is -1
      x = val.data.datapoints.orientation.x
      y = val.data.datapoints.orientation.y
      console.log x, y
      lowest.x = if x < lowest.x then x else lowest.x
      lowest.y = if y < lowest.y then y else lowest.y
      highest.x = if x > highest.x then x else highest.x
      highest.y = if y > highest.y then y else highest.y
    i++
    val = stream.get(i)
  [{min: lowest.x, max: highest.x}, {min: lowest.y, max: highest.y}]

eventBlacklist = ["start", "finish", "formdata", "ping"]