#!/usr/bin/env node

/**
 * The Keypress Learner takes data from the test data in the database, normalises it and trains multiple
 * neural networks with the data.
 *
 * This should probably be reorganises into a transform stream for normalisation and a learner controller.
 *
 * Created by Andrew Bridge on 16/02/2015.
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
var cache = {oBeta: [], oGamma: [], aZY: []};
var networks = {oBeta: learner.newLearner(), oGamma: learner.newLearner(), aZY: learner.newLearner()};
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
            console.log("Beginning to train networks.");
            for (var measure in networks) {
                if (networks.hasOwnProperty(measure)) {
                    console.log("Training for "+measure);

                    console.log(networks[measure].train(cache[measure], {log: true}));
                }
            }
            var dataObj = {
                downUpRange: JSON.stringify(downUpDiff),
                oBetaPress: networks.oBeta.toJSON(),
                oGammaPress: networks.oGamma.toJSON(),
                aZYPress: networks.aZY.toJSON()
            };
            fs.writeFile("./area_detection_data.json", JSON.stringify(dataObj), function(err) {
                if (err) {
                    console.log("An issue occurred saving the detection data.");
                } else {
                    console.log("Detection data saved.");
                }
                console.log("Finished learning!");
                process.exit(0);
            });
        }
    });
}

//This function takes the first index of an array as an origin and finds the differences for each index afterwards.
//It then uses the maxRange to calculate the difference as a percentage of the maxRange if it's given.
function normaliseArrData(arr, maxRange) {
    maxRange = (typeof maxRange == "undefined") ? 100 : maxRange;
    if (arr.length > 0) {
        var origin = arr[0];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            arr[i] = ((arr[i]-origin)/maxRange);
        }
    }

    return arr;
}

function findRange(arr, retArr) {
    var maxMin = [0,0];
    var len = arr.length;
    for (var i = 0; i < len; i++) {
        var datum = arr[i];
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
    areaArr.push(arrToBrainFormat(areaStrObj, data));
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
                    if (!isNaN(trailCountDown) && quadHits instanceof Array) {
                        if (trailCountDown == 0) {
                            trailCountDown = NaN;
                            var oBetaTrail = normaliseArrData(lib.fitIn(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length), [postTrailArr.time, postTrailArr.oBeta]), ranges.oBeta);
                            if (findRange(oBetaTrail) != trailAcceptanceThreshold) {insertToArea(oBeta.presses, quadHits, oBetaTrail);}
                            var oGammaTrail = normaliseArrData(lib.fitIn(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length), [postTrailArr.time, postTrailArr.oGamma]), ranges.oGamma);
                            if (findRange(oGammaTrail) != trailAcceptanceThreshold) {insertToArea(oGamma.presses, quadHits, oGammaTrail);}
                            var aZYTrail = normaliseArrData(lib.fitIn(aZY.pings.slice(aZY.pings.length-trailLen, aZY.pings.length), [postTrailArr.aZY.time, postTrailArr.aZY]), ranges.aZY);
                            if (findRange(aZYTrail) != trailAcceptanceThreshold) {insertToArea(aZY.presses, quadHits, aZYTrail);}
                            postTrailArr = undefined;
                        } else {
                            trailCountDown--;
                        }
                    }
                }
                break;
            case "keyup":
                //Note that we can get away with using fromCharCode here, because we're only looking for the English alphabet and space
                var char = String.fromCharCode(datapoint.data.keyInfo.code).toLowerCase();
                console.log(char);
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
        var data = {oBeta: oBeta, oGamma: oGamma, aZY: aZY};

        console.log("Adding to data cache");
        for (var measure in cache) {
            if (cache.hasOwnProperty(measure)) {
                console.log("Adding to "+measure);

                cache[measure] = cache[measure].concat(data[measure]);
            }
        }

    } else {
        console.log("This set of data exited early. Current record: "+currentRecord);
    }
    finishSetup();
    // TODO: Basically repeat but for quadrants (need to loop through data and split data into quadrants) (not here, separate)
}
