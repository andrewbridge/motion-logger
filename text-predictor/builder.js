#!/usr/bin/env node

/**
 * Builds the prediction tree
 *
 * Created by Andrew on 28/03/2015.
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
var areas = config.areaDefinitionsNoDupe; // This is the altered version without duplicate chars
var logPeriod = config.logPeriod;
var tree = {};

var i,n,x,y,char = "",wordChars,gramChars,gram;
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
var gramTotals = {bigrams: 0, trigrams: 0, quadrigrams: 0};
for (x = 0; x < grams.length; x++) {
    gram = grams[x];
    var gramLen = x+2;
    console.log(gram+" ("+gramLen+") analysis");
    for (i = 0; i < wordArr.length; i++) {
        //Get rid of words with accented characters, they're not English, so would skew results
        if (!wordArr[i].match(/[\u00C0-\u017F]/g)) {
            wordChars = wordArr[i].toLowerCase().replace(new RegExp("[^"+regCharSet+"]+?", "g"), "").split("");
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
                    gramTotals[gram]++;
                }
            }
        }
    }
}

function sprout(root) {
    for (i = 0; i < areas.length; i++) {
        root[areas[i].name] = {};
    }
}

function grow(root) {
    root.words = {};
    root.partials = {};
    root.branches = {};
    sprout(root.branches);
}

function traverse(root, to) {
    var newRoot = root.branches[to];
    checkGrowth(newRoot, root);
    return newRoot;
}

function checkGrowth(root) {
    if (!root.hasOwnProperty("branches")) {
        grow(root);
    }
}

sprout(tree);

// Grow tree
var resSet;
for (var resName in results) {
    if (results.hasOwnProperty(resName)) {
        resSet = results[resName];
        for (var item in resSet) {
            if (resSet.hasOwnProperty(item) && item != " ") { // Exception for space character, that's not part of our tree
                //Get rid of words with accented characters, they're not English, so would skew results
                if (!item.match(/[\u00C0-\u017F]/g)) {
                    gramChars = item.toLowerCase().replace(new RegExp("[^"+regCharSet+"]+?", "g"), "").split("");
                    for (n = 0; n < gramChars.length; n++) {
                        var branch = tree[lib.getArea(gramChars[n], areas)];
                        checkGrowth(branch, tree);
                        // Traverse tree
                        for (var n = 1; n < gramChars.length; n++) {
                            char = gramChars[n];
                            branch = traverse(branch, lib.getArea(char, areas));
                        }
                        var type = (dict.indexOf(item) > -1) ? "words" : "partials";
                        branch[type][item] = resSet[item];
                    }
                }
            }
        }
    }
}

function maintain(root, depth) {
    gram = (depth-2 < 0) ? "chars" : grams[depth-2];
    var gramTotal = (gram == "chars") ? overallCharSetChars-results.chars[" "] : gramTotals[gram];
    // Convert partial and word values to percentages (dictating probability of prediction)
    for (var partial in root.partials) {
        root.partials[partial] = root.partials[partial]/gramTotal;
    }
    for (var word in root.words) {
        root.words[word] = root.words[word]/gramTotal;
    }
    // Check child branches and prune if they've not been populated
    for (var branchName in root.branches) {
        var branch = root.branches[branchName];
        if ("partials" in branch && "words" in branch) {
            // This makes the method recursive, this tree is only going to be 4 levels deep, but any deeper and you could run into stack overflow
            maintain(branch, depth+1);
            if (Object.keys(branch).length == 0) {
                delete root.branches[branchName];
            }
        } else {
            delete root.branches[branchName];
        }
    }
    // Check for population and prune self where necessary, if everything is deleted, the parent node will cut this branch off
    if ("words" in root && Object.keys(root.words).length == 0) {
        delete root.words;
    }
    if ("partials" in root && Object.keys(root.partials).length == 0) {
        delete root.partials;
    }
    if ("branches" in root && Object.keys(root.branches).length == 0) {
        delete root.branches;
    }
}

// Post-process
for (var firstBranch in tree) {
    if (tree.hasOwnProperty(firstBranch)) {
        var branch = tree[firstBranch];
        maintain(branch, 1);
        if (Object.keys(branch).length == 0) {
            delete tree[firstBranch];
        }
    }
}

fs.writeFileSync("./tree.json", JSON.stringify(tree));