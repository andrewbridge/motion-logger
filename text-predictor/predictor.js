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
var Combiner = require("./combiner.js"); // Combiner module
var dataProv = require("./testdata-provider.js"); //Test Data Provider
var regCharSet = config.regCharSet;
var charSet = config.keySet;
var dict = lib.loadDict("./dict.txt");
var tree = JSON.parse(fs.readFileSync("./tree.json", "utf8"));
var areas = config.areaDefinitions;
var logPeriod = config.logPeriod;

console.log("Requesting random sequence.");
var data = dataProv.getSequence(parseInt(process.argv[2])||undefined);
console.log("Requested fulfilled.");
var dataAreas = data.reduce(function(p, v) {
    if (v.area == "space") {
        p.push([]);
    } else {
        p[p.length-1].push(v.area);
    }
    return p;
}, [[]]);
console.log("Sequence arranged into word sequences.");

function traverse(root, to) {
    if ("branches" in root && to in root.branches) {
        var newRoot = root.branches[to];
        return newRoot;
    } else {
        throw new Error("Branch has no further branches");
    }
}

console.log("Determining words");
//var predictionProg = new ProgressBar("Determining words :bar :current of :total :percent :eta", {total: dataAreas.length})
var i,n,y;
for (i = 0; i < dataAreas.length; i++) {
    var wordArr = dataAreas[i];
    console.log("Word "+(i+1));
    var branch = tree[wordArr[0]];
    if (wordArr.length <= 4) {
        for (n = 1; n < wordArr.length; n++) {
            try {
                branch = traverse(branch, wordArr[n]);
            } catch(e){
                branch = {words: {}};
                n = wordArr.length;
            }
        }
        var sortedProbs = lib.sortObj(branch.words);
        dataAreas[i] = {};
        if (sortedProbs.length > 0) {
            dataAreas[i].prediction = {word: sortedProbs[0][0], prob: sortedProbs[0][1]};
            sortedProbs.shift();
            dataAreas[i].otherChoices = sortedProbs.map(function (v) {
                return {word: v[0], prediction: v[1]};
            });
        }
    } else {
        var comb = new Combiner(dict);
        n = 0;
        while(n <= wordArr.length-4) {
            y = n+1;
            for (; y < n+4; y++) {
                try {
                    branch = traverse(branch, wordArr[y]);
                } catch(e){
                    branch = {words: {},partials:{}};
                    y = n+4;
                }
            }
            comb.add(lib.concatObj(branch.partials,branch.words));
            n++;
            branch = tree[wordArr[n]];
        }
        dataAreas[i] = comb.predict();
    }
    //predictionProg.tick();
}
console.log("\nComplete!");

//Perform analysis on prediction.
var predArr = dataAreas.map(function(v) {return (Object.keys(v).length == 0) ? "?" : v.prediction.word;});
var choiceArr = dataAreas.map(function(v) {return (Object.keys(v).length == 0) ? [] : v.otherChoices.map(function(v) {return v.word;});});
var realArr = data.map(function(v) {return v.char;}).join("").split(" ");
if (predArr.length != realArr.length) {
    console.error("Something's gone wrong, the prediction and real arrays are different sizes.");
    process.exit(1);
}
var correctPredictions = 0;
var wasInOtherChoices = 0;
var wasInTopFive = 0;
var wordInDictionary = 0;
for (i = 0; i < realArr.length; i++) {
    wordInDictionary += (dict.checkFullMatch(realArr[i])) ? 1 : 0;
    if (realArr[i] == predArr[i]) {
        correctPredictions++;
    } else {
        var position = choiceArr[i].indexOf(realArr[i]);
        wasInOtherChoices += (position > -1) ? 1 : 0;
        wasInTopFive += (position < 4) ? 1 : 0;
    }
}
console.log("Real text:");
console.log(realArr.join(" "));
console.log("\nBest prediction of text")
console.log(predArr.join(" "));
console.log("#### Analysis ####");
console.log("Words of real text in dictionary: "+wordInDictionary+" of "+realArr.length+" ("+((wordInDictionary/realArr.length)*100)+"%)");
console.log("Correct predictions: "+correctPredictions+" of "+predArr.length+" predictions ("+((correctPredictions/realArr.length)*100)+"%)");
console.log("Incorrect primary prediction that predicted correctly further down list: "+wasInOtherChoices+" of "+(predArr.length-correctPredictions)+" incorrect predictions ("+((wasInOtherChoices/(predArr.length-correctPredictions))*100)+"%)");
console.log("Prediction was in top five predictions: "+(wasInTopFive+correctPredictions)+" of "+predArr.length+" predictions ("+(((wasInTopFive+correctPredictions)/predArr.length)*100)+"%)");
