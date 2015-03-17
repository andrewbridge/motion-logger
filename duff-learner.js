/**
 * Created by Andrew on 11/03/2015.
 *
 * DuffLearner (from Probability Density Function -> PDF -> phonetically "puh-duh-eff" -> scrape the "puh" -> Duff (and the learner being duff))
 *
 * DuffLearner is a simple learning class which will learn a single pattern and, when run against new input, produce a
 * certainty between 0-1 as to whether the input is similar to the learnt pattern.
 */

function DuffLearner() {
    this.maths = require("./maths.js");
    this.result = [];
    this.resultAnalysis = {};
    this.len = 0;
    this.bias = 0;
    this.initBias = 0.01;
    this.maxIterations = 1000;
    this.errorThresh = 0.35; // The error threshold is the number of values which can't be trained to the clamp
    this.realError = NaN;
    this.learningRate = 0.3;
    this.logRate = 10;
    this.log = false;
    this.clamp = 0.9;
}

DuffLearner.prototype.train = function(trainingSet, opts) {
    //Training
    var res = false;
    this.log = opts.log;
    var isArr = (trainingSet.length > 0 && trainingSet[0] instanceof Array);
    if (!isArr) {this.clamp = trainingSet[0].output[Object.keys(trainingSet[0].output)[0]]-0.2;}
    trainingSet = (!isArr) ? trainingSet.map(function(v) {return v.input;}) : trainingSet;
    this.len = (trainingSet.length > 0) ? trainingSet[0].length : 0;
    if (this.analyseData(trainingSet)) {
        if (this.analyseResult(trainingSet)) {
            var currentError = 1;
            var its = 0;
            while (its < this.maxIterations && currentError > this.errorThresh) {
                var falseNegatives = 0;
                for (var i = 0; i < trainingSet.length; i++) {
                    var result = this.run(trainingSet[i]);
                    if (result > this.clamp+0.05) {
                        this.bias += this.learningRate;
                    } else if (result < this.clamp-0.05) {
                        this.bias -= this.learningRate;
                        falseNegatives++;
                    }
                    //console.log(result, this.bias, falseNegatives);
                }
                this.log && i % this.logRate == 0 && console.log("Learning iteration "+(its+1));
                currentError = falseNegatives/trainingSet.length;
                its++;
            }
            this.realError = currentError;
            if (currentError <= this.errorThresh) {
                console.log("Learner trained.");
                res = true;
            } else {
                console.log("Learner could not be trained.");
            }
            this.log && console.log("Error: " + currentError + ". Iterations: " + its + ".");
        }
    }
    return res;
};

DuffLearner.prototype.analyseData = function(data) {
    if (this.len > 0) {
        for (var i = 0; i < this.len; i++) {
            var arr = data.map(function (v) {
                return v[i];
            });
            this.result[i] = {mean: this.maths.getAverageFromNumArr(arr), variance: this.maths.getVariance(arr), standardDeviation: this.maths.getStandardDeviation(arr)};
        }
        this.log && console.log("Data analysed.");
        return true;
    } else {this.log && console.log("No training data submitted."); return false;}
};

DuffLearner.prototype.analyseResult = function(data) {
    var rawArr = data.map(this.iterMap.bind(this));
    if (rawArr.indexOf(NaN) == -1) {
        this.resultAnalysis.mean = this.maths.getAverageFromNumArr(rawArr);
        this.resultAnalysis.stde = this.maths.getStandardDeviation(rawArr);
        this.log && console.log("Results analysed.");
        return true;
    } else {this.log && console.log("An issue occurred during result analysis."); return false;}
};

DuffLearner.prototype.rawIter = function(testArr) {
    //Running
    var certainty = 0;
    if (testArr.length == this.len) {
        for (var n = 0; n < this.len; n++) {
            var sd = this.result[n].standardDeviation, m = this.result[n].mean, v = this.result[n].variance;
            certainty += (sd == 0 || v == 0) ? 0.5 / this.len : this.maths.pdf(testArr[n], sd, m, v) / this.len;
        }
        return certainty;
    } else {
        return NaN;
    }
};

DuffLearner.prototype.run = function(testArr) {
    var raw = this.rawIter(testArr);
    var biasbias = 1;
    var boundary = this.getNearestBoundary(raw);
    var outOfBounds = (raw > this.resultAnalysis.mean) ? raw > boundary : raw < boundary;
    if (outOfBounds) {
        biasbias += this.maths.prctDiff(boundary, raw)/100;
    }
    var res = 1-this.maths.prctDiff(this.resultAnalysis.mean, raw)*((this.bias+1)*biasbias)/100;
    return (res < 0) ? 0 : res;
};

DuffLearner.prototype.iterMap = function(v, i, a) {
    this.log && i % this.logRate == 0 && console.log("Analysing result "+(i+1)+" of "+a.length);
    return this.rawIter(v);
};

DuffLearner.prototype.getNearestBoundary = function(val) {
    return (val > this.resultAnalysis.mean) ? this.resultAnalysis.mean + this.resultAnalysis.stde : this.resultAnalysis.mean - this.resultAnalysis.stde;
}

DuffLearner.prototype.toJSON = function() {
    var obj = {result: this.result, resultAnalysis: this.resultAnalysis, log: this.log, error: this.realError, clamp: this.clamp, bias: parseFloat((this.bias).toFixed(20))};
    return JSON.stringify(obj);
};

DuffLearner.prototype.fromJSON = function(json) {
    try {
        var obj = JSON.parse(json);
        this.result = obj.result;
        this.len = this.result.length;
        this.resultAnalysis = obj.resultAnalysis;
        this.log = obj.log;
        this.realError = obj.error;
        this.clamp = obj.clamp;
        this.bias = obj.bias;
        return this;
    } catch (e) {
        console.error("There was an error parsing the JSON.", e);
        return null;
    }
};

module.exports = DuffLearner;