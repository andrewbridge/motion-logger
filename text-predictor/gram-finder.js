#!/usr/bin/env node

/**
 * Finds all the *grams up to quadrigrams
 *
 * Created by Andrew on 25/03/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('../common.js'); // Common functions
var fs = require('fs'); // FileSystem
var config = lib.loadConfigs("../detector-config.json", "./config.json"); //Load in global and local config
var sampleText = loadSamples("./sampletexts/prideandprejudice.txt", "./sampletexts/pioneersofscience.txt", "./sampletexts/artificiallight.txt", stripBoilerPlate);
var charSet = config.keySet;
var areas = config.areaDefinitions;
var logPeriod = config.logPeriod;

function loadSamples() {
    var samplePrep = (typeof arguments[arguments.length-1] == "function") ? arguments[arguments.length-1] : false;
    var ret = "";
    for (var i = 0; i < arguments.length && typeof arguments[i] == "string"; i++) {
        var sample = fs.readFileSync(arguments[i], "utf8").toString();
        ret += (samplePrep) ? samplePrep(sample) : sample;
    }
    return ret;
}

function stripBoilerPlate(text) {
    var start = text.indexOf("*** START OF THIS PROJECT GUTENBERG EBOOK");
    var end = text.indexOf("*** END OF THIS PROJECT GUTENBERG EBOOK");
    return text.substring(start, end).replace(/^.+?(\n|\r)/, "").replace(/\n|\r/g, " ").replace(/  /g, " ");
}

function sortAndPrettyPrint(obj, columnHeight) {
    var sortable = [];
    for (var itm in obj) {
        sortable.push([itm, obj[itm]])
    }
    sortable.sort(function(a, b) {return b[1] - a[1]});
    var ret = "";
    columnHeight = (columnHeight||sortable.length);
    var columnNum = Math.ceil(sortable.length/columnHeight);
    var largestNum = String(sortable[0][1]).trim().length;
    for (var x = 0, spaceOffset = ""; x < largestNum; x++) {spaceOffset += " ";}
    for (var i = 0; i < columnHeight; i++) {
        var valsLeft = false;
        for (var n = 0; n < columnNum; n++) {
            var keyVal = sortable[i+(columnHeight*n)];
            ret += (keyVal) ? keyVal[0] + ": " + keyVal[1] + spaceOffset.substr(0, spaceOffset.length-String(keyVal[1]).length) + "\t" : "";
            valsLeft = (keyVal) ? true : valsLeft;
        }
        if (!valsLeft) {
            i = columnHeight;
        } else {
            ret += "\n";
        }
    }
    return ret;
}

var i,n,x,y,char = "";
var results = {chars: {}, bigrams: {}, trigrams: {}, quadrigrams: {}};
var overallCharSetChars = 0;

var charArr = sampleText.split("");
var wordArr = sampleText.split(" ");

console.log("Character analysis");
for (i = 0; i < charArr.length; i++) {
    char = charArr[i];
    if (i % logPeriod == 0) {console.log("Character "+(i+1)+" of "+charArr.length);}
    if (charSet.indexOf(char) > -1) {
        if (char in results.chars) {
            results.chars[char]++;
        } else {
            results.chars[char] = 1;
        }
        overallCharSetChars++;
    }
}

var grams = ["bigrams", "trigrams", "quadrigrams"];
for (x = 0; x < grams.length; x++) {
    var gram = grams[x];
    var gramLen = x+2;
    console.log(gram+" ("+gramLen+") analysis");
    for (i = 0; i < wordArr.length; i++) {
        //Get rid of words with accented characters, they're not English, so would skew results
        if (!wordArr[i].match(/[\u00C0-\u017F]/g)) {
            var wordChars = wordArr[i].replace(/[^a-z ]+?/g, "").split("");
            if (i % logPeriod == 0) {
                console.log("Word " + (i + 1) + " of " + wordArr.length);
            }
            if (wordChars.length >= gramLen) {
                for (n = 0; n + (gramLen - 1) < wordChars.length; n++) {
                    var gramInst = "";
                    for (y = n; y < gramLen + n; y++) {
                        gramInst += wordChars[y];
                    }
                    if (gramInst == "gvit") {console.log(wordArr[i], wordChars);}
                    if (gramInst in results[gram]) {
                        results[gram][gramInst]++;
                    } else {
                        results[gram][gramInst] = 1;
                    }
                }
            }
        }
    }
}

char = "";
var resultCats = Object.keys(results);
var seqs = {};
for (i = 0; i < resultCats.length; i++) { //Loop through each set of results
    var resultCat = resultCats[i];
    var resultSet = results[resultCat];
    for (var item in resultSet) { // Loop through each item in the result set
        if (resultSet.hasOwnProperty(item)) {
            var chars = item.split("");
            var seq = "";
            for (n = 0; n < chars.length; n++, seq+="-") { // Loop through each character of the item
                char = chars[n];
                var thisArea = "";
                for (x = 0; x < areas.length; x++) { // Loop through each area for each character in the item
                    var area = areas[x];
                    if (area.chars.indexOf(char) > -1) {
                        thisArea += (thisArea.length > 0) ? "/"+area.name : area.name;
                    }
                }
                seq += thisArea;
            }
            seq = seq.substr(0,seq.length-1);
            if (typeof seqs[seq] == "undefined") {
                seqs[seq] = {};
            }
            if (typeof seqs[seq][resultCat] == "undefined") {
                seqs[seq][resultCat] = 0;
            }
            seqs[seq][resultCat]++;
        }
    }
}

var columnHeight = 50;
var finalReturn = "Chars:\n\n"+sortAndPrettyPrint(results.chars, columnHeight)+"\n\nBigrams:\n\n"+sortAndPrettyPrint(results.bigrams, columnHeight)+"\n\nTrigrams:\n\n"+sortAndPrettyPrint(results.trigrams, columnHeight)+"\n\nQuadrigrams:\n\n"+sortAndPrettyPrint(results.quadrigrams, columnHeight)+"\n\nUnique Sequences:\n\n";
for (uniSeq in seqs) {
    if (seqs.hasOwnProperty(uniSeq)) {
        finalReturn += uniSeq+": {"+sortAndPrettyPrint(seqs[uniSeq], 1).replace(/\n/g,"")+"}\n";
    }
}

fs.writeFileSync("./results.txt", finalReturn);
//console.log(finalReturn);