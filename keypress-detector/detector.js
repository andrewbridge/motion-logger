#!/usr/bin/env node

/**
 * The Keypress Detector is provided as a Transform type stream, which will take a stream of datapoints
 * and only return those data points which appear to represent a key press.
 *
 * Created by Andrew on 25/02/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('./common.js'); // Common functions
var fs = require('fs'); // FileSystem
var config = JSON.parse(fs.readFileSync("./config.json", "utf8")); // Load in config
config.sensorWeights = lib.normaliseWeights(config.sensorWeights); // Normalise weights.
var teachings = JSON.parse(fs.readFileSync("./keypress_detection_data.json", "utf8")); // Load in JSON object
var stream = require('stream'); // Data stream
var brain = require('brain'); // Neural Network
var dataStream = new stream.Transform({objectMode: true});
var cache = [], preCache = [];
var possiblePre = false;
var certainty = 0;
// Set up networks with learned weights from test data
var networks = {oBeta: {
    pre: new brain.NeuralNetwork().fromJSON(teachings.oBetaPrePress),
    post: new brain.NeuralNetwork().fromJSON(teachings.oBetaPostPress)
}, oGamma: {
    pre: new brain.NeuralNetwork().fromJSON(teachings.oGammaPrePress),
    post: new brain.NeuralNetwork().fromJSON(teachings.oGammaPostPress)
}, aZY: {
    pre: new brain.NeuralNetwork().fromJSON(teachings.aZYPrePress),
    post: new brain.NeuralNetwork().fromJSON(teachings.aZYPostPress)
}};

// Transform expects each chunk to be a single datapoint
dataStream._transform = function(chunk, encoding, done) {
    var zero = false; // Flag to reset cumulative variables.
    cache.push(chunk);
    if (cache.length > config.trailLength+1) {
        cache.shift();
    }
    if (cache.length == config.trailLength+1) {
        var keyPressPortion = (possiblePre) ? "post" : "pre";
        for (var senType in networks) {
            if (networks.hasOwnProperty(senType)) {
                var act = networks[senType][keyPressPortion].run(cache.map(lib.pickOutValues.bind(this, senType))) * config.sensorWeights[senType];
                certainty += (possiblePre) ? act * 0.5 : act;
            }
        }

        if (certainty >= config.progressionThreshold) {
            if (keyPressPortion == "pre") {
                possiblePre = true;
                preCache = cache;
                cache = [preCache[preCache.length]]; // Data suggests there's only negligible gap between keydown and keyup, use end of pre trail for start of post trail
                certainty *= 0.5;
            } else {
                preCache.pop();
                var keypress = preCache.concat(cache);
                this.push(keypress);
                zero = true;
            }
        } else {zero = true;}

        if (zero) {
            possiblePre = false;
            preCache = [];
            cache = [];
            certainty = 0;
        }
    }
    done();
};

dataStream._flush = function(chunk, encoding, done) {
    // TODO: Probably got some stuff in the cache even though there's no data left. what should happen? Anything?
}

modules.exports = dataStream;



