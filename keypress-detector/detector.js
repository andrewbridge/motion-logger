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
var state = {cache: [], preCache: [], possiblePre: false, certainty: 0};
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
    state.cache.push(chunk);
    if (state.cache.length > config.trailLength+1) {
        state.cache.shift();
    }
    if (state.cache.length == config.trailLength+1) {
        var keyPressPortion = (state.possiblePre) ? "post" : "pre";
        for (var senType in networks) {
            if (networks.hasOwnProperty(senType)) {
                var act = networks[senType][keyPressPortion].run(state.cache.map(lib.pickOutValues.bind(this, senType))) * config.sensorWeights[senType];
                state.certainty += (state.possiblePre) ? act * 0.5 : act;
            }
        }

        if (state.certainty >= config.progressionThreshold) {
            if (keyPressPortion == "pre") {
                state.possiblePre = true;
                state.preCache = state.cache;
                state.cache = [state.preCache[state.preCache.length]]; // Data suggests there's only negligible gap between keydown and keyup, use end of pre trail for start of post trail
                state.certainty *= 0.5;
            } else {
                state.preCache.pop();
                var keypress = state.preCache.concat(state.cache);
                this.push(keypress);
                zero = true;
            }
        } else {zero = true;}

        zero&&zeroState();
    }
    done();
};

dataStream._flush = function(done) {
    // Brain.js won't work with anything but the trained number of items, and even if the preCache set had a good certainty, half a key press is no use. Just zero state and move on.
    zeroState();
    done();
}

function zeroState() {
    state.possiblePre = false;
    state.preCache = [];
    state.cache = [];
    state.certainty = 0;
}

modules.exports = dataStream;



