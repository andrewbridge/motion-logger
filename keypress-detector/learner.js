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
        learn(data)
    });
}

function learn(dataArr) {
    var stream = require("./clouded-sky.js")(dataArr);
}
