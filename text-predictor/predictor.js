#!/usr/bin/env node

/**
 * Predicts words from a set of area sequences
 * Currently uses a module which provides test data
 *
 * Created by Andrew on 28/03/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('../common.js'); // Common functions
var fs = require('fs'); // FileSystem
var config = lib.loadConfigs("../detector-config.json", "./config.json"); //Load in global and local config
var dataProv = require("./testdata-provider.js"); //Test Data Provider
var regCharSet = config.regCharSet;
var charSet = config.keySet;
var dict = lib.loadDict("./dict.txt");
var tree = JSON.parse(fs.readFileSync("./tree.json", "utf8"));
var areas = config.areaDefinitions;
var logPeriod = config.logPeriod;

var data = dataProv.getSequence(20);
var dataAreas = data.reduce(function(p, v) {
    if (v.area == "space") {
        p.push([]);
    } else {
        p[p.length].push(v);
    }
}, [[]]);

function traverse(root, to) {
    if (!"branches" in root || !to in root.branches) {
        var newRoot = root.branches[to];
        return newRoot;
    } else {
        throw new Error("Branch has no further branches");
    }
}

for (var i = 0; i < dataAreas.length; i++) {
    var wordArr = dataAreas[i];
    var branch = tree[wordArr[0]];
    if (wordArr.length <= 4) {
        for (var n = 1; n < wordArr.length; n++) {
            branch = traverse(branch, wordArr[n]);
        }
        var sortedProbs = lib.sortObj(branch.words);
        dataAreas[i] = {};
        if (sortedProbs.length > 0) {
            dataAreas[i].prediction = {word: sortedProbs[0][0], prob: sortedProbs[0][1]};
            sortedProbs.shift();
            dataAreas[i].otherChoices = sortedProbs.reduce(function (p, v) {
                p[v[0]] = v[1];
            }, {});
        } else {
            //Need an object called a combiner or similar
            //Combiner will be passed sequences of 4 one by one - so iteration should be 4 less than word length
            //Combiner will iterate over all possible combinations and build a list of probabilities that match pattern
            //At end of word, combiner loops over probable words and checks them against the dict
            //Probabilities are saved along the way and an average found at the end, the one with the highest average is the main prediction
            //If no patterns are left at the end, just return with a failed prediction
        }
    } else {
        for (var n = 1; n < wordArr.length; n++) {
            branch = traverse(branch, wordArr[n]);
        }
    }
}
