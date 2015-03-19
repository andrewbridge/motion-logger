/**
 * Created by Andrew on 13/03/2015.
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
var currentRecord = 11; // Because I know this worked in the learning round
var cache = {oBeta: {prePress: [], postPress: []}, oGamma: {prePress: [], postPress: []}, aZY: {prePress: [], postPress: []}};
var netDat = JSON.parse(fs.readFileSync("./keypress_detection_data.json", "utf8"));
var networks = {oBeta: {
    pre: learner.newLearner().fromJSON(netDat.oBetaPrePress),
    post: learner.newLearner().fromJSON(netDat.oBetaPostPress)
}, oGamma: {
    pre: learner.newLearner().fromJSON(netDat.oGammaPrePress),
    post: learner.newLearner().fromJSON(netDat.oGammaPostPress)
}, aZY: {
    pre: learner.newLearner().fromJSON(netDat.aZYPrePress),
    post: learner.newLearner().fromJSON(netDat.aZYPostPress)
}
};
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
                    test(finalData);
                } catch (e) {
                    return new Error("There was an error parsing the test data.");
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

function test(dataArr) {
    console.log("Beginning test...");
    var stream = require("./clouded-sky.js").init(dataArr);
    var datapoint;
    var exit = false;
    var hasPress = false;
    var firstResponseThreshold = config.firstResponseThreshold; //Wait a second and a quarter before assuming a dud dataset.
    var trailLen = config.trailLength+1;
    var trailCountDown;
    var trailAcceptanceThreshold = config.trailAcceptanceThreshold; // The smallest range that should be exhibited in a trail for it to be included.
    var postTrailArr;
    // The ranges that each value could exhibit.
    // aZ and aY are estimations based on testing and the fact that acceleration of gravity is 9.82m/s
    var ranges = config.sensorRanges;
    var oBeta = {pings: [], prePress: [], postPress: []};
    var oGamma = {pings: [], prePress: [], postPress: []};
    var aZY = {pings: [], prePress: [], postPress: []};
    // pings - All the pings in the dataset
    // prePress - Contains arrays of [trailLen] pings before each keydown (keydown is included too, making [trailLen+1] values)
    // postPress - Contains arrays of [trailLen] pings after each keyup (keyup is included too, making [trailLen+1] values)
    var downTime;
    var count = 0;
    var strmLen = stream.store.length;
    var possible = false;
    var probTime = NaN;
    var predictions = [];
    var actual = [];
    var sampleProbs = [];
    var recordCollector = [];
    while((datapoint = stream.pick(0)[0]) && !exit) {
        count++;
        if (Boolean(process.stdout.isTTY)) {
            process.stdout.write("Testing datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
        } else {
            console.log("Testing datapoint "+count+" of "+strmLen+": Type: "+datapoint.data.event);
        }
        if (datapoint.data.event == "ping" || datapoint.data.event == "keydown" || datapoint.data.event == "keyup") {
            recordCollector.push([datapoint.time, datapoint.data.datapoints.orientation.x]);
        }
        switch(datapoint.data.event) {
            case "ping":
                if (datapoint.time > firstResponseThreshold && (!datapoint.data.datapoints.orientation.x || !datapoint.data.datapoints.orientation.y
                    || !datapoint.data.datapoints.acceleration.z || !datapoint.data.datapoints.acceleration.y)) {
                    exit = true;
                } else if ((datapoint.data.datapoints.orientation.x && datapoint.data.datapoints.orientation.y
                    && datapoint.data.datapoints.acceleration.z && datapoint.data.datapoints.acceleration.y)) {
                    oBeta.pings.push(datapoint.data.datapoints.orientation.x);
                    oGamma.pings.push(datapoint.data.datapoints.orientation.y);
                    aZY.pings.push(lib.getVectorMagnitude(datapoint.data.datapoints.acceleration.z, datapoint.data.datapoints.acceleration.y));
                    if (oBeta.pings.length >= trailLen) {
                        var netChoice = (possible) ? "pre" : "post";
                        var probB = networks.oBeta[netChoice].run(normaliseArrData(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length),ranges.oBeta));
                        var probG = networks.oGamma[netChoice].run(normaliseArrData(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length),ranges.oGamma));
                        var probA = networks.aZY[netChoice].run(normaliseArrData(aZY.pings.slice(aZY.pings.length-trailLen, aZY.pings.length),ranges.aZY));
                        var prob = (probB + probG + probA) / 3;
                        if (!possible && prob > 0.5) {
                            probTime = datapoint.time;
                            possible = true;
                        } else if (possible && prob > 0.5) {
                            possible = false; // Resetting value
                            predictions.push(probTime);
                            probTime = NaN; // Resetting value
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
                actual.push(datapoint.time);
                var netChoice = "pre";
                var probB = networks.oBeta[netChoice].run(normaliseArrData(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length),ranges.oBeta));
                var probG = networks.oGamma[netChoice].run(normaliseArrData(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length),ranges.oGamma));
                var probA = networks.aZY[netChoice].run(normaliseArrData(aZY.pings.slice(aZY.pings.length-trailLen, aZY.pings.length),ranges.aZY));
                var prob = (probB + probG + probA) / 3;
                sampleProbs.push(prob);
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
        msg = JSON.stringify(sampleProbs)+"\n\n"+JSON.stringify(predictions)+"\n\n"+JSON.stringify(actual)+"\n\n"+JSON.stringify(recordCollector);
        fs.writeFile("./test_data.json", msg, function(err) {
            if (err) {
                console.log("An issue occurred saving the test data.");
            } else {
                console.log("Test data saved.");
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