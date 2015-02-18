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
}); //TODO: Add something next

function finishSetup() {
    resuCol.find().skip(currentRecord).limit(1, function(findErr, data) {
        if (findErr) {return new Error("There was an error choosing a data item.");}
        try {
            var finalData = JSON.parse(data.data);
            learn(finalData);
        } catch (e) {
            return new Error("There was an error parsing the test data.");
        }
    });
}

function normaliseArrData(arr) {
    if (arr.length > 0) {
        var origin = arr[0];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            arr[i] -= origin;
        }
    }

    return arr;
}

function learn(dataArr) {
    var stream = require("./clouded-sky.js")(dataArr);
    var datapoint;
    var exit = false;
    var trailLen = 4;
    var oBeta = {pings: [], prePress: [], postPress: []};
    var oGamma = {pings: [], prePress: [], postPress: []};
    var aZ = {pings: [], prePress: [], postPress: []};
    var downUpDiff = []; // Min and Max difference between keydown and keyup events.
    var downTime;
    // pings - All the pings in the dataset
    // prePress - Contains arrays of [trailLen] pings before each keydown (keydown is included too, making [trailLen+1] values)
    // postPress - Contains arrays of [trailLen] pings after each keyup (keyup is included too, making [trailLen+1] values)
    while(datapoint = stream.pick(0) && !exit) {
        switch(datapoint.data.event) {
            case "ping":
                if (!datapoint.data.datapoints.orientation.x || !datapoint.data.datapoints.orientation.y || !datapoint.data.datapoints.acceleration.z) {
                    exit = true;
                } else {
                    oBeta.pings.push(datapoint.data.datapoints.orientation.x);
                    oGamma.pings.push(datapoint.data.datapoints.orientation.y);
                    aZ.pings.push(datapoint.data.datapoints.acceleration.z);
                }
                // TODO: postPress gubbins
                break;
            case "keydown":
                if (oBeta.pings.length >= 6) {
                    oBeta.prePress.push(normaliseArrData(oBeta.pings.slice(oBeta.pings.length-trailLen, oBeta.pings.length).concat(datapoint.data.datapoints.orientation.x)));
                    oGamma.prePress.push(normaliseArrData(oGamma.pings.slice(oGamma.pings.length-trailLen, oGamma.pings.length).concat(datapoint.data.datapoints.orientation.y)));
                    aZ.prePress.push(normaliseArrData(aZ.pings.slice(aZ.pings.length-trailLen, aZ.pings.length).concat(datapoint.data.datapoints.acceleration.z)));
                    downTime = datapoint.time;
                }
                //mTODO: ore?
                break;
            case "keyup":
                // TODO: If downTime isn't undefined (means that keydown didn't go through otherwise)
                // TODO: Set flag which will be counted down by pings above. Once trailLen pings have passed, those pings will be normalised and inserted into postPress
                // TODO: Calc downUpDiff, check if it exceeds max or min, insert accordinly.
                // TODO: more?
                break;
        }
    }
    // TODO: Run a map over each pre and post press to return format required by brain.js
    // TODO: Set up neural networks
    // TODO: Insert data, ensure the training is logged
    // TODO: Basically repeat but for quadrants (need to loop through data and split data into quadrants) (not here, separate)
}
