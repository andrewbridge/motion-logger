#!/usr/bin/env node

/**
 * Tests the detector
 *
 * Created by Andrew Bridge on 24/02/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('../common.js'); // Common functions
var fs = require('fs'); // FileSystem
var config = lib.loadConfigs("../detector-config.json", "./config.json"); //Load in global and local configs
var save = require('save'); //Database interface
var saveMongodb = require('save-mongodb');
var Db = require('mongodb').Db; //MongoDB Database object
var DbServer = require('mongodb').Server; //MongoDB Server object
var learner = require('../learners.js')('brain'); //Neural Network;
var currentRecord = 0;
var cache = [];//{oBeta: [], oGamma: [], aZY: []};
var netDat = JSON.parse(fs.readFileSync("./area_detection_data.json", "utf8"));
var networks = {oBeta: learner.newLearner().fromJSON(netDat.oBetaPress), oGamma: learner.newLearner().fromJSON(netDat.oGammaPress), aZY: learner.newLearner().fromJSON(netDat.aZYPress)};
var downUpDiff = []; // Min and Max difference between keydown and keyup events.
var promExtractor = function(resolve, reject) {this.resolve = resolve; this.reject = reject;};

var subjSaveDb = new Db('TestSubjects', new DbServer('localhost', 27017, {})) //Initialisation of the TestSubjects database
    , subjCol; //Initialising db interface object

var testProm = {};
var testDone = new Promise(promExtractor.bind(testProm));

subjSaveDb.open(function (error, connection) {
    if (error) {
        testProm.reject("Error opening TestSubjects database! " + JSON.stringify(error.errors));
        return false;
    }

    connection.collection('sessions', function (error, collection) {
        if (error) {
            testProm.reject("Error choosing TestSubjects collection! " + JSON.stringify(error.errors));
            return false;
        }
        console.log("Chosen TestSubjects collection, successful connection...");
        subjCol = save('TestSessions', {engine: saveMongodb(collection)});
        testProm.resolve();
    });
});

Promise.all([testDone]).then(finishSetup, function() {
    console.log("ERROR: An error occurred opening the databases.");
    throw new Error("An error occurred opening the databases.");
});

function finishSetup() {
    subjCol.count({}, function(cnterr, data) {
        if (cnterr) {return new Error("There was an error counting the data items.");}
        if (data > currentRecord) {
            subjCol.find({}, function(findErr, data) {
                if (findErr) {return new Error("There was an error choosing a data item.");}
                try {
                    console.log("Attempting to select record for learning. Trying record: "+currentRecord);
                    var finalData = data[currentRecord].data;
                    console.log("Selection and parsing successful. Sending for prep.");
                    currentRecord++;
                    learn(finalData);
                } catch (e) {
                    return new Error("There was an error parsing the test data.");
                }
            });
        } else {
            console.log("Beginning to test networks.");
            var hits = {overall: 0, oBeta: 0, oGamma: 0, aZY: 0};
            console.log(cache.length);
            for (var i = 0; i < cache.length; i++) {
                console.log("Testing record "+(i+1)+" of "+cache.length);
                var certainty = 0;
                var areas = [];
                for (var area in cache[i].oBeta.output) {
                    if (cache[i].oBeta.output[area] == 1) {
                        areas.push(area);
                    }
                }
                for (var measure in networks) {
                    if (networks.hasOwnProperty(measure) && (measure == "oGamma" || measure == "aZY" )) {
                        var press = cache[i][measure];
                        var output = networks[measure].run(press.input);
                        var pick = findHighestAct(output);
                        if (pick && pick[0] == findHighestAct(press.output)[0] && pick[1] > 0.45) {
                            certainty += pick[1]/2;
                            hits[measure]++;
                        } else {
                            console.log(measure, pick[0], pick[1], findHighestAct(press.output)[0], output[findHighestAct(press.output)[0]], press.output);
                        }
                    }
                }
                hits.overall += (certainty > 0.45) ? 1 : 0;
            }
            hits.prctScs = (hits.overall/cache.length)*100;
            /*var dataObj = {
                downUpRange: JSON.stringify(downUpDiff),
                oBetaPress: networks.oBeta.toJSON(),
                oGammaPress: networks.oGamma.toJSON(),
                aZYPress: networks.aZY.toJSON()
            };*/
            fs.appendFile("./results.txt", JSON.stringify(hits)+" //0.45 Net Certainty, 0.45 Overall certainty, Real answer check off, All networks\n", function(err) {
                if (err) {
                    console.log("An issue occurred saving the result data.");
                } else {
                    console.log("Test result data saved.");
                }
                console.log("Finished testing!"+JSON.stringify(hits));
                process.exit(0);
            });
        }
    });
}

