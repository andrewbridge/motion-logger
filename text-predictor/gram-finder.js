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
var regCharSet = config.regCharSet;
var charSet = config.keySet;
var sampleText = lib.loadSamples("./sampletexts/prideandprejudice.txt", "./sampletexts/pioneersofscience.txt", "./sampletexts/artificiallight.txt",
                             "./sampletexts/theadventuresofsherlockholmes.txt", "./sampletexts/historyofunitedstates.txt", "./sampletexts/manualofsurgery.txt",
                             "./sampletexts/ofwarandpeace.txt", "./sampletexts/words.txt", lib.stripBoilerPlate);
var charArr = sampleText.split("");
var wordArr = sampleText.split(" ");
var dict = lib.loadDict("./dict.txt", wordArr, regCharSet);
var areas = config.areaDefinitions;
var logPeriod = config.logPeriod;

var i,n,x,y,char = "";
var results = {chars: {}, bigrams: {}, trigrams: {}, quadrigrams: {}};
var overallCharSetChars = 0;

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
            var wordChars = wordArr[i].toLowerCase().replace(/[^a-z ]+?/g, "").split("");
            if (i % logPeriod == 0) {
                console.log("Word " + (i + 1) + " of " + wordArr.length);
            }
            if (wordChars.length >= gramLen) {
                for (n = 0; n + (gramLen - 1) < wordChars.length; n++) {
                    var gramInst = "";
                    for (y = n; y < gramLen + n; y++) {
                        gramInst += wordChars[y];
                    }
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
var finalReturn = "Chars:\n\n"+lib.sortAndPrettyPrint(results.chars, columnHeight)+"\n\nBigrams:\n\n"+lib.sortAndPrettyPrint(results.bigrams, columnHeight)+"\n\nTrigrams:\n\n"+lib.sortAndPrettyPrint(results.trigrams, columnHeight)+"\n\nQuadrigrams:\n\n"+lib.sortAndPrettyPrint(results.quadrigrams, columnHeight)+"\n\nUnique Sequences:\n\n";
for (uniSeq in seqs) {
    if (seqs.hasOwnProperty(uniSeq)) {
        finalReturn += uniSeq+": {"+lib.sortAndPrettyPrint(seqs[uniSeq], 1).replace(/\n/g,"")+"}\n";
    }
}

fs.writeFileSync("./results.txt", finalReturn);
//console.log(finalReturn);