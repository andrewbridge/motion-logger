#!/usr/bin/env node

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

//Load in the API initialisers
var endpoints = {collector: require('../collector-api/collector.js')} //The collector API calls
//Visualiser API should go here too

var scope = {restify: require('restify') //API server
    , save: require('save') //Database interface
    , saveMongodb: require('save-mongodb')
    , chance: require('chance').Chance() //Salt generator
    , crypto: require('crypto') //Hasher
    , Db: require('mongodb').Db //MongoDB Database object
    , DbServer: require('mongodb').Server //MongoDB Server object
    , dryrun: false} //Initialise dryrun var

scope.server = scope.restify.createServer({ name: 'motion-logger-full-api'});
scope.portNum = 8080; // Default port for the API server

if (process.argv[2] == "--dryrun") {
    console.log();
    scope.dryrun = true;
} else {
    console.log();
    scope.dryrun = false;
}

var msgs = {dryrun: "Running in normal mode, all data will be saved to the specified DB!\nOpening database..."};
var promArr = [];
var helpshown = false;
for (var i = 2; i < process.argv.length; i++) {
    var arg = process.argv[i];
    if (i == 2 && (arg == "--help" || arg == "-help" || arg == "/h" || arg == "-h")) {
        console.log("Motion Logger Backend API\n\n" +
                    "--dryrun = Store values temporarily, don't store to a database\n"+
                    "--port [port] = Changes the port the server runs on, default is 8080\n" +
                    "-[endpoint initial] = Initialises the endpoints for that module.\n" +
                    "   i.e. -c would initialise the collector module\n" +
                    "--help = Display this help text");
        i = process.argv.length;
        helpshown = true;
    } else if (arg == "--dryrun") {
        msgs.dryrun = "Running in dry run mode, none of the data passed through the API will be saved!";
    } else if (arg == "--port") {
        var portNum = parseInt(process.argv[i+1]);
        if (!isNaN(portNum)) {
            scope.portNum = portNum;
            i++;
        }
    } else if (arg.substr(0,1) == "-") {
        //There are no other arguments other than to specify the endpoints. Loop through and find them.
        arg = arg.substr(1);
        for (var ep in endpoints) {
            if (arg.indexOf(ep.substr(0,1)) != -1) {
                promArr.push(endpoints[ep].init.call(scope));
                console.log("Intialising "+ep+" endpoints...");
                delete endpoints[ep];
            }
        }
    }
}

if (!helpshown) {
    for (var ep in endpoints) {
        console.log(ep + " endpoints are inactive.");
    }

    //When all the initialisation is done, start the server.
    Promise.all(promArr).then(startServer);
}

function startServer(errorReason) {
    if (typeof  errorReason == "string") {
        console.log("An error occurred during initialisation:\n"+errorReason);
    } else {
        console.log(msgs.dryrun);
        scope.server.listen(scope.portNum, function () {
            console.log('%s listening at %s', scope.server.name, scope.server.url)
        });
    }
};