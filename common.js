#!/usr/bin/env node

/**
 * Common methods used by the keypress detector and learner
 *
 * Created by Andrew on 25/02/2015.
 */

var fs = require('fs'); // FileSystem
var Dict = require("./dict.js"); //Dictionary module

/**
 * getVectorMagnitude
 *
 * Finds a 2d vector's magnitude given the magnitude of both planes.
 *
 * @param x The magnitude of the first plane.
 * @param y The magnitude of the second plane.
 * @return number The magnitude of the vector.
 */
exports.getVectorMagnitude = getVectorMagnitude;
function getVectorMagnitude(x, y) {
    return Math.sqrt(Math.pow(x, 2)+Math.pow(y, 2));
}

exports.normaliseWeights = normaliseWeights;
function normaliseWeights(weightObj) {
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
exports.pickOutValues = pickOutValues;
function pickOutValues(type, val, ind, arr) {
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
exports.loadConfigs = loadConfigs;
function loadConfigs() {
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

//Fit an event into an array of events by the time they occurred.
exports.fitIn = fitIn;
function fitIn(arr, sampleArr) {
    if (sampleArr[0] <= arr[0][0]) {
        return [sampleArr].concat(arr);
    }
    if (sampleArr[0] >= arr[arr.length - 1][0]) {
        return arr.concat(sampleArr);
    }
    for (var i = 0; i < arr.length - 1; i++) {
        var time = arr[i][0];
        var nextTime = arr[i + 1][0];
        if (sampleArr[0] >= time && sampleArr[0] <= nextTime) {
            arr.splice(i + 1, 0, sampleArr);
            return arr;
        }
    }
    return null;
};

exports.charSetTrim = charSetTrim;
function charSetTrim(str, charSet, escapeSpecials) {
    if (escapeSpecials) {charSet = charSet.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");} // Escape any characters special to regex
    return str.replace(new RegExp("^[^"+charSet+"]+|[^"+charSet+"]+$", "g"), "");
};

exports.loadSamples = loadSamples;
function loadSamples() {
    var samplePrep = (typeof arguments[arguments.length-1] == "function") ? arguments[arguments.length-1] : false;
    var ret = "";
    for (var i = 0; i < arguments.length && typeof arguments[i] == "string"; i++) {
        var sample = fs.readFileSync(arguments[i], "utf8").toString();
        ret += (samplePrep) ? samplePrep(sample) : sample;
    }
    return ret.replace(/\n|\r/g, " ").replace(/  /g, " ");
};

exports.stripBoilerPlate = stripBoilerPlate;
function stripBoilerPlate(text) {
    var start = (text.indexOf("*** START OF THIS PROJECT GUTENBERG EBOOK")||text.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK"));
    var end = (text.indexOf("*** END OF THIS PROJECT GUTENBERG EBOOK")||text.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK"));
    var reduction = (start > -1 && end > -1) ? text.substring(start, end) : text;
    return reduction.replace(/^.+?(\n|\r)/, "");
}

exports.columnizeStr = columnizeStr;
function columnizeStr(str, params) {
    var arr = str.split((params.colDiv||"\n"));
    var ret = "";
    var pad = (params.cellPadding||"\t")
    if (params.columnHeight && !params.columnNum || params.columnNum && !params.columnHeight) {
        var columnHeight = (params.columnNum) ? arr.length/params.columnNum : (params.columnHeight || arr.length);
        var columnNum = (params.columnHeight) ? Math.ceil(arr.length / columnHeight) : params.columnNum;
        var largestNum = arr.reduce(function(p, v) {return (p.length > v.length) ? p : v;}).trim().length;
        for (var x = 0, spaceOffset = ""; x < largestNum; x++) {
            spaceOffset += " ";
        }
        for (var i = 0; i < columnHeight; i++) {
            var valsLeft = false;
            for (var n = 0; n < columnNum; n++) {
                var cell = arr[i + (columnHeight * n)];
                ret += (cell) ? cell + spaceOffset.substr(0, spaceOffset.length - cell.length) + pad : "";
                valsLeft = (cell) ? true : valsLeft;
            }
            if (!valsLeft) {
                i = columnHeight;
            } else {
                ret += "\n";
            }
        }
    } else {
        if (params.columnHeight && params.columnNum) {console.error("You can't specify both columnHeight and columnNum, one must dictate the other.");}
        ret = str;
    }
    return ret;
}

//Credit to: http://stackoverflow.com/questions/1069666/sorting-javascript-object-by-property-value
exports.sortObj = sortObj;
function sortObj(obj, descending) {
    descending = (descending) ? descending : true;
    var sortable = [];
    for (var itm in obj) {
        sortable.push([itm, obj[itm]]);
    }
    sortable.sort(function(a, b) {return (descending) ? b[1] - a[1] : b[1] - a[1];});
    return sortable;
}

// Credit to: http://stackoverflow.com/questions/2454295/javascript-concatenate-properties-from-multiple-objects-associative-array
exports.concatObj = concatObj;
function concatObj() {
    var ret = {};
    var len = arguments.length;
    for (var i=0; i<len; i++) {
        for (p in arguments[i]) {
            if (arguments[i].hasOwnProperty(p)) {
                ret[p] = arguments[i][p];
            }
        }
    }
    return ret;
}

exports.sortAndPrettyPrint = sortAndPrettyPrint;
function sortAndPrettyPrint(obj, columnParams) {
    var columnHeight = (typeof columnParams == "number") ? columnParams : columnParams.columnHeight;
    columnParams = (columnParams) ? {columnHeight: columnHeight, columnNum: columnParams.columnNum} : undefined;
    var sortedArr = sortObj(obj);
    var ret = "";
    for (var i = 0; i < sortedArr.length; i++) {
        var keyVal = sortedArr[i];
        ret += keyVal[0] + ": " + keyVal[1] + "\n";
    }
    return (columnParams) ? columnizeStr(ret, columnParams) : ret;
}

exports.loadDict = loadDict;
function loadDict(fileName, wordArr, regCharSet) {
    return new Dict(fileName, wordArr, regCharSet);
}

exports.getArea = getArea;
function getArea(char, areaArr) {
    for (var i = 0; i < areaArr.length; i++) {
        var area = areaArr[i];
        if (area.chars.indexOf(char) > -1) {
            return area.name;
        }
    }
}