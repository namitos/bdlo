var _ = require('lodash');
var vow = require('vow');
var vowFs = require('vow-fs');
var inherits = require('util').inherits;

var Middleware = require('../models/middleware');
var util = require('./util');


var Crud = function (db, conf) {
	var crud = this;
	crud.db = db;
	crud.conf = conf;

	crud.callbacks = {};
	crud.permissions = {};

	function changeInput(op, input, ownerField, user) {
		if (op == 'create' || op == 'update') {
			input.data[ownerField] = user._id.toString();
		}
		if (op == 'read' || op == 'update' || op == 'delete') {
			input.where[ownerField] = user._id.toString();
		}
	}

	for (var schemaName in crud.conf.schemas) {
		crud.callbacks[schemaName] = function (op, result) {
			this.emit(schemaName + ':' + op, result);
		};

		crud.permissions[schemaName] = (function (collectionName) {
			return function (op, input, user) {
				return new vow.Promise(function (resolve, reject) {
					if (user.permission(collectionName + ' all all') ||
						user.permission(collectionName + ' ' + op + ' all') ||
						user.permission(collectionName + ' all his') && crud._getSchemaOwnerField(collectionName, function (ownerField) {
							changeInput(op, input, ownerField, user);
						}) ||
						user.permission(collectionName + ' ' + op + ' his') && crud._getSchemaOwnerField(collectionName, function (ownerField) {
							changeInput(op, input, ownerField, user);
						})) {
						resolve();
					} else {
						reject();
					}
				});
			}
		})(schemaName);
	}

	crud.middleware = new Middleware();
};

inherits(Crud, require('events').EventEmitter);


/**
 *
 * @param name {string}
 * @param successFn {Function}
 * @returns {boolean}
 */
Crud.prototype._getSchemaOwnerField = function (name, successFn) {
	var schema = this.conf.schemas[name];
	if (schema.hasOwnProperty('ownerField')) {
		successFn(schema.ownerField);
		return true;
	}
	return false;
};

/**
 * проверка на то, файл ли к нам пришёл в строке (она должна быть base64 файла, а если нет, то это не файл)
 *
 * @param str
 * @returns {boolean}
 */
Crud.prototype._isFile = function (str) {
	if (!str) {
		return false;
	}
	var a = str.substr(0, 5);
	return a.indexOf('data:') != -1;
};

/**
 * возвращает промис на сохранение файлового поля (оно приходит как массив, ведь можно несколько файлов залить через один инпут)
 *
 * @param schemaPart часть схемы (схема конкретного поля)
 * @param input само поле
 * @returns {vow.Promise}
 */
Crud.prototype._saveFilePromise = function (schemaPart, input) {
	var crud = this;
	return new vow.Promise(function (resolve, reject, notify) {
		var promises = [];
		for (var i = 0; i < input.length; ++i) {
			if (crud._isFile(input[i])) {
				var matches = input[i].split(';base64,');
				var data = matches[1];
				var mime = matches[0].replace('data:', '');
				var storage = crud.conf.fileUpload.storages[schemaPart.storage];

				if (_.contains(storage.mimes, mime)) {
					var buf = new Buffer(data, 'base64');
					var fileName = util.passwordHash(data) + '.' + crud.conf.fileUpload.mimes[mime];

					var filePath = [storage.path, fileName].join('/');
					var filePathWrite = [crud.conf.staticPath, storage.path, fileName].join('/');
					promises.push(vowFs.write(filePathWrite, buf));
					input[i] = filePath;
				} else {
					input[i] = null;
					var promise = new vow.Promise(function (resolve, reject, notify) {
						reject('mime type incorrect');
					});
					promises.push(promise);
				}
			} else {
				var promise = new vow.Promise(function (resolve, reject, notify) {
					resolve('not changed(sended url of file) or not base64 of file');
				});
				promises.push(promise);
			}
		}
		vow.allResolved(promises).then(function (result) {
			resolve(result);
		});
	});
};

/**
 * функция, которая готовит из объекта и его схемы массив из промисов на сохранение файлов, которые к нам пришли в base64 в соответствущих схеме полях
 *
 * @param schema полная схема объекта
 * @param obj весь объект
 * @returns {Array} массив промисов
 */

Crud.prototype._prepareFilesPromises = function (schema, obj) {
	var crud = this;
	var promises = [];
	for (var fieldName in schema.properties) {
		if (obj.hasOwnProperty(fieldName)) {
			if (//если просто файловое поле
			schema.properties[fieldName].widget == 'base64File'
			) {

				obj[fieldName] = _.compact(obj[fieldName]);
				promises.push(crud._saveFilePromise(schema.properties[fieldName], obj[fieldName]));

			} else if (//если массив из простых файловых полей
			schema.properties[fieldName].type == 'array' &&
			schema.properties[fieldName].items.widget == 'base64File'
			) {

				obj[fieldName].forEach(function (item, i) {
					item = _.compact(item);
					obj[fieldName][i] = item.length ? item : false
				});
				obj[fieldName] = _.compact(obj[fieldName]);
				obj[fieldName].forEach(function (item, i) {
					promises.push(crud._saveFilePromise(schema.properties[fieldName].items, item));
				});

			} else if (//если файловое поле часть объекта
			schema.properties[fieldName].type == 'object'
			) {

				crud._prepareFilesPromises(schema.properties[fieldName], obj[fieldName]).forEach(function (promise) {//рекурсия чтобы это файловое поле было как простое файловое поле
					promises.push(promise);
				});

			} else if (//если массив из объектов, в которых файловые поля
			schema.properties[fieldName].type == 'array'
			) {

				obj[fieldName] = _.compact(obj[fieldName]);
				obj[fieldName].forEach(function (item, i) {
					crud._prepareFilesPromises(schema.properties[fieldName].items, item).forEach(function (promise) {//рекурсия чтобы каждое файловое поле было как часть объекта
						promises.push(promise);
					});
				});

			}
		}
	}
	return promises;
};

