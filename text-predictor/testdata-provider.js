#!/usr/bin/env node

/**
 * A provider that provides a random paragraph from a test text, encoded as sequences of area names.
 *
 * Created by Andrew on 28/03/2015.
 */

//Shim for Promises
if (typeof Promise == "undefined") {Promise = require("promise");}

var lib = require('../common.js'); // Common functions
var Chance = require('chance'); // Random data generator
var chance = new Chance();
var config = lib.loadConfigs("../detector-config.json", "./config.json"); //Load in global and local config
var testText = lib.loadSamples("./testtexts/aliceinwonderland.txt", lib.stripBoilerPlate);
var regCharSet = config.regCharSet;
var charSet = config.keySet;
var areas = config.areaDefinitionsNoDupe;
var dict = lib.loadDict("./dict.txt");

var wordArr = testText.replace(/\s\s|\s/g, " ").split(" ");

function getWordSequence(length) {
    if (length < wordArr.length) {
        var ind = chance.integer({min: length, max: wordArr.length})-length;
        var cnt = length;
        var ret = [];
        while(cnt > 0 && ind < wordArr.length) {
            var word = lib.charSetTrim(wordArr[ind].toLowerCase(), regCharSet);
            if (word.length > 0) {
                ret.push(word);
                cnt--;
            }
            ind++;
        }
        return ret.join(" ");
    } else {
        return wordArr.join(" ");
    }
}

function provideEncodedSequence() {
    var words;
    switch (typeof arguments[0]) {
        case "string":
            words = arguments[0];
            break;
        default:
            words = getWordSequence(arguments[0]||20);
            break;
    }
    var safetyCnt = 1000;
    while(words.match(new RegExp("[^"+regCharSet+"'-]", "g")) && safetyCnt > 0) {
        words = getWordSequence(length);
        safetyCnt--;
    }
    var chars = words.replace(/'/g, "").replace(/ /g, " ").split("");
    var ret = [];
    for (var i = 0; i < chars.length; i++) {
        ret[i] = {area: lib.getArea(chars[i], areas), char: chars[i]};
    }
    return ret;
}

exports.getSequence = provideEncodedSequence;
