#!/usr/bin/env node

var restify = require('restify') //API server
  , save = require('save') //Database interface
  , saveMongodb = require('save-mongodb')
  , chance = require('chance').Chance() //Salt generator
  , crypto = require('crypto') //Hasher
  , Db = require('mongodb').Db //MongoDB Database object
  , DbServer = require('mongodb').Server //MondoDB Server object
  , subjSaveDb = new Db('TestSubjects', new DbServer('localhost', 27017, {})) //Initialisation of the TestSubjects database
  , subjSave; //Initialising db interface object

if (process.argv[2] == "--dryrun") {
	console.log("Running in dry run mode, none of the data passed through the API will be saved!");
	subjSave = save('TestSubjects');
	init();
} else {
	console.log("Running in normal mode, all data will be saved to the specified DB!\nOpening database...");
	//Open database
	subjSaveDb.open(function(error, connection) {
		if (error) {console.log("Error opening database! "+JSON,stringify(error.errors));}

		connection.collection('sessions', function(error, collection) {
			console.log("Chosen collection, successful connection...");
			subjSave = save('TestSessions', {engine: saveMongodb(collection)});
			init();
		});
	});
}

function init() {
	var server = restify.createServer({ name: 'motion-collector-api'});

	server.listen(8080, function() {
		console.log('%s listening at %s', server.name, server.url)
	})

	server
		.use(restify.fullResponse())
		.use(restify.bodyParser())

	server.post('/newsession', function(req, res, next) {
		subjSave.create({ subjectCreation: new Date().getTime() }, function(saveErr, savedObject) {
			if (saveErr) return next(new restify.InvalidArgumentError(JSON.stringify(saveErr.errors)));

			var shasum = crypto.createHash('sha1');
			shasum.update(savedObject._id+chance.string({length: 20}), 'utf-8');
			subjSave.update({ _id: savedObject._id, hash: shasum.digest('hex'), clientEnvironment: req.params.clientEnvr}, function(updateErr, updatedObject) {
				if (updateErr) return next(new restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));
					console.log(updatedObject);

				res.send(201, {id: updatedObject.hash});
			});
		});
	});

	server.put('/session/:hash', function(req, res, next) {
		var dataArr;
		try {
			dataArr = JSON.parse(req.params.data);
		} catch(e) {
			return next(new restify.InvalidArgumentError('The data provided was corrupted.'));
		}
		subjSave.findOne({hash: req.params.hash}, function(findErr, subj) {
			if (findErr) return next(new restify.InvalidArgumentError(JSON.stringify(findErr.errors)));

			subjSave.update({_id: subj._id, data: (subj.data||[]).concat(dataArr)}, function(updateErr, updatedObject) {
				if (updateErr) return next(new restify.InvalidArgumentError(JSON.stringify(updateErr.errors)));

				res.send();
			});
		});
	});
}