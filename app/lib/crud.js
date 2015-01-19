var mongodb = require('mongodb');
var _ = require('lodash');
var vow = require('vow');
var vowFs = require('vow-fs');


module.exports = function (app) {

	/**
	 *
	 * @param name {string}
	 * @param successCb {Function}
	 * @returns {boolean}
	 */
	function getSchemaOwnerField(name, successCb) {
		var schema = app.util.getSchema(name);
		if (schema) {
			if (schema.hasOwnProperty('info') && schema.info.hasOwnProperty('ownerField')) {
				successCb(schema.info.ownerField);
				return true;
			}
		}
		return false;
	}


	/**
	 * проверка на то, файл ли к нам пришёл в строке (она должна быть base64 файла, а если нет, то это не файл)
	 *
	 * @param str
	 * @returns {boolean}
	 */
	function isFile(str) {
		if (!str) {
			return false;
		}
		var a = str.substr(0, 5);
		if (a.indexOf('data:') != -1) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * возвращает промис на сохранение файлового поля (оно приходит как массив, ведь можно несколько файлов залить через один инпут)
	 *
	 * @param schemaPart часть схемы (схема конкретного поля)
	 * @param input само поле
	 * @returns {vow.Promise}
	 */
	function saveFilePromise(schemaPart, input) {
		var conf = app.get('conf');
		return new vow.Promise(function (resolve, reject, notify) {
			var promises = [];
			for (var i = 0; i < input.length; ++i) {
				if (isFile(input[i])) {
					var matches = input[i].split(';base64,');
					var data = matches[1];
					var mime = matches[0].replace('data:', '');
					if (_.contains(schemaPart.info.mimes, mime)) {
						var buf = new Buffer(data, 'base64');
						var fileName = require('crypto').createHash('sha512').update(data + (new Date()).valueOf()).digest("hex") + '.' + conf.fileUpload.mimes[mime];
						var fileDir = [
							conf.fileUpload.storages.filesystem[schemaPart.info.storage.access],
							schemaPart.info.storage.path
						].join('/');
						var filePath = [fileDir, fileName].join('/');
						var fileDirWrite = [conf.staticPath, fileDir].join('/');
						var filePathWrite = [fileDirWrite, fileName].join('/');
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
	}

	/**
	 * функция, которая готовит из объекта и его схемы массив из промисов на сохранение файлов, которые к нам пришли в base64 в соответствужщих схеме полях
	 *
	 * @param schema полная схема объекта
	 * @param obj весь объект
	 * @returns {Array} массив промисов
	 */
	function prepareFilesPromises(schema, obj) {
		var promises = [];
		for (var fieldName in schema.properties) {
			//console.log('fieldName', fieldName, 'type', schema.properties[fieldName].type);
			if (obj.hasOwnProperty(fieldName)) {
				if (//если просто файловое поле
				schema.properties[fieldName].type == 'any' &&
				schema.properties[fieldName].hasOwnProperty('info') &&
				schema.properties[fieldName].info.type == 'file'
				) {

					obj[fieldName] = _.compact(obj[fieldName]);
					promises.push(saveFilePromise(schema.properties[fieldName], obj[fieldName]));

				} else if (//если массив из простых файловых полей
				schema.properties[fieldName].type == 'array' &&
				schema.properties[fieldName].items.hasOwnProperty('info') &&
				schema.properties[fieldName].items.info.type == 'file'
				) {

					obj[fieldName].forEach(function (item, i) {
						item = _.compact(item);
						obj[fieldName][i] = item.length ? item : false
					});
					obj[fieldName] = _.compact(obj[fieldName]);
					obj[fieldName].forEach(function (item, i) {
						promises.push(saveFilePromise(schema.properties[fieldName].items, item));
					});

				} else if (//если файловое поле часть объекта
				schema.properties[fieldName].type == 'object'
				) {

					prepareFilesPromises(schema.properties[fieldName], obj[fieldName]).forEach(function (promise) {//рекурсия чтобы это файловое поле было как простое файловое поле
						promises.push(promise);
					});

				} else if (//если массив из объектов, в которых файловые поля
				schema.properties[fieldName].type == 'array'
				) {

					obj[fieldName] = _.compact(obj[fieldName]);
					obj[fieldName].forEach(function (item, i) {
						prepareFilesPromises(schema.properties[fieldName].items, item).forEach(function (promise) {//рекурсия чтобы каждое файловое поле было как часть объекта
							promises.push(promise);
						});
					});

				}
			}

		}
		return promises;
	}

	/**
	 * сохраняет файлы из obj в соответствии с его schema и выполняет callback
	 * @param schema полная схема объекта
	 * @param obj весь объект
	 * @param callback
	 */
	function prepareFiles(schema, obj, callback) {
		if (schema) {
			vow.allResolved(prepareFilesPromises(schema, obj)).then(function (result) {
				callback(result);
			});
		} else {
			callback([]);
		}
	}

	var Crud = function () {
	}

	require('util').inherits(Crud, require('events').EventEmitter);

	Crud.prototype.create = function (collectionName, data, user) {
		var crud = this;
		return new vow.Promise(function (resolve, reject) {
			var schema = app.util.getSchema(collectionName);
			if (schema) {
				if (data instanceof Array) {
					data.forEach(function (row, i) {
						data[i] = app.util.forceSchema(schema, data[i]);
					});
					data = _.compact(data);
				} else {
					data = app.util.forceSchema(schema, data);
				}
			}
			prepareFiles(schema, data, function (result) {
				if (
					user.permission(collectionName + ' all all') ||
					user.permission(collectionName + ' create all') ||
					user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function (ownerField) {
						data[ownerField] = user._id.toString()
					}) ||
					user.permission(collectionName + ' create his') && getSchemaOwnerField(collectionName, function (ownerField) {
						data[ownerField] = user._id.toString()
					})
				) {
					if (data.hasOwnProperty('_id')) {
						delete data._id;
					}
					app.db.collection(collectionName).insert(data, function (err, results) {
						if (err) {
							reject({
								error: err
							});
						} else {
							crud.emit('create', {
								collection: collectionName,
								id: results[0]._id
							})
							resolve(results[0]);
						}
					});
				} else {
					reject({
						error: 'not allowed'
					});
				}
			});
		});
	};

	Crud.prototype.read = function (collectionName, query, user) {
		var crud = this;
		return new vow.Promise(function (resolve, reject) {
			if (
				user.permission(collectionName + ' all all') ||
				user.permission(collectionName + ' read all') ||
				user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function (ownerField) {
					query[ownerField] = user._id.toString()
				}) ||
				user.permission(collectionName + ' read his') && getSchemaOwnerField(collectionName, function (ownerField) {
					query[ownerField] = user._id.toString()
				})
			) {
				if (query.hasOwnProperty('_id')) {
					if (query._id instanceof Object) {
						if (query._id.hasOwnProperty('$in')) {
							query._id.$in.forEach(function (item, i) {
								query._id.$in[i] = new mongodb.ObjectID(item.toString());
							});
						}
					} else {
						query._id = new mongodb.ObjectID(query._id.toString());
					}

				}
				var fields = [];
				if (query.hasOwnProperty('fields')) {
					fields = query.fields;
					delete query.fields;
				}
				var optionKeys = ['skip', 'limit', 'sort'];
				var options = {};
				optionKeys.forEach(function (key) {
					options[key] = query[key];
					delete query[key];
				});
				app.db.collection(collectionName).find(query, fields, options).toArray(function (err, result) {
					if (err) {
						reject({
							error: err
						});
					} else {
						crud.emit('read', {
							collection: collectionName
						});
						resolve(result);
					}
				});
			} else {
				reject({
					error: 'not allowed'
				});
			}
		});
	};

	Crud.prototype.update = function (collectionName, _id, data, user) {
		var crud = this;
		return new vow.Promise(function (resolve, reject) {
			var schema = app.util.getSchema(collectionName);
			if (schema) {
				data = app.util.forceSchema(schema, data);
			}
			prepareFiles(schema, data, function (result) {
				var where = {
					_id: new mongodb.ObjectID(_id)
				};
				if (
					user.permission(collectionName + ' all all') ||
					user.permission(collectionName + ' update all') ||
					user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function (ownerField) {
						where[ownerField] = user._id.toString()
					}) ||
					user.permission(collectionName + ' update his') && getSchemaOwnerField(collectionName, function (ownerField) {
						where[ownerField] = user._id.toString()
					})
				) {
					if (data.hasOwnProperty('_id')) {
						delete data._id;
					}
					app.db.collection(collectionName).update(where, {
						"$set": data
					}, function (err, results) {
						if (err) {
							reject({
								error: err
							});
						} else {
							data._id = _id;
							crud.emit('update', {
								collection: collectionName,
								id: where._id.toString()
							});
							resolve(data);
						}
					});
				} else {
					reject({
						error: 'not allowed'
					});
				}
			});
		});
	};

	Crud.prototype.delete = function (collectionName, _id, user) {
		var crud = this;
		return new vow.Promise(function (resolve, reject) {
			var where = {
				_id: new mongodb.ObjectID(_id)
			};
			if (
				user.permission(collectionName + ' all all') ||
				user.permission(collectionName + ' delete all') ||
				user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function (ownerField) {
					where[ownerField] = user._id.toString()
				}) ||
				user.permission(collectionName + ' delete his') && getSchemaOwnerField(collectionName, function (ownerField) {
					where[ownerField] = user._id.toString()
				})
			) {
				app.db.collection(collectionName).remove(where, function (err, numRemoved) {
					if (err) {
						reject({
							error: err
						});
					} else {
						crud.emit('delete', {
							collection: collectionName,
							id: where._id.toString()
						});
						resolve(numRemoved);
					}
				});
			} else {
				reject({
					error: 'not allowed'
				});
			}
		});
	}

	app.crud = new Crud();
};
