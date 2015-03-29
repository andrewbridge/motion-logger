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

exports.createDict = createDict;
function createDict(regCharSet, dict, curVal, ind, arr) {
    if (Boolean(process.stdout.isTTY)) {
        if (ind != 0 && ind % 499 == 0) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);  // return cursor
            process.stdout.write("Word " + ind + " of " + arr.length + " ("+Math.round((ind/arr.length)*100)+"%)");
        } else if (ind == 0) {
            console.log("Creating dictionary from sample text...");
        } else if (ind == arr.length-1) {
            process.stdout.write("\n");
        }
    } else {
        console.log("Word "+ind+" of "+arr.length);
    }
    if (charSetTrim(curVal, "a-z").length != 0) {
        curVal = charSetTrim(curVal.toLowerCase(), regCharSet);
        var vArr = (curVal.indexOf("-") > -1) ? curVal.split("-") : [curVal];
        for (var i = 0; i < vArr.length; i++) {
            var vIt = vArr[i].replace(/'/g, ""); //Apostrophes are the last exception of punctuation in a word I can think of
            //Get rid of words with accented characters, they're not English, so would skew results
            //if (!vIt.match(/[\u00C0-\u017F]/g)) {
            if (vIt.match(new RegExp("^[" + regCharSet + "]+$", "g"))) {
                if (dict.indexOf(vIt) == -1 && (vIt.length > 1 || (vIt == "a" || vIt == "i"))) { // Note this exception, if you want characters to be words, remove it!
                    dict.push(vIt);
                }
            }
        }
    }
    return dict;
}

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
    try {
        var dict = JSON.parse(fs.readFileSync(fileName, "utf8"));
    } catch (e) {
        // If the file doesn't exist. Generate it and create it.
        if (e.code == "ENOENT" && wordArr && regCharSet) {
            dict = wordArr.reduce(createDict.bind(this, regCharSet), []);
            fs.writeFileSync("./dict.txt", JSON.stringify(dict));
            console.log("New dictionary produced and saved.\n"+dict.length+" words.");
        } else {
            console.error("An error occurred loading the dictionary.", e);
            process.exit(1);
        }
    }
    return dict;
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