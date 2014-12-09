#!/usr/bin/env node

exports.init = function() {

    var that = this;

    //Create the promise object for returning
    var scopeCrosser = {};
    var promExtractor = function(resolve, reject) {this.resolve = resolve; this.reject = reject;};
    var ret = new Promise(promExtractor.bind(scopeCrosser));

    var subjSaveDb = new this.Db('TestSubjects', new this.DbServer('localhost', 27017, {})) //Initialisation of the TestSubjects database
        , subjCol; //Initialising db interface object
    var visuSaveDb = new this.Db('Visualisations', new this.DbServer('localhost', 27017, {})) //Initialisation of the Visualisations database
        , visuCol; //Initialising db interface object

    if (this.isDryRun) {
        subjCol = this.save('TestSubjects');
        visuCol = this.save('VisulisationSessions');
        finishInit();
    } else {
        var testProm = {};
        var testDone = new Promise(promExtractor.bind(testProm));
        var visuProm = {};
        var visuDone = new Promise(promExtractor.bind(visuProm));

        subjSaveDb.open(function (error, connection) {
            if (error) {
                testProm.reject("Error opening TestSubjects database! " + JSON.stringify(error.errors));
                return false;
            }

            connection.collection('sessions', function (error, collection) {
                if (error) {
                    testProm.reject("Error choosing TestSubjects collection! " + JSON.stringify(error.errors));
                    return false;
                }
                console.log("Chosen TestSubjects collection, successful connection...");
                subjCol = that.save('TestSessions', {engine: that.saveMongodb(collection)});
                testProm.resolve();
            });
        });

        visuSaveDb.open(function (error, connection) {
            if (error) {
                visuProm.reject("Error opening Visualisations database! " + JSON.stringify(error.errors));
                return false;
            }

            connection.collection('sessions', function (error, collection) {
                if (error) {
                    visuProm.reject("Error choosing Visualisations collection! " + JSON.stringify(error.errors));
                    return false;
                }
                console.log("Chosen Visualisations collection, successful connection...");
                visuCol = that.save('VisualisationSessions', {engine: that.saveMongodb(collection)});
                visuProm.resolve();
            });
        });

        Promise.all([testDone, visuDone]).then(finishInit, scopeCrosser.reject.bind(scopeCrosser));
    }

    return ret;

    function finishInit() {
        that.server
            .use(that.restify.fullResponse())
            .use(that.restify.bodyParser());

        that.server.get('/newsession', function (req, res, next) {
            visuCol.create({visualisationStart: new Date().getTime(), sessionsSeen: []}, function (saveErr, savedObject) {
                if (saveErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(saveErr.errors)));

                var shasum = that.crypto.createHash('sha1');
                shasum.update(savedObject._id + that.chance.string({length: 20}), 'utf-8');
                visuCol.update({
                    _id: savedObject._id,
                    hash: shasum.digest('hex')
                }, function (updateErr, updatedObject) {
                    if (updateErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));
                    console.log(updatedObject);

                    res.send(201, {id: updatedObject.hash});
                });
            });
        });

        that.server.get('/getnewdata/:hash', function (req, res, next) {
            var hash = req.params.hash.replace(/[^a-zA-Z0-9!@#$%^&*()]/g, "").substring(0, 40);
            visuCol.findOne({hash: hash}, function(findErr, visu) {
                if (findErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(findErr.errors)));

                var query = {hash: {$nin: visu.sessionsSeen}};
                subjCol.count(query, function(cntErr, seshCnt) {
                    if (cntErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(cntErr.errors)));
                    if (seshCnt == 0) return next(new that.restify.ResourceNotFoundError("No more sessions are available."));

                    var randInd = Math.floor(Math.random() * seshCnt);
                    subjCol.find(query, function(fndErr, seshArr) {
                        if (fndErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(fndErr.errors)));

                        var chosenEntry = seshArr[randInd];
                        visuCol.update({_id: visu._id, sessionsSeen: visu.sessionsSeen.concat(chosenEntry.hash)}, false, function(updateErr) {
                            if (updateErr) return next(new that.restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));

                            res.send(200, chosenEntry.data);
                        });
                    });
                });
            });
        });

        scopeCrosser.resolve();
    }
};