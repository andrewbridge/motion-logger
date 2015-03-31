#!/usr/bin/env node

/**
 * A module which compares *gram sets to find matching sets
 *
 * Created by Andrew on 29/03/2015.
 */

var lib = require('../common.js'); // Common functions
var maths = require('../maths.js'); // Maths functions
var ProgressBar = require('progress'); // Feedback helper module

function Combiner(dict, initSet) {
    if (initSet) {this.addInitSet(initSet);}
    this.dict = dict;
}

Combiner.prototype.addInitSet = function(newSet) {
    this.set = this.prepObj(newSet);
}

Combiner.prototype.prepObj = function(obj) {
    var arr = lib.sortObj(obj);
    return arr.map(function(v) {v[1] = [v[1]]; return v;});
};

Combiner.prototype.add = function(newSet) {
    if (typeof this.set == "undefined") {this.addInitSet(newSet);} else if (Object.keys(newSet).length > 0) {
        var newCombine = [];
        newSet = this.prepObj(newSet);
        if (newSet.length != 0 && this.set.length != 0) {
            var combineProg = new ProgressBar("Combining partials :bar :current of :total :percent :eta", {
                total: this.set.length * newSet.length,
                width: 10
            });
            var chunkSize, chunk;
            chunkSize = chunk = 999;
            for (var i = 0; i < this.set.length; i++) {
                var curSeq = this.set[i][0];
                for (var n = 0; n < newSet.length; n++) {
                    if (chunk == 0) {
                        combineProg.tick(chunkSize);
                        chunk = chunkSize;
                    }
                    chunk--;
                    var newSeq = newSet[n][0];
                    if (curSeq.substr(-(newSeq.length - 1)) == newSeq.substr(0, newSeq.length - 1) && this.dict.checkStartMatch(curSeq + newSeq.substr(-1))) {
                        newCombine.push([curSeq + newSeq.substr(-1), this.set[i][1].concat(newSet[n][1])]);
                    }
                }
            }
            //Complete progress, try...catch wrapped to swallow a rare bug that throws an exception. We don't care about the progress bar that much!
            try {
                combineProg.tick(combineProg.total - combineProg.curr);
            } catch (e) {
                console.log("UI Error.");
            }
            this.set = newCombine;
        }
    }
};

Combiner.prototype.cloneSet = function() {
    return this.set.map(function(v) {var clone = v.slice(); clone[1] = clone[1].slice(); return clone;});
};

Combiner.prototype.justWords = function(v) {
    return this.dict.checkFullMatch(v[0]);
};

Combiner.prototype.predict = function() {
    var workingSet = this.cloneSet().filter(this.justWords.bind(this));
    var bestPred = ["", 0];
    for (var i = 0; i < workingSet.length; i++) {
        var itm = workingSet[i];
        itm[1] = maths.getAverageFromNumArr(itm[1]);
        if (bestPred[1] < itm[1]) {
            bestPred[0] = itm[0];
            bestPred[1] = itm[1];
            bestPred[2] = i;
        }
    }
    if (bestPred.length > 2) {
        workingSet.splice(bestPred[2], 1);
        return {prediction: {word: bestPred[0], prob: bestPred[1]}, otherChoices: workingSet.map(function(v) {return {word: v[0], prediction: v[1]};})};
    } else {
        return {};
    }
};

module.exports = Combiner;
