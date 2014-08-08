module.exports = function (app) {
	app.get('/rest/:collection', function (req, res) {
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