function findHighestAct(outObj) {
    var highest = ["", 0];
    for (var item in outObj){
        if (outObj.hasOwnProperty(item)) {
            highest = (highest[1] < outObj[item]) ? [item, outObj[item]] : highest;
        }
    }
    return (highest[0] != "") ? highest : null;
}

//This function takes the first index of an array as an origin and finds the differences for each index afterwards.
//It then uses the maxRange to calculate the difference as a percentage of the maxRange if it's given.
function normaliseArrData(arr, maxRange) {
    maxRange = (typeof maxRange == "undefined") ? 100 : maxRange;
    if (arr.length > 0) {
        var origin = arr[0][1];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            arr[i][1] = ((arr[i][1]-origin)/maxRange);
        }
    }

    return arr;
}

function findRange(arr, retArr) {
    var maxMin = [0,0];
    var len = arr.length;
    for (var i = 0; i < len; i++) {
        var datum = arr[i][1];
        maxMin[0] = (datum < maxMin[0]) ? datum : maxMin[0];
        maxMin[1] = (datum > maxMin[1]) ? datum : maxMin[1];
    }
    return (retArr) ? maxMin : Math.abs(maxMin[1]-maxMin[0]);
}

function arrToBrainFormat(outputVal, val) {
    return {input: val, output: outputVal};
}

function splitArr(arr, splitStart, splitEnd) {
    var front = arr.slice(0,splitStart);
    var back = arr.slice(splitEnd+1);
    return [front, back];
}

function pruneArr(arr, limit) {
    var ret = [];
    for (var i = 0; i < arr.length; i++) {
        var ar = arr[i].slice(0); //Take a copy
        while (ar.length >= limit) {
            ret.push(ar.splice(0,limit));
        }
    }
    return ret;
}

function findCharArea(arr, char) {
    var ret = {};
    for (var i = 0; i < arr.length; i++) {
        var areaDef = arr[i];
        if (areaDef.chars.indexOf(char) > -1) {
            ret[areaDef.name] = 1;
        } else {
            ret[areaDef.name] = 0;
        }
    }
    return ret;
}

function insertToArea(areaArr, areaStrObj, data) {
    areaArr.push(arrToBrainFormat(areaStrObj, data.map(function(v) {return v[1];})));
}

