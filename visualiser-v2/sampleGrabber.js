/**
 * Created by Andrew on 18/03/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('../common.js'); // Common functions
var fs = require('fs'); // FileSystem
var config = lib.loadConfigs("../detector-config.json", "../keypress-detector/config.json"); //Load in global and local configs
var save = require('save'); //Database interface
var saveMongodb = require('save-mongodb');
var Db = require('mongodb').Db; //MongoDB Database object
var DbServer = require('mongodb').Server; //MongoDB Server object
var currentRecord = 11; // Because I know this worked in the learning round
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
                    sample(finalData);
                } catch (e) {
                    return new Error("There was an error parsing the sample data.");
                }
            });
        }
    });
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
        var datum = arr[i];
        maxMin[0] = (datum < maxMin[0]) ? datum : maxMin[0];
        maxMin[1] = (datum > maxMin[1]) ? datum : maxMin[1];
    }
    return (retArr) ? maxMin : Math.abs(maxMin[1]-maxMin[0]);
}

function fitIn(arr, sampleArr) {
    if (sampleArr[0] <= arr[0][0]) {
        return sampleArr.concat(arr);
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
}

function arrToBrainFormat(outputVal, val) {
    return {input: val, output: outputVal};
}

function sample(dataArr) {
    console.log("Beginning test...");
    var stream = require("../keypress-detector/clouded-sky.js").init(dataArr);
    var datapoint;
    var exit = false;
    var press = 4, pressDec = false, pressData = {};
    var count = 0;
    var trailLen = 8;
    var firstResponseThreshold = 1250;
    var ranges = config.sensorRanges;
    var oBeta = {pings: []};
    var oGamma = {pings: []};
    var aZY = {pings: []};
    var strmLen = stream.store.length;
    var sampleProbs = {oBeta: [], oGamma: [], aZY: []};
    var samplePresses = {oBeta: [], oGamma: [], aZY: []};
    while((datapoint = stream.pick(0)[0]) && !exit) {
        count++;
        if (Boolean(process.stdout.isTTY)) {
            process.stdout.write("Testing datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
        } else {
            console.log("Testing datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
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
                    if (oBeta.pings.length >= trailLen) {
                        if (press == 0) {
                            sampleProbs.oBeta.push(normaliseArrData(fitIn(oBeta.pings.slice(oBeta.pings.length - trailLen, oBeta.pings.length), pressData.oBeta), ranges.oBeta));
                            sampleProbs.oGamma.push(normaliseArrData(fitIn(oGamma.pings.slice(oGamma.pings.length - trailLen, oGamma.pings.length), pressData.oGamma), ranges.oGamma));
                            sampleProbs.aZY.push(normaliseArrData(fitIn(aZY.pings.slice(aZY.pings.length - trailLen, aZY.pings.length), pressData.aZY), ranges.aZY));
                            samplePresses.oBeta.push(pressData.oBeta);
                            samplePresses.oGamma.push(pressData.oGamma);
                            samplePresses.aZY.push(pressData.aZY);
                            pressData = {};
                            press = 4;
                            pressDec = false;
                        } else if (pressDec) {
                            press--;
                        }
                    }
                }
                break;
            case "keydown":
                /*if (oBeta.pings.length >= trailLen) {
                 hasPress = true;
                 //Only add data if it has a change above the trail acceptance threshold.
                 var oBetaTrail = normaliseArrData(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length).concat(datapoint.data.datapoints.orientation.x), ranges.oBeta);
                 if (findRange(oBetaTrail) != trailAcceptanceThreshold) {oBeta.prePress.push(oBetaTrail);}
                 var oGammaTrail = normaliseArrData(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length).concat(datapoint.data.datapoints.orientation.y), ranges.oGamma);
                 if (findRange(oGammaTrail) != trailAcceptanceThreshold) {oGamma.prePress.push(oGammaTrail);}
                 var aZYTrail = normaliseArrData(aZY.pings.slice(aZY.pings.length-trailLen, aZY.pings.length).concat(lib.getVectorMagnitude(datapoint.data.datapoints.acceleration.z, datapoint.data.datapoints.acceleration.y)), ranges.aZY);
                 if (findRange(aZYTrail) != trailAcceptanceThreshold) {aZY.prePress.push(aZYTrail);}
                 downTime = datapoint.time;
                 }*/
                break;
            case "keyup":
                pressData.oBeta = [datapoint.time, datapoint.data.datapoints.orientation.x];
                pressData.oGamma = [datapoint.time, datapoint.data.datapoints.orientation.y];
                pressData.aZY = [datapoint.time, lib.getVectorMagnitude(datapoint.data.datapoints.acceleration.z, datapoint.data.datapoints.acceleration.y)];
                pressDec = true;
                break;
        }
        if (!stream.isEmpty()) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);  // return cursor
        } else {
            process.stdout.write("\n");
        }
    }
    if (!exit) {
        var split = Math.round(sampleProbs.oBeta.length/10);
        sampleProbs.oBeta = sampleProbs.oBeta.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        sampleProbs.oGamma = sampleProbs.oGamma.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        sampleProbs.aZY = sampleProbs.aZY.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        samplePresses.oBeta = samplePresses.oBeta.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        samplePresses.oGamma = samplePresses.oGamma.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        samplePresses.aZY = samplePresses.aZY.filter(function(v, i, a) {return (i % split == 0) ? v : false;});
        //msg = oB.reduce(function(p, v) {return p+JSON.stringify(v)+"\n"}, "")+"\n\n"+oG.reduce(function(p, v) {return p+JSON.stringify(v)+"\n"}, "")+"\n\n"+aZ.reduce(function(p, v) {return p+JSON.stringify(v)+"\n"}, "");
        msg = JSON.stringify(sampleProbs)+"\n\n"+JSON.stringify(samplePresses);
        fs.writeFile("./sample_data.json", msg, function(err) {
            if (err) {
                console.log("An issue occurred saving the sample data.");
            } else {
                console.log("Sample data saved.");
            }
            console.log("Finished testing!");
            process.exit(0);
        });

    } else {
        console.log("This set of data exited early. Current record: " + currentRecord);
        process.exit(0);
    }
    // TODO: Basically repeat but for quadrants (need to loop through data and split data into quadrants) (not here, separate)
}