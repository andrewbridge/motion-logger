#!/usr/bin/env node

/**
 * Common methods used by the keypress detector and learner
 *
 * Created by Andrew on 25/02/2015.
 */

var fs = require('fs'); // FileSystem

/**
 * getVectorMagnitude
 *
 * Finds a 2d vector's magnitude given the magnitude of both planes.
 *
 * @param x The magnitude of the first plane.
 * @param y The magnitude of the second plane.
 * @return number The magnitude of the vector.
 */
exports.getVectorMagnitude = function(x, y) {
    return Math.sqrt(Math.pow(x, 2)+Math.pow(y, 2));
}

exports.normaliseWeights = function(weightObj) {
    var sum = 0;
    for (var prop in weightObj) {
        if (weightObj.hasOwnProperty(prop)) {
            sum += weightObj[prop];
        }
    }
    for (var prop in weightObj) {
        if (weightObj.hasOwnProperty(prop)) {
            weightObj[prop] = weightObj[prop]/sum;
        }
    }
};

// An array map function which requires the type of datapoint to be picked out, to be bound to it in the call to map.
// e.g. datapoints.map(pickOutValues.bind(this, "oBeta"));
exports.pickOutValues = function(type, val, ind, arr) {
    var sensor, plane, ret;
    for (var i = 0; i < dataPointArr.length; i++) {
        switch(type.substring(0,1)) {
            case "o":
                sensor = "orientation";
                break;
            case "r":
                sensor = "rotation";
                break;
            case "a":
                sensor = "acceleration";
                break;
        }
        switch(type.substring(1).toLowerCase()) {
            case "beta":
            case "x":
                plane = "x";
                break;
            case "gamma":
            case "y":
                plane = "y";
                break;
            case "alpha":
            case "z":
                plane = "z";
                break;
            case "zy":
            case "zx":
            case "xy":
            case "xz":
            case "yx":
            case "yz":
                // Combined vectors
                var split = type.substring(1).toLowerCase().split("");
                ret = lib.getVectorMagnitude(val.data.datapoints[sensor][split[0]], val.data.datapoints[sensor][split[1]]);
                break;
        }
        return (typeof sensor != "undefined" && typeof plane != "undefined") ? (ret||val.data.datapoints[sensor][plane]) : NaN;
    }
};

//Loads multiple configuration files into one configuration object
//Pass it as many paths to json files as required, any duplicates will be overwritten
exports.loadConfigs = function() {
    var config = {};
    for (var i = 0; i<arguments.length; i++) {
        var obj = JSON.parse(fs.readFileSync(arguments[i], "utf8")); // Load in file
        for (var item in obj) {
            if (obj.hasOwnProperty(item)) {
                config[item] = obj[item];
            }
        }
    }
    return config;
};
