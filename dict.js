#!/usr/bin/env node

/**
 * Module that provides dictionary facilities, partial matching etc.
 *
 * Created by Andrew Bridge 29/03/2015
 */

var progressUpdateRate = 499;
var ProgressBar = require('progress'); // Feedback helper module
var fs = require('fs'); // FileSystem

function Dict(fileName, wordArr, regCharSet) {
    try {
        this.dictText = fs.readFileSync(fileName, "utf8");
        this.dict = JSON.parse(this.dictText);
    } catch (e) {
        // If the file doesn't exist. Generate it and create it.
        if (e.code == "ENOENT" && wordArr && regCharSet) {
            console.log("Creating dictionary from sample text...");
            var prog = new ProgressBar("Word :current of :total :bar :percent :eta", {total: Math.ceil(wordArr.length/progressUpdateRate), width: 10});
            this.dict = wordArr.reduce(this.createDict.bind(this, regCharSet, prog), []);
            this.dictText = JSON.stringify(dict);
            fs.writeFileSync(fileName, JSON.stringify(dict));
            console.log("New dictionary produced and saved.\n"+dict.length+" words.");
        } else {
            throw new Error("An error occurred loading the dictionary: "+ e.message, e.fileName, e.lineNumber);
        }
    }
}

Dict.prototype.createDict = function(regCharSet, prog, dict, curVal, ind, arr) {
    if (ind % progressUpdateRate == 0 || ind == arr.length-1) {
        prog.tick();
    }
    if (charSetTrim(curVal, "a-z").length != 0) {
        curVal = charSetTrim(curVal.toLowerCase(), regCharSet);
        var vArr = (curVal.indexOf("-") > -1) ? curVal.split("-") : [curVal];
        for (var i = 0; i < vArr.length; i++) {
            var vIt = vArr[i].replace(/'/g, ""); //Apostrophes are the last exception of punctuation in a word I can think of
            //Get rid of words with accented characters, they're not English, so would skew results
            //if (!vIt.match(/[\u00C0-\u017F]/g)) {
            if (vIt.match(new RegExp("^[" + regCharSet + "]+$", "g"))) {
                if (dict.indexOf(vIt) == -1 && (vIt.length > 1 || (vIt == "a" || vIt == "i"))) { // Note this exception, if you want characters to be words, remove it!
                    dict.push(vIt);
                }
            }
        }
    }
    return dict;
};

Dict.prototype.checkFullMatch = function(word) {
    return (this.dict.indexOf(word) > -1);
};

Dict.prototype.checkPartialMatch = function(word) {
    return (this.dictText.indexOf(word) > -1);
};

Dict.prototype.checkStartMatch = function(word) {
    return (this.dictText.indexOf('"'+word) > -1);
};

Dict.prototype.checkEndMatch = function(word) {
    return (this.dictText.indexOf(word+'"') > -1);
};

module.exports = Dict;

