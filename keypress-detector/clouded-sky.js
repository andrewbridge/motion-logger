#!/usr/bin/env node

/**
 * Created by Andrew on 16/02/2015.
 *
 * CloudedSky
 *
 * Based on the Stream class but it mirrors a previously observed Stream (hence Sky)
 * This has been ported to JS and organised as a node.js include on the server. (hence CloudedSky)
 */
exports.init = function(streamArr) {
    function CloudedSky(streamArr) {
        this.store = streamArr;
        this.startTime = this.store[0].data.startTime;
    }

    CloudedSky.prototype.deconstructor = function () {
        return true;
    }

    CloudedSky.prototype.get = function (index) {
        if (index < this.store.length) {
            return this.store[index];
        } else {
            return false;
        }
    }

    CloudedSky.prototype.pick = function (index) {
        if (index >= this.store.length) {
            return (this.pop() || false);
        } else {
            return (this.store.splice(index, 1) || false);
        }
    }

    CloudedSky.prototype.isEmpty = function (minVal) {
        minVal = (typeof minVal == "undefined") ? 0 : minVal;
        return (this.store.length < minVal);
    }

    return new CloudedSky(streamArr);
}