/**
 * сохраняет файлы из obj в соответствии с его schema и выполняет callback
 * @param schema полная схема объекта
 * @param obj весь объект
 */
Crud.prototype._prepareFiles = function (schema, obj) {
	return vow.allResolved(this._prepareFilesPromises(schema, obj));
};


Crud.prototype.create = function (collectionName, data, user) {
	var crud = this;
	return new vow.Promise(function (resolve, reject) {
		if (crud.conf.schemas[collectionName]) {
			crud.permissions[collectionName]('create', {data: data}, user).then(function () {
				var schema = crud.conf.schemas[collectionName];
				if (data instanceof Array) {
					data.forEach(function (row, i) {
						data[i] = util.forceSchema(schema, data[i]);
					});
					data = _.compact(data);
				} else {
					data = util.forceSchema(schema, data);
				}
				crud._prepareFiles(schema, data).then(function (result) {
					if (data.hasOwnProperty('_id')) {
						delete data._id;
					}
					crud.db.collection(collectionName).insert(data, function (err, result) {
						if (err) {
							reject(err);
						} else {
							crud.callbacks[collectionName].call(crud, 'create', result[0]);
							resolve(result[0]);
						}
					});
				});
			}, function () {
				reject('not allowed');
			});
		} else {
			reject('schema not exists');
		}

	});
};

Crud.prototype.read = function (collectionName, where, user) {
	var crud = this;
	return new vow.Promise(function (resolve, reject) {
		if (crud.conf.schemas[collectionName]) {
			crud.permissions[collectionName]('read', {where: where}, user).then(function () {
				if (where.hasOwnProperty('_id')) {
					where._id = util.prepareId(where._id);
				}
				var fields = [];
				if (where.hasOwnProperty('fields')) {
					fields = where.fields;
					delete where.fields;
				}
				var connections;
				if (where.hasOwnProperty('connections') && where.connections instanceof Object) {
					connections = where.connections;
					delete where.connections;
				}
				var optionKeys = ['skip', 'limit', 'sort'];
				var options = {};
				optionKeys.forEach(function (key) {
					options[key] = where[key];
					delete where[key];
				});
				crud.db.collection(collectionName).find(where, fields, options).toArray(function (err, result) {
					if (err) {
						reject(err);
					} else {
						if (connections) {
							var promises = {};
							_.forOwn(connections, function (connection, connectionName) {
								var where = {};
								where[connection[1]] = {
									$in: _.pluck(result, connection[0])
								};
								if (connection[1] == '_id') {
									util.prepareId(where[connection[1]]);
								} else {
									where[connection[1]].$in.forEach(function (id, i) {
										where[connection[1]].$in[i] = id.toString();
									});
								}
								promises[connectionName] = crud.read(connectionName, where, user);
							});
							vow.all(promises).then(function (connectionsResult) {
								var groups = {};
								_.forOwn(connections, function (connection, connectionName) {
									groups[connectionName] = _.groupBy(connectionsResult[connectionName], connection[1]);
								});
								result.forEach(function (item) {
									item.connections = {};
									_.forOwn(connections, function (connection, connectionName) {
										var group = groups[connectionName];
										item.connections[connectionName] = group.hasOwnProperty(item[connection[0]]) ? group[item[connection[0]]] : [];
									});
								});
								crud.callbacks[collectionName].call(crud, 'read', result);
								resolve(result);
							}, function (err) {
								reject(err);
							});
						} else {
							crud.callbacks[collectionName].call(crud, 'read', result);
							resolve(result);
						}
					}
				});
			}, function () {
				reject('not allowed');
			});
		} else {
			reject('schema not exists');
		}
	});
};

Crud.prototype.update = function (collectionName, _id, data, user) {
	var crud = this;
	return new vow.Promise(function (resolve, reject) {
		if (crud.conf.schemas[collectionName]) {
			var where = {
				_id: _id
			};
			crud.permissions[collectionName]('update', {where: where, data: data}, user).then(function () {
				where._id = util.prepareId(where._id);

				var schema = crud.conf.schemas[collectionName];
				data = util.forceSchema(schema, data);
				crud._prepareFiles(schema, data).then(function (result) {
					if (data.hasOwnProperty('_id')) {
						delete data._id;
					}
					crud.db.collection(collectionName).update(where, data, function (err, results) {
						if (err) {
							reject(err);
						} else {
							data._id = _id.toString();
							crud.callbacks[collectionName].call(crud, 'update', data);
							resolve(data);
						}
					});
				});
			}, function () {
				reject('not allowed');
			});
		} else {
			reject('schema not exists');
		}
	});
};

Crud.prototype.delete = function (collectionName, _id, user) {
	var crud = this;
	return new vow.Promise(function (resolve, reject) {
		if (crud.conf.schemas[collectionName]) {
			var where = {
				_id: util.prepareId(_id)
			};
			crud.permissions[collectionName]('delete', {where: where}, user).then(function () {
				crud.db.collection(collectionName).remove(where, function (err, numRemoved) {
					if (err) {
						reject(err);
					} else {
						crud.callbacks[collectionName].call(crud, 'delete', where._id.toString());
						resolve(numRemoved);
					}
				});
			}, function () {
				reject('not allowed');
			});
		} else {
			reject('schema not exists');
		}

	});
};

module.exports = Crud;
