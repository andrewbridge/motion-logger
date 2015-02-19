#!/usr/bin/env node

/**
 * Created by Andrew Bridge on 16/02/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var save = require('save'); //Database interface
var saveMongodb = require('save-mongodb');
var Db = require('mongodb').Db; //MongoDB Database object
var DbServer = require('mongodb').Server; //MongoDB Server object
var brain = require('brain'); //Grab Neural Network
var currentRecord = 0;
var networks = {oBeta: {
    pre: new brain.NeuralNetwork(),
    post: new brain.NeuralNetwork()
}, oGamma: {
    pre: new brain.NeuralNetwork(),
    post: new brain.NeuralNetwork()
}, aZ: {
    pre: new brain.NeuralNetwork(),
    post: new brain.NeuralNetwork()
}, aY: {
    pre: new brain.NeuralNetwork(),
    post: new brain.NeuralNetwork()
}};
var downUpDiff = []; // Min and Max difference between keydown and keyup events.
var promExtractor = function(resolve, reject) {this.resolve = resolve; this.reject = reject;};

var subjSaveDb = new this.Db('TestSubjects', new this.DbServer('localhost', 27017, {})) //Initialisation of the TestSubjects database
    , subjCol; //Initialising db interface object
var resuSaveDb = new this.Db('keyPressSystem', new this.DbServer('localhost', 27017, {})) //Initialisation of the keyPressSystem database
    , resuCol; //Initialising db interface object

var testProm = {};
var testDone = new Promise(promExtractor.bind(testProm));
var resuProm = {};
var resuDone = new Promise(promExtractor.bind(resuProm));

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

resuSaveDb.open(function (error, connection) {
    if (error) {
        resuProm.reject("Error opening keyPressSystem database! " + JSON.stringify(error.errors));
        return false;
    }

    connection.collection('data', function (error, collection) {
        if (error) {
            resuProm.reject("Error choosing keyPressSystem data collection! " + JSON.stringify(error.errors));
            return false;
        }
        console.log("Chosen keyPressSystem data collection, successful connection...");
        resuCol = save('keyPressData', {engine: saveMongodb(collection)});
        resuProm.resolve();
    });
});

Promise.all([testDone, resuDone]).then(finishSetup, function() {
    console.log("ERROR: An error occurred opening the databases.");
    throw new Error("An error occurred opening the databases.");
});

function finishSetup() {
    subjCol.count({}, function(cnterr, data) {
        if (cnterr) {return new Error("There was an error counting the data items.");}
        if (data > currentRecord) {
            subjCol.find().skip(currentRecord).limit(1, function(findErr, data) {
                if (findErr) {return new Error("There was an error choosing a data item.");}
                try {
                    var finalData = JSON.parse(data.data);
                    currentRecord++;
                    learn(finalData);
                } catch (e) {
                    return new Error("There was an error parsing the test data.");
                }
            });
        } else {
            saveValToDb("downUpRange", JSON.stringify(downUpDiff));
            saveValToDb("oBetaPrePress", networks.oBeta.pre.toJSON());
            saveValToDb("oBetaPostPress", networks.oBeta.post.toJSON());
            saveValToDb("oGammaPrePress", networks.oGamma.pre.toJSON());
            saveValToDb("oGammaPostPress", networks.oGamma.post.toJSON());
            saveValToDb("aZPrePress", networks.aZ.pre.toJSON());
            saveValToDb("aZPostPress", networks.aZ.post.toJSON());
            saveValToDb("aYPrePress", networks.aY.pre.toJSON());
            saveValToDb("aYPostPress", networks.aY.post.toJSON());
        }
    });
}

function saveValToDb(key, data) {
    resuCol.findOne({"key": key}, function(findErr, foundObj) {
        if (findErr) {
            resuCol.create({"key": key, "data": data}, function(createErr, newObj) {
                if (createErr) {return new Error("There was an error creating the "+key+" value in the db.");}
            });
        } else {
            resuCol.update({"key": key, "data": data}, function(updateErr, updatedObj) {
                if (updateErr) {return new Error("There was an error updating the "+key+" value in the db.");}
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
            arr[i] = ((arr[i]-origin)/maxRange)*100;
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

function learn(dataArr) {
    var stream = require("./clouded-sky.js")(dataArr);
    var datapoint;
    var exit = false;
    var trailLen = 4;
    var trailCountDown;
    var trailAcceptanceThreshold = 0.001; // The smallest range that should be exhibited in a trail for it to be included.
    var postTrailArr;
    // The ranges that each value could exhibit.
    // aZ and aY are estimations based on testing and the fact that acceleration of gravity is 9.82m/s
    var ranges = {oBeta: 360, oGamma: 180, aZ: 20, aY: 20};
    var oBeta = {pings: [], prePress: [], postPress: []};
    var oGamma = {pings: [], prePress: [], postPress: []};
    var aZ = {pings: [], prePress: [], postPress: []};
    var aY = {pings: [], prePress: [], postPress: []};
    // pings - All the pings in the dataset
    // prePress - Contains arrays of [trailLen] pings before each keydown (keydown is included too, making [trailLen+1] values)
    // postPress - Contains arrays of [trailLen] pings after each keyup (keyup is included too, making [trailLen+1] values)
    var downTime;
    while(datapoint = stream.pick(0) && !exit) {
        switch(datapoint.data.event) {
            case "ping":
                if (!datapoint.data.datapoints.orientation.x || !datapoint.data.datapoints.orientation.y
                    || !datapoint.data.datapoints.acceleration.z || !datapoint.data.datapoints.acceleration.y) {
                    exit = true;
                } else {
                    oBeta.pings.push(datapoint.data.datapoints.orientation.x);
                    oGamma.pings.push(datapoint.data.datapoints.orientation.y);
                    aZ.pings.push(datapoint.data.datapoints.acceleration.z);
                    aY.pings.push(datapoint.data.datapoints.acceleration.y);
                    if (!isNaN(trailCountDown) && typeof postTrailArr != "undefined") {
                        if (trailCountDown == 0) {
                            trailCountDown = NaN;
                            var oBetaTrail = normaliseArrData([postTrailArr.oBeta].concat(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length)), ranges.oBeta);
                            if (findRange(oBetaTrail) != trailAcceptanceThreshold) {oBeta.postPress.push(oBetaTrail);}
                            var oGammaTrail = normaliseArrData([postTrailArr.oGamma].concat(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length)), ranges.oGamma);
                            if (findRange(oGammaTrail) != trailAcceptanceThreshold) {oGamma.postPress.push(oGammaTrail);}
                            var aZTrail = normaliseArrData([postTrailArr.aZ].concat(aZ.pings.slice(aZ.pings.length-trailLen, aZ.pings.length)), ranges.aZ);
                            if (findRange(aZTrail) != trailAcceptanceThreshold) {aZ.postPress.push(aZTrail);}
                            var aYTrail = normaliseArrData([postTrailArr.aY].concat(aY.pings.slice(aY.pings.length-trailLen, aY.pings.length)), ranges.aY);
                            if (findRange(aYTrail) != trailAcceptanceThreshold) {aY.postPress.push(aYTrail);}
                            postTrailArr = undefined;
                        } else {
                            trailCountDown--;
                        }
                    }
                }
                break;
            case "keydown":
                if (oBeta.pings.length >= 6) {
                    //Only add data if it has a change above the trail acceptance threshold.
                    var oBetaTrail = normaliseArrData(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length).concat(datapoint.data.datapoints.orientation.x), ranges.oBeta);
                    if (findRange(oBetaTrail) != trailAcceptanceThreshold) {oBeta.prePress.push(oBetaTrail);}
                    var oGammaTrail = normaliseArrData(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length).concat(datapoint.data.datapoints.orientation.y), ranges.oGamma);
                    if (findRange(oGammaTrail) != trailAcceptanceThreshold) {oGamma.prePress.push(oGammaTrail);}
                    var aZTrail = normaliseArrData(aZ.pings.slice(aZ.pings.length-trailLen, aZ.pings.length).concat(datapoint.data.datapoints.acceleration.z), ranges.aZ);
                    if (findRange(aZTrail) != trailAcceptanceThreshold) {aZ.prePress.push(aZTrail);}
                    var aYTrail = normaliseArrData(aY.pings.slice(aY.pings.length-trailLen, aY.pings.length).concat(datapoint.data.datapoints.acceleration.y), ranges.aY);
                    if (findRange(aYTrail) != trailAcceptanceThreshold) {aY.prePress.push(aYTrail);}
                    downTime = datapoint.time;
                }
                break;
            case "keyup":
                //downTime is only set if there are enough pings
                if (typeof downTime == "number") {
                    trailCountDown = trailLen-1;
                    var timeDiff = datapoint.time - downTime;
                    downUpDiff[0] = (timeDiff < downUpDiff[0] || typeof downUpDiff[0] == "undefined") ? timeDiff : downUpDiff[0];
                    downUpDiff[1] = (timeDiff < downUpDiff[1] || typeof downUpDiff[1] == "undefined") ? timeDiff : downUpDiff[1];
                    postTrailArr = {oBeta: datapoint.data.datapoints.orientation.x, oGamma: datapoint.data.datapoints.orientation.y,
                                    aZ: datapoint.data.datapoints.acceleration.z, aY: datapoint.data.datapoints.acceleration.y};
                }
                break;
        }
    }
    if (!exit) {
        var data;
        data.oBeta.prePress = oBeta.prePress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.oBeta.postPress = oBeta.postPress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.oGamma.prePress = oGamma.prePress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.oGamma.postPress = oGamma.postPress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.aZ.prePress = aZ.prePress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.aZ.postPress = aZ.postPress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.aY.prePress = aY.prePress.map(arrToBrainFormat.bind(this, {keypress: 1}));
        data.aY.postPress = aY.postPress.map(arrToBrainFormat.bind(this, {keypress: 1}));

        console.log("Now beginning to train networks.")
        for (var measure in networks) {
            if (networks.hasOwnProperty(measure)) {
                console.log("Training for "+measure);

                networks[measure].pre.train(data[measure].prePress, {log: true});
                networks[measure].post.train(data[measure].postPress, {log: true});
            }
        }

    } else {
        console.log("This set of data exited early. Current record: "+currentRecord);
    }
    finishSetup();
    // TODO: Basically repeat but for quadrants (need to loop through data and split data into quadrants) (not here, separate)
}
