/**
 * @author Artem Tankayan <namit@yandex.ru>
 */

var mongodb = require('mongodb');
var _ = require('lodash');
var vow = require('vow');
var vowFs = require('vow-fs');

module.exports = function (app) {
	var conf = app.get('conf');

	/**
	 * Пытается достать схему, если не получается, то возвращает false
	 *
	 * @param name
	 * @returns {object|boolean}
	 */
	function getSchema(name) {
		var schemas = conf.editableSchemas;
		var schema = false;
		try {
			if (schemas.hasOwnProperty(name)) {
				if (schemas[name].hasOwnProperty('path')) {
					schema = require(conf.projectPath + schemas[name].path);
				} else {
					schema = require(app.get('corePath') + '/static/schemas/' + name);
				}
			}
		} catch (e) {
			console.log(e);
		}
		return schema;
	}

	/**
	 *
	 * @param name {string}
	 * @param successCb {Function}
	 * @returns {boolean}
	 */
	function getSchemaOwnerField(name, successCb) {
		var schema = getSchema(name);
		if (schema) {
			if (schema.hasOwnProperty('info') && schema.info.hasOwnProperty('ownerField')) {
				successCb(schema.info.ownerField);
				return true;
			}
		}
		return false;
	}

	/**
	 * рекурсивная функция, которая приводит аттрибуты объекта автоматически к нужному типу. на сей момент нужна только для поиска и приводит только к числу, чтобы искало и по чистам тоже
	 *
	 * @param obj
	 */
	function autoType(obj) {
		var digitValue;
		for (var key in obj) {
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
			if (
				schema.properties[fieldName].type == 'any' &&
				schema.properties[fieldName].hasOwnProperty('info') &&
				schema.properties[fieldName].info.type == 'file' &&
				obj.hasOwnProperty(fieldName)
				) {
				obj[fieldName] = _.compact(obj[fieldName]);
				promises.push(saveFilePromise(schema.properties[fieldName], obj[fieldName]));
			} else if (
				schema.properties[fieldName].type == 'object' &&
				obj.hasOwnProperty(fieldName)
			) {
				prepareFilesPromises(schema.properties[fieldName], obj[fieldName]).forEach(function (promise) {
					promises.push(promise);
				});
			} else if (
				schema.properties[fieldName].type == 'array' && 
				obj.hasOwnProperty(fieldName)
			) {
				obj[fieldName] = _.compact(obj[fieldName]);
				obj[fieldName].forEach(function(item, i){
					prepareFilesPromises(schema.properties[fieldName].items, item).forEach(function (promise) {
						promises.push(promise);
					});
				});
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

	/**
	 * middleware для сохранения файлов
	 *
	 * @param req
	 * @param res
	 * @param next
	 */
	function prepareFilesMiddleware(req, res, next) {
		prepareFiles(getSchema(req.params.collection), req.body, function (result) {
			//console.log('prepare files', JSON.stringify(result, ' ', 4));
			next();
		});
	}



	app.get('/rest/:collection', function (req, res) {
		var collectionName = req.params.collection;
		if(
			req.user.permission(collectionName + ' all all') ||
			req.user.permission(collectionName + ' read all') ||
			req.user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function(ownerField){ req.query[ownerField] = req.user._id.toString() }) ||
			req.user.permission(collectionName + ' read his') && getSchemaOwnerField(collectionName, function(ownerField){ req.query[ownerField] = req.user._id.toString() })
		){
			var db = app.get('db');
			if (req.query.hasOwnProperty('_id')) {
				req.query._id = new mongodb.ObjectID(req.query._id.toString());
			}
			var fields = [];
			if (req.query.hasOwnProperty('fields')) {
				fields = req.query.fields;
				delete req.query.fields;
			}
			var optionKeys = ['skip', 'limit', 'sort'];
			var options = {};
			optionKeys.forEach(function (key) {
				options[key] = req.query[key];
				delete req.query[key];
			});
			autoType(req.query);
			db.collection(req.params.collection).find(req.query, fields, options).toArray(function (err, result) {
				res.send(result);
			});
		} else {
			res.status(403).send({
				error: 'not allowed'
			});
		}
	});

	app.delete('/rest/:collection/:id', function (req, res) {
		var collectionName = req.params.collection;
		var where = {
			_id: new mongodb.ObjectID(req.params.id)
		};
		if(
			req.user.permission(collectionName + ' all all') ||
			req.user.permission(collectionName + ' delete all') ||
			req.user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function(ownerField){ where[ownerField] = req.user._id.toString() }) ||
			req.user.permission(collectionName + ' delete his') && getSchemaOwnerField(collectionName, function(ownerField){ where[ownerField] = req.user._id.toString() })
		){
			var db = app.get('db');
			db.collection(collectionName).remove(where, function (err, numRemoved) {
				if (err) {
					res.status(500).send();
				} else {
					res.status(200).send({ "_id": req.params.id });
				}
			});
		} else {
			res.status(403).send({
				error: 'not allowed'
			});
		}
	});

	app.put('/rest/:collection/:id', prepareFilesMiddleware, function (req, res) {
		var collectionName = req.params.collection;
		var where= {
			_id: new mongodb.ObjectID(req.params.id)
		};
		if(
			req.user.permission(collectionName + ' all all') ||
			req.user.permission(collectionName + ' update all') ||
			req.user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function(ownerField){ where[ownerField] = req.user._id.toString() }) ||
			req.user.permission(collectionName + ' update his') && getSchemaOwnerField(collectionName, function(ownerField){ where[ownerField] = req.user._id.toString() })
		){
			var db = app.get('db');
			if (req.body.hasOwnProperty('_id')) {
				delete req.body._id;
			}
			db.collection(req.params.collection).update(where, {
				"$set": req.body
			}, function (error, results) {
				if (error) {
					res.status(500).send();
				} else {
					req.body._id = req.params.id;
					res.status(200).send(req.body);
				}
			});
		} else {
			res.status(403).send({
				error: 'not allowed'
			});
		}
	});

	app.post('/rest/:collection', prepareFilesMiddleware, function (req, res) {
		var collectionName = req.params.collection;
		if(
			req.user.permission(collectionName + ' all all') ||
			req.user.permission(collectionName + ' create all') ||
			req.user.permission(collectionName + ' all his') && getSchemaOwnerField(collectionName, function(ownerField){ req.body[ownerField] = req.user._id.toString() }) ||
			req.user.permission(collectionName + ' create his') && getSchemaOwnerField(collectionName, function(ownerField){ req.body[ownerField] = req.user._id.toString() })
		){
			var db = app.get('db');
			if (req.body.hasOwnProperty('_id')) {
				delete req.body._id;
			}
			db.collection(req.params.collection).insert(req.body, function (err, results) {
				if (err) {
					res.status(500).send();
				} else {
					res.status(200).send(results[0]);
				}
			});
		} else {
			res.status(403).send({
				error: 'not allowed'
			});
		}
	});

};
