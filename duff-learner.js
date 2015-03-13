/**
 * Created by Andrew on 11/03/2015.
 */

function DuffLearner(steps) {
    this.maths = require("./maths.js");
    this.result = [];
    this.len = 0;
    this.steps = (typeof steps == "number") ? steps : 10000;
}

DuffLearner.prototype.train = function(trainingSet, opts) {
    //Training
    trainingSet = trainingSet.map(function(v) {return v.input;});
    this.len = trainingSet[0].length;
    if (this.len > 0) {
        for (var i = 0; i < this.len; i++) {
            var arr = trainingSet.map(function (v) {
                return v[i];
            });
            this.result[i] = {mean: this.maths.getAverageFromNumArr(arr), variance: this.maths.getVariance(arr), standardDeviation: this.maths.getStandardDeviation(arr)};
        }
        opts.log && console.log("Learner trained.");
        return true;
    } else {opts.log && console.log("No training data submitted."); return false;}
};

DuffLearner.prototype.run = function(testArr) {
    //Running
    var certainty = 0;
    var zeros = 0;
    if (testArr.length == this.len) {
        for (var n = 0; n < this.len; n++) {
            var sd = this.result[n].standardDeviation, m = this.result[n].mean, v = this.result[n].variance;
            certainty += (sd == 0 || v == 0) ? 0.5 / this.len : this.maths.ipdf(testArr[n], sd, m, v, this.steps, "simpson") / this.len;
        }
        return certainty;
    } else {
        return NaN;
    }
};

DuffLearner.prototype.toJSON = function() {
    return JSON.stringify(this.result);
};

DuffLearner.prototype.fromJSON = function(json) {
    try {
        this.result = JSON.parse(json);
        this.len = this.result.length;
        return this;
    } catch (e) {
        console.error("There was an error parsing the JSON.");
        return null;
    }
};

module.exports = DuffLearner;