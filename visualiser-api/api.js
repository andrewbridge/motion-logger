#!/usr/bin/env node

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

//Load in the API initialisers
var visualiser = require('./visualiser.js'); //The collector API calls

var scope = {restify: require('restify') //API server
    , save: require('save') //Database interface
    , saveMongodb: require('save-mongodb')
    , chance: require('chance').Chance() //Salt generator
    , crypto: require('crypto') //Hasher
    , Db: require('mongodb').Db //MongoDB Database object
    , DbServer: require('mongodb').Server //MongoDB Server object
    , dryrun: false} //Initialise dryrun var

scope.server = scope.restify.createServer({ name: 'motion-visualiser-api'});

visualiser.init.call(scope).then(startServer);

function startServer(errorReason) {
    if (typeof  errorReason == "string") {
        console.log("An error occurred during initialisation:\n"+errorReason);
    } else {
        scope.server.listen(8080, function () {
            console.log('%s listening at %s', scope.server.name, scope.server.url)
        });
    }
};