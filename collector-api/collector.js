#!/usr/bin/env node

exports.init = function() {

    var that = this;

    //Create the promise object for returning
    var scopeCrosser = {};
    var promExtractor = function(resolve, reject) {this.resolve = resolve; this.reject = reject;};
    var ret = new Promise(promExtractor.bind(scopeCrosser));

    var subjSaveDb = new this.Db('TestSubjects', new this.DbServer('localhost', 27017, {})) //Initialisation of the TestSubjects database
        , subjSave; //Initialising db interface object

    if (this.isDryRun) {
        subjSave = this.save('TestSubjects');
        finishInit();
    } else {
        subjSaveDb.open(function (error, connection) {
            if (error) {
                scopeCrosser.reject("Error opening database! " + JSON.stringify(error.errors));
            }

            connection.collection('sessions', function (error, collection) {
                if (error) {
                    scopeCrosser.reject("Error choosing collection! " + JSON.stringify(error.errors));
                }
                console.log("Chosen collection, successful connection...");
                subjSave = that.save('TestSessions', {engine: that.saveMongodb(collection)});
                finishInit();
            });
        });
    }

    return ret;

    function finishInit() {
        that.server
            .use(that.restify.fullResponse())
            .use(that.restify.bodyParser());

        that.server.post('/newsession', function (req, res, next) {
            subjSave.create({subjectCreation: new Date().getTime()}, function (saveErr, savedObject) {
                if (saveErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(saveErr.errors)));

                var shasum = that.crypto.createHash('sha1');
                shasum.update(savedObject._id + that.chance.string({length: 20}), 'utf-8');
                subjSave.update({
                    _id: savedObject._id,
                    hash: shasum.digest('hex'),
                    clientEnvironment: req.params.clientEnvr
                }, function (updateErr, updatedObject) {
                    if (updateErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));
                    console.log(updatedObject);

                    res.send(201, {id: updatedObject.hash});
                });
            });
        });

        that.server.put('/session/:hash', function (req, res, next) {
            var dataArr;
            try {
                dataArr = JSON.parse(req.params.data);
            } catch (e) {
                return next(new that.restify.InvalidArgumentError('The data provided was corrupted.'));
            }
            subjSave.findOne({hash: req.params.hash}, function (findErr, subj) {
                if (findErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(findErr.errors)));

                subjSave.update({
                    _id: subj._id,
                    data: (subj.data || []).concat(dataArr)
                }, function (updateErr, updatedObject) {
                    if (updateErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));

                    res.send();
                });
            });
        });

        scopeCrosser.resolve();
    }
};