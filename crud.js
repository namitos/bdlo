'use strict';

var util = require('util');

var _ = require('lodash');
var Queue = require('queue');

module.exports = (app) => {
	var prepareFilesMiddleware = require('model-files')(app.conf.fileUpload);

	function connectionsMiddleware(data) {
		var input = data.input;
		var items = data.items;
		if (!input.connections) {
			return Promise.resolve(data);
		} else {
			var promises = [];
			var modelKeys = Object.keys(input.connections);
			modelKeys.forEach((modelName) => {
				var connection = input.connections[modelName];
				var where = connection.where || {};
				where[connection.r] = {
					$in: _.uniq(_.compact(_.map(items, connection.l)))
				};

				if (connection.r == '_id') {
					where[connection.r] = app.util.prepareId(where[connection.r]);
				} else {
					where[connection.r].$in = where[connection.r].$in.map((id) => {
						return id.toString();
					});
				}
				if (app.crud[modelName] && data.user.crudPermission('read', {
						collection: modelName,
						where: where
					})) {
					promises.push(app.models[modelName].read(where));
				} else {
					promises.push(Promise.reject('access denied'));
				}
			});
			return Promise.all(promises).then((result) => {
				var groups = {};
				result.forEach((items, i) => {
					var modelName = modelKeys[i];
					groups[modelName] = _.groupBy(items, input.connections[modelName].r);
				});
				items.forEach(function (item) {
					item.connections = {};
					Object.keys(groups).forEach((modelName) => {
						var connection = input.connections[modelName];
						var key = _.get(item, connection.l);
						item.connections[modelName] = groups[modelName][key] ? groups[modelName][key] : [];
					});
				});
				return data;
			});
		}
	};


	function c(data) {
		return data.item.create().then((item) => {
			return data;
		});
	}

	function r(data) {
		return data.model.read(data.input.where, data.input.options).then((items) => {
			data.items = items;
			return data;
		});
	}

	function u(data) {
		return data.item.update(data.input.where).then((item) => {
			return data;
		});
	}

	function d(data) {
		return data.item.delete(data.input.where).then((deleted) => {
			data.deleted = deleted;
			return data;
		})
	}

	var crud = {};
	var c2m = {};//collections to models mapping
	Object.keys(app.models).forEach((modelName) => {
		if (modelName != 'Model') {
			crud[modelName] = {
				model: app.models[modelName],
				c: new Queue(prepareFilesMiddleware, c),
				r: new Queue(r, connectionsMiddleware),
				u: new Queue(prepareFilesMiddleware, u),
				d: new Queue(d)
			};
			if (app.models[modelName].schema) {
				if (!app.models[modelName].schema.name) {
					throw new Error(`schema.name of ${modelName} is required!`);
				}
				c2m[app.models[modelName].schema.name] = modelName;
			}
		}
	});

	app.crud = crud;


	app.io.on('connect', (socket) => {
		socket.on('data:create', (input, fn) => {
			input.collection = c2m[input.collection];
			if (app.crud[input.collection] && socket.request.user.crudPermission('create', input)) {
				app.crud[input.collection].c.run({
					socket: socket,
					user: socket.request.user,
					input: input,
					item: new app.crud[input.collection].model(input.data)
				}).then((data) => {
					fn(data.item);
				}).catch((err) => {
					console.error(err);
					fn({
						error: err
					});
				});
			} else {
				fn({
					error: 'access denied'
				});
			}
		});

		socket.on('data:read', (input, fn) => {
			input.collection = c2m[input.collection];
			input.where = input.where || {};
			if (app.crud[input.collection] && socket.request.user.crudPermission('read', input)) {
				if (input.where._id) {
					input.where._id = app.util.prepareId(input.where._id);
				}
				app.crud[input.collection].r.run({
					socket: socket,
					user: socket.request.user,
					input: input,
					model: app.crud[input.collection].model
				}).then((data) => {
					fn(data.items);
				}).catch((err) => {
					console.error(err);
					fn({
						error: err
					});
				});
			} else {
				fn({
					error: 'access denied'
				});
			}
		});

		socket.on('data:update', (input, fn) => {
			input.collection = c2m[input.collection];
			if (app.crud[input.collection] && socket.request.user.crudPermission('update', input)) {
				app.crud[input.collection].u.run({
					socket: socket,
					user: socket.request.user,
					input: input,
					item: new app.crud[input.collection].model(input.data)
				}).then(function (data) {
					fn(data.item);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			} else {
				fn({
					error: 'access denied'
				});
			}
		});

		socket.on('data:delete', (input, fn) => {
			input.collection = c2m[input.collection];
			if (app.crud[input.collection] && socket.request.user.crudPermission('delete', input)) {
				app.crud[input.collection].d.run({
					socket: socket,
					user: socket.request.user,
					input: input,
					item: new app.crud[input.collection].model(input.data)
				}).then(function (data) {
					fn(data.deleted);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			} else {
				fn({
					error: 'access denied'
				});
			}
		});


		socket.on('data:schemas', (input, fn) => {
			var schemasAvailable = {};
			Object.keys(app.models).forEach((modelName) => {
				if (
					app.models[modelName].schema/* &&
				 socket.request.user.crudPermission('read', {collection: modelName})*/
				) {
					schemasAvailable[modelName] = app.models[modelName].schema;
				}
			});
			fn(util.inspect(schemasAvailable, {depth: null}));
		});

		socket.on('data:breadcrumb', (input, fn) => {
			input.collection = c2m[input.collection];
			input.where = input.where || {};
			if (
				app.models[input.collection] &&
				app.models[input.collection].breadcrumb &&
				socket.request.user.crudPermission('read', input)
			) {
				app.models[input.collection].breadcrumb(input.where._id).then((items) => {
					fn(items);
				}).catch((err) => {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});
	});
};
