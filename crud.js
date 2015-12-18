'use strict';

var util = require('util');

var _ = require('lodash');
var Queue = require('queue');

module.exports = function (app) {
	var prepareFilesMiddleware = require('model-files')(app.conf.fileUpload);

	var connectionsMiddleware = function (data) {
		var input = data.input;
		var items = data.items;
		if (!input.connections) {
			return new Promise(function (resolve) {
				resolve(data);
			})
		} else {
			var promises = [];
			var modelKeys = Object.keys(input.connections);
			modelKeys.forEach(function (modelName) {
				var connection = input.connections[modelName];
				var where = {};
				where[connection.r] = {
					$in: _.uniq(_.compact(_.pluck(items, connection.l)))
				};

				if (connection.r == '_id') {
					where[connection.r] = app.util.prepareId(where[connection.r]);
				} else {
					where[connection.r].$in = where[connection.r].$in.map(function (id) {
						return id.toString();
					});
				}
				//todo: crudPermission
				//console.log(modelName, where);
				promises.push(app.models[modelName].read(where));
			});
			return Promise.all(promises).then(function (result) {
				return new Promise(function (resolve) {
					var groups = {};
					result.forEach(function (items, i) {
						var modelName = modelKeys[i];
						groups[modelName] = _.groupBy(items, input.connections[modelName].r);
					});
					items.forEach(function (item) {
						item.connections = {};
						Object.keys(groups).forEach(function (modelName) {
							var connection = input.connections[modelName];
							var key = _.get(item, connection.l);
							item.connections[modelName] = groups[modelName][key] ? groups[modelName][key] : [];
						});
					});
					resolve(data);
				});
			});
		}
	};


	class Crud {
		constructor(app) {
			function c(data) {
				return data.item.create().then(function (item) {
					return data;
				});
			}

			function r(data) {
				return data.model.read(data.input.where, data.input.options).then(function (items) {
					data.items = items;
					return data;
				});
			}

			function u(data) {
				return data.item.update().then(function (item) {
					return data;
				});
			}

			function d(data) {
				return data.item.delete().then(function (deleted) {
					data.deleted = deleted;
					return data;
				})
			}

			var crud = this;
			Object.keys(app.models).forEach(function (modelName) {
				crud[modelName] = {
					c: new Queue(prepareFilesMiddleware, c),
					r: new Queue(r, connectionsMiddleware),
					u: new Queue(prepareFilesMiddleware, u),
					d: new Queue(d)
				};
			});

		}
	}

	app.crud = new Crud(app);


	app.io.on('connect', function (socket) {
		socket.on('data:create', function (input, fn) {
			if (app.models[input.collection] && socket.request.user.crudPermission('create', input)) {
				app.crud[input.collection].c.run({
					user: socket.request.user,
					input: input,
					item: new app.models[input.collection](input.data)
				}).then(function (data) {
					fn(data.item);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});

		socket.on('data:read', function (input, fn) {
			input.where = input.where || {};
			if (app.models[input.collection] && socket.request.user.crudPermission('read', input)) {
				if (input.where._id) {
					input.where._id = app.util.prepareId(input.where._id);
				}
				app.crud[input.collection].r.run({
					user: socket.request.user,
					input: input,
					model: app.models[input.collection]
				}).then(function (data) {
					fn(data.items);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});

		socket.on('data:update', function (input, fn) {
			if (app.models[input.collection] && socket.request.user.crudPermission('update', input)) {
				app.crud[input.collection].u.run({
					user: socket.request.user,
					input: input,
					item: new app.models[input.collection](input.data)
				}).then(function (data) {
					fn(data.item);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});

		socket.on('data:delete', function (input, fn) {
			if (app.models[input.collection] && socket.request.user.crudPermission('delete', input)) {
				app.crud[input.collection].d.run({
					user: socket.request.user,
					input: input,
					item: new app.models[input.collection](input.data)
				}).then(function (data) {
					fn(data.deleted);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});


		socket.on('data:schemas', function (input, fn) {
			var schemasAvailable = {};
			Object.keys(app.models).forEach(function (modelName) {
				if (
					app.models[modelName].schema/* &&
				 socket.request.user.crudPermission('read', {collection: modelName})*/
				) {
					schemasAvailable[modelName] = app.models[modelName].schema;
				}
			});
			fn(util.inspect(schemasAvailable, {depth: null}));
		});

		socket.on('data:breadcrumb', function (input, fn) {
			input.where = input.where || {};
			if (
				app.models[input.collection] &&
				app.models[input.collection].breadcrumb &&
				socket.request.user.crudPermission('read', input)
			) {
				app.models[input.collection].breadcrumb(input.where._id).then(function (items) {
					fn(items);
				}).catch(function (err) {
					console.error(err);
					fn({
						error: err
					});
				});
			}
		});
	});
};
