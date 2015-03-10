#!/usr/bin/env node

 /*
 A module which provides a single API for multiple learning modules.
  */

/**
 * pickLearner
 *
 * Provides a learner based on the given parameter, each learner has a
 * guaranteed simple API (as far as motion-logger requires).
 *
 * @param learner
 */
function pickLearner(learner) {
    return learners[learner];
}

var learners = {
    brain: {
        newLearner: function() {
            var brain = require('brain');
            return new brain.NeuralNetwork();
        }
    },
    synaptic: {
        newLearner: function() {
            return new this.learner();
        },
        learner: function() {
            var synaptic = require('synaptic');
            this.network = new synaptic.Architect.Perceptron(40, 25, 3);
            this.train = function(set, opts) {
                var realOpts = (opts.log === true) ? {log: 10} : {};
                return this.network.trainer.train(set, realOpts);
            }
            this.run = function(set) {
                var result = this.network.activate(set);
                var overall = 0;
                for (var i in result) {
                    overall += result[i]
                }
                return overall/result.length;
            }
            this.toJSON = this.network.toJSON.bind(this.network);
            this.fromJSON = this.network.fromJSON.bind(this.network);
        }
    }
}

exports = pickLearner;