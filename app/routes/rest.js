var _ = require('lodash');

function autoType(obj) {
	var digitValue;
	for (var key in obj) {
		if (key != '_id') {
			if (typeof obj[key] == 'string') {
				digitValue = parseInt(obj[key]);
				if (obj[key] == digitValue.toString()) {
					obj[key] = digitValue;
				}
			} else {
				autoType(obj[key]);
			}
		}
	}
}

module.exports = function (app) {
	app.io.on('connect', function (socket) {
		socket.on('read', function (input, fn) {
			if (input.collection) {
				app.crud.read(input.collection, input.where || {}, socket.request.user).then(function (result) {
					fn(result);
				}, function (err) {
					fn({
						error: err
					});
				});
			}
		});

		socket.on('delete', function (input, fn) {
			if (input.collection && input.id) {
				app.crud.delete(input.collection, input.id, socket.request.user).then(function (result) {
					fn({
						_id: req.params.id
					});
				}, function (err) {
					fn({
						error: err
					});
				});
			}
		});

		socket.on('update', function (input, fn) {
			if (input.collection && input.id && input.data) {
				app.crud.update(input.collection, input.id, input.data, socket.request.user).then(function (result) {
					fn(result);
				}, function (err) {
					fn({
						error: err
					});
				});
			}
		});

		socket.on('create', function (input, fn) {
			if (input.collection && input.data) {
				app.crud.create(input.collection, input.data, socket.request.user).then(function (result) {
					fn(result);
				}, function (err) {
					fn({
						error: err
					});
				});
			}
		});

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
