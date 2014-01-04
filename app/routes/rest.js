var mongodb = require('mongodb');
var _ = require('lodash');

exports.init = function (app) {
	app.get('/admin/rest/:collection', function (request, response) {
		var db = app.get('db');
		if (request.query.hasOwnProperty('_id')) {
			request.query._id = new mongodb.ObjectID(request.query._id.toString());
		}
		var optionKeys = ['skip', 'limit', 'sort'];
		var options = {};
		optionKeys.forEach(function (key) {
			options[key] = request.query[key];
			delete request.query[key];
		});
		db.collection(request.params.collection).find(request.query, options).toArray(function (err, result) {
			response.send(result);
		});
	});

	app.delete('/admin/rest/:collection/:id', function (request, response) {
		var db = app.get('db');
		db.collection(request.params.collection).remove({ "_id": new mongodb.ObjectID(request.params.id) }, function (err, numRemoved) {
			if (err) {
				response.status(500).send();
			} else {
				response.status(200).send({ "_id": request.params.id });
			}
		});
	});

	app.put('/admin/rest/:collection/:id', function (request, response) {
		var db = app.get('db');

		if (request.body.hasOwnProperty('_id')) {
			delete request.body._id;
		}

		db.collection(request.params.collection).update({
			"_id": new mongodb.ObjectID(request.params.id)
		}, {
			"$set": request.body
		}, function (error, results) {
			if (error) {
				response.status(500).send();
			} else {
				response.status(200).send({ "_id": request.params.id });
			}
		});
	});

	app.post('/admin/rest/:collection', function (request, response) {
		var db = app.get('db');

		if (request.body.hasOwnProperty('_id')) {
			delete request.body._id;
		}

		db.collection(request.params.collection).insert(request.body, function (err, results) {
			if (err) {
				response.status(500).send();
			} else {
				response.status(200).send(results[0]);
			}
		});
	});
};