function learn(dataArr) {
    console.log("Beginning prep...");
    var stream = require("./clouded-sky.js").init(dataArr);
    var datapoint;
    var exit = false;
    var hasPress = false;
    var firstResponseThreshold = config.firstResponseThreshold; //Wait a second and a quarter before assuming a dud dataset.
    var trailLen = config.trailLength;
    var trailCountDown = NaN, quadHits, postTrailArr;
    var trailAcceptanceThreshold = config.trailAcceptanceThreshold; // The smallest range that should be exhibited in a trail for it to be included.
    // The ranges that each value could exhibit.
    // aZ and aY are estimations based on testing and the fact that acceleration of gravity is 9.82m/s
    var ranges = config.sensorRanges;
    var areas = (config.areas > 0 && config.areaDefinitions instanceof Array && config.areaDefinitions.length == config.areas) ? config.areaDefinitions : process.exit(1);
    var keyset = config.keySet;
    var oBeta = {pings: [], presses: []};
    var oGamma = {pings: [], presses: []};
    var aZY = {pings: [], presses: []};
    // pings - All the pings in the dataset
    // prePress - Contains arrays of [trailLen] pings before each keydown (keydown is included too, making [trailLen+1] values)
    // postPress - Contains arrays of [trailLen] pings after each keyup (keyup is included too, making [trailLen+1] values)
    var downTime;
    var count = 0;
    var strmLen = stream.store.length;
    while((datapoint = stream.pick(0)[0]) && !exit) {
        count++;
        if (Boolean(process.stdout.isTTY)) {
            process.stdout.write("Prepping datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
        } else {
            console.log("Prepping datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
        }
        switch(datapoint.data.event) {
            case "ping":
                if (datapoint.time > firstResponseThreshold && (!datapoint.data.datapoints.orientation.x || !datapoint.data.datapoints.orientation.y
                    || !datapoint.data.datapoints.acceleration.z || !datapoint.data.datapoints.acceleration.y)) {
                    exit = true;
                } else if ((datapoint.data.datapoints.orientation.x && datapoint.data.datapoints.orientation.y
                    && datapoint.data.datapoints.acceleration.z && datapoint.data.datapoints.acceleration.y)) {
                    oBeta.pings.push([datapoint.time, datapoint.data.datapoints.orientation.x]);
                    oGamma.pings.push([datapoint.time, datapoint.data.datapoints.orientation.y]);
                    aZY.pings.push([datapoint.time, lib.getVectorMagnitude(datapoint.data.datapoints.acceleration.z, datapoint.data.datapoints.acceleration.y)]);
                    if (!isNaN(trailCountDown) && typeof quadHits == "object") {
                        if (trailCountDown == 0) {
                            trailCountDown = NaN;
                            var oBetaTrail = normaliseArrData(lib.fitIn(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length), [postTrailArr.time, postTrailArr.oBeta]), ranges.oBeta);
                            if (findRange(oBetaTrail) != trailAcceptanceThreshold) {insertToArea(oBeta.presses, quadHits, oBetaTrail);}
                            var oGammaTrail = normaliseArrData(lib.fitIn(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length), [postTrailArr.time, postTrailArr.oGamma]), ranges.oGamma);
                            if (findRange(oGammaTrail) != trailAcceptanceThreshold) {insertToArea(oGamma.presses, quadHits, oGammaTrail);}
                            var aZYTrail = normaliseArrData(lib.fitIn(aZY.pings.slice(aZY.pings.length-trailLen, aZY.pings.length), [postTrailArr.time, postTrailArr.aZY]), ranges.aZY);
                            if (findRange(aZYTrail) != trailAcceptanceThreshold) {insertToArea(aZY.presses, quadHits, aZYTrail);}
                            postTrailArr = undefined;
                            quadHits = undefined;
                        } else {
                            trailCountDown--;
                        }
                    }
                }
                break;
            case "keyup":
                //Note that we can get away with using fromCharCode here, because we're only looking for the English alphabet and space
                var char = String.fromCharCode(datapoint.data.keyInfo.code).toLowerCase();
                if (keyset.indexOf(char) > -1) {
                    trailCountDown = trailLen - 1;
                    quadHits = findCharArea(areas, char);
                    postTrailArr = {oBeta: datapoint.data.datapoints.orientation.x, oGamma: datapoint.data.datapoints.orientation.y,
                        aZY: lib.getVectorMagnitude(datapoint.data.datapoints.acceleration.z, datapoint.data.datapoints.acceleration.y), time: datapoint.time};
                    hasPress = true;
                }

                break;
        }
        if (!stream.isEmpty()) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);  // return cursor
        } else {
            process.stdout.write("\n");
        }
    }
    if (!exit && hasPress) {
        console.log("Prep complete!");
        var data = [];
        for (var i = 0; i < oBeta.presses.length; i++) {
            data.push({oBeta: oBeta.presses[i], oGamma: oGamma.presses[i], aZY: aZY.presses[i]});
        }

        console.log("Adding to data cache");
        try {
            cache = cache.concat(data);
        } catch (e) {
            console.log(e);
        }

    } else {
        console.log("This set of data exited early. Current record: "+currentRecord);
    }
    finishSetup();
    // TODO: Basically repeat but for quadrants (need to loop through data and split data into quadrants) (not here, separate)
}
