#!/usr/bin/env node

/**
 * Finds all the *grams up to quadrigrams
 *
 * Created by Andrew on 25/03/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var fs = require('fs'); // FileSystem
var sampleText = stripBoilerPlate(fs.readFileSync("./prideandprejudice.txt", "utf8"));
var charSet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"," "];
var logPeriod = 1000;

function stripBoilerPlate(text) {
    var start = text.indexOf("*** START OF THIS PROJECT GUTENBERG EBOOK");
    var end = text.indexOf("*** END OF THIS PROJECT GUTENBERG EBOOK");
    return text.substring(start, end).replace(/^.+?\n/, "");
}

function sortAndPrettyPrint(obj) {
    var sortable = [];
    for (var itm in obj) {
        sortable.push([itm, obj[itm]])
    }
    sortable.sort(function(a, b) {return b[1] - a[1]})
    var ret = "";
    for (var i = 0; i < sortable.length; i++) {
        ret += sortable[i][0]+": "+sortable[i][1]+"\n";
    }
    return ret;
}

var results = {chars: {}, bigrams: {}, trigrams: {}, quadrigrams: {}};
var overallCharSetChars = 0;

var charArr = sampleText.split("");
var wordArr = sampleText.split(" ");

console.log("Character analysis");
for (var i = 0; i < charArr.length; i++) {
    var char = charArr[i];
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
for (var x = 0; x < grams.length; x++) {
    var gram = grams[x];
    var gramLen = x+2;
    console.log(gram+" ("+gramLen+") analysis");
    for (i = 0; i < wordArr.length; i++) {
        var wordChars = wordArr[i].replace(/[^a-z ]+?/g, "").split("");
        if (i % logPeriod == 0) {console.log("Word "+(i+1)+" of "+wordArr.length);}
        if (wordChars.length >= gramLen) {
            for (var n = 0; n+(gramLen-1) < wordChars.length; n++) {
                var gramInst = "";
                for (var y = n; y < gramLen+n; y++) {
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

var finalReturn = JSON.stringify(results)+"\nChars:\n\n"+sortAndPrettyPrint(results.chars)+"\n\nBigrams:\n\n"+sortAndPrettyPrint(results.bigrams)+"\n\nTrigrams:\n\n"+sortAndPrettyPrint(results.trigrams)+"\n\nQuadrigrams:\n\n"+sortAndPrettyPrint(results.quadrigrams);

fs.writeFileSync("./results.txt", finalReturn);
console.log(finalReturn);