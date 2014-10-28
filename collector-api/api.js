#!/usr/bin/env node

var restify = require('restify')
  , subjSave = require('save')('testSubjects')
  , chance = require('chance').Chance()
  , crypto = require('crypto');

var server = restify.createServer({ name: 'motion-collector-api'})

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url)
})

server
	.use(restify.fullResponse())
	.use(restify.bodyParser())

server.get('/newsession', function(req, res, next) {
	subjSave.create({ subjectCreation: new Date().getTime() }, function(saveErr, savedObject) {
		if (saveErr) return next(new restify.InvalidArgumentError(JSON.stringify(saveErr.errors)));

		var shasum = crypto.createHash('sha1');
		shasum.update(savedObject._id+chance.string({length: 20}), 'utf-8');
		subjSave.update({ _id: savedObject._id, hash: shasum.digest('hex')}, function(updateErr, updatedObject) {
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
	subjSave.update({hash: req.params.hash, data: data})
});