/**
 * Created by Andrew on 11/03/2015.
 */

module.exports = {
    // Programmer: Larry Battle
    // Date: Mar 06, 2011
    // Purpose: Calculate standard deviation, variance, and average among an array of numbers.
    // NB: The next 5 functions below are taken from: http://bateru.com/news/2011/03/javascript-standard-deviation-variance-average-functions/
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    },
    getNumWithSetDec: function (num, numOfDec) {
        var pow10s = Math.pow(10, numOfDec || 0);
        return ( numOfDec ) ? Math.round(pow10s * num) / pow10s : num;
    },
    getAverageFromNumArr: function (numArr, numOfDec) {
        if (!this.isArray(numArr)) {
            return false;
        }
        var i = numArr.length,
            sum = 0;
        while (i--) {
            sum += numArr[i];
        }
        return this.getNumWithSetDec((sum / numArr.length ), numOfDec);
    },
    getVariance: function (numArr, numOfDec) {
        if (!this.isArray(numArr)) {
            return false;
        }
        var avg = this.getAverageFromNumArr(numArr, numOfDec),
            i = numArr.length,
            v = 0;

        while (i--) {
            v += Math.pow((numArr[i] - avg), 2);
        }
        v /= numArr.length;
        return this.getNumWithSetDec(v, numOfDec);
    },
    getStandardDeviation: function (numArr, numOfDec) {
        if (!this.isArray(numArr)) {
            return false;
        }
        var stdDev = Math.sqrt(this.getVariance(numArr, numOfDec));
        return this.getNumWithSetDec(stdDev, numOfDec);
    },
    rules: {
        left_rect: function (f, x, h) {
            return f(x);
        },
        mid_rect: function (f, x, h) {
            return f(x + h / 2);
        },
        right_rect: function (f, x, h) {
            return f(x + h);
        },
        trapezium: function (f, x, h) {
            return (f(x) + f(x + h)) / 2;
        },
        simpson: function (f, x, h) {
            return (f(x) + 4 * f(x + h / 2) + f(x + h)) / 6;
        }
    },
    sum: function (list) {
        return list.reduce((function (a, b) {
            return a + b;
        }), 0);
    },
    integrate: function (f, a, b, steps, meth) {
        var h, i;
        h = (b - a) / steps;
        return h * this.sum((function () {
                var _i, _results;
                _results = [];
                for (i = _i = 0; 0 <= steps ? _i < steps : _i > steps; i = 0 <= steps ? ++_i : --_i) {
                    _results.push(meth(f, a + i * h, h));
                }
                return _results;
            })());
    },
    // Adapted from the Gaussian javascript library
    // Probability density function
    pdf: function (x, sd, m, v) {
        var denom = sd * Math.sqrt(2 * Math.PI);
        var e = Math.exp(-Math.pow(x - m, 2) / (2 * v));
        return e / denom;
    },
    // Adapted from the Gaussian javascript library
    // Integrated probability density function
    ipdf: function (x, sd, m, v, steps, methName) {
        var denom = sd * Math.sqrt(2 * Math.PI);
        //TODO: Test these lines
        a = x - sd;
        b = x + sd;
        //TODO: This line throws an error, as integrate expects the first parameter to be a function. Work out how to use x within the integration.
        var e = this.integrate(function(lX) {return Math.exp(-Math.pow(lX - m, 2) / (2 * v))}, a, b, steps, this.rules[methName]);
        return e / denom;
    }
};