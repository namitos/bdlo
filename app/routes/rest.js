var _ = require('lodash');
var util = require('util');

function autoType(obj) {
	for (var key in obj) {
		if (key != '_id' && obj.hasOwnProperty(key)) {
			if (obj[key] instanceof Function) {
			} else if (obj[key] instanceof Object) {
				autoType(obj[key]);
			} else if (typeof obj[key] == 'string') {
				var digitValue = parseInt(obj[key]);
				if (obj[key] == digitValue.toString()) {
					obj[key] = digitValue;
				}
			}
		}
	}
}

module.exports = function (app) {
	app.io.on('connect', function (socket) {

		socket.on('read', function (input, fn) {
			if (input.collection) {
				app.crud.middleware.run(input, function (err) {
					if (err) return fn({
						error: err
					});
					app.crud.read(input.collection, input.data || {}, socket.request.user).then(function (result) {
						fn(result);
					}, function (err) {
						fn({
							error: err
						});
					});
				});
			}
		});

		socket.on('delete', function (input, fn) {
			if (input.collection && input.id) {
				app.crud.middleware.run(input, function (err) {
					if (err) return fn({
						error: err
					});
					app.crud.delete(input.collection, input.id, socket.request.user).then(function (result) {
						fn({
							_id: req.params.id
						});
					}, function (err) {
						fn({
							error: err
						});
					});
				});
			}
		});

		socket.on('update', function (input, fn) {
			if (input.collection && input.id && input.data) {
				app.crud.middleware.run(input, function (err) {
					if (err) return fn({
						error: err
					});
					app.crud.update(input.collection, input.id, input.data, socket.request.user).then(function (result) {
						fn(result);
					}, function (err) {
						fn({
							error: err
						});
					});
				});
			}
		});

		socket.on('create', function (input, fn) {
			if (input.collection && input.data) {
				app.crud.middleware.run(input, function (err) {
					if (err) return fn({
						error: err
					});
					app.crud.create(input.collection, input.data, socket.request.user).then(function (result) {
						fn(result);
					}, function (err) {
						fn({
							error: err
						});
					});
				});
			}
		});

		socket.on('schemas', function (input, fn) {
			var schemasAvailable = {};
			var schemas = app.get('conf').schemas;
			var user = socket.request.user;
			for (var collectionName in schemas) {
				if (
					user.permission(collectionName + ' all all') ||
					user.permission(collectionName + ' read all') ||
					user.permission(collectionName + ' all his') ||
					user.permission(collectionName + ' read his')
				) {
					schemasAvailable[collectionName] = schemas[collectionName];
				}
			}
			fn(util.inspect(schemasAvailable, {depth: null}));
		});
	});


	//optimized load by http
	app.get('/loadCollections', function (req, res) {
		try {
			var input = JSON.parse(req.query.data);
			var promises = [];
			input.forEach(function (row) {
				promises.push(app.crud.read(row.collection, row.where || {}, req.user));
			});
			Promise.all(promises).then(function (result) {
				res.send(result);
			}, function (err) {
				res.send({
					error: err
				});
			});
		} catch (e) {
			console.error(e);
		}
	});


	app.get('/rest/:collection', function (req, res) {
		if (req.query.hasOwnProperty('noAutoType')) {
			delete req.query.noAutoType;
		} else {
			autoType(req.query);
		}
		app.crud.read(req.params.collection, req.query, req.user).then(function (result) {
			res.send(result);
		}, function (err) {
			res.status(403).send(err);
		});
	});

	app.delete('/rest/:collection/:id', function (req, res) {
		app.crud.delete(req.params.collection, req.params.id, req.user).then(function (result) {
			res.send({
				_id: req.params.id
			});
		}, function (err) {
			res.status(403).send(err);
		});
	});

	app.put('/rest/:collection/:id', function (req, res) {
		app.crud.update(req.params.collection, req.params.id, req.body, req.user).then(function (result) {
			res.send(result);
		}, function (err) {
			res.status(403).send(err);
		});
	});

	app.post('/rest/:collection', function (req, res) {
		app.crud.create(req.params.collection, req.body, req.user).then(function (result) {
			res.send(result);
		}, function (err) {
			res.status(403).send(err);
		});
	});
};
