var _ = require('lodash');
var mongodb = require('mongodb');

var util = {};

function forceSchema(schema, obj) {
	var objNew;
	if (schema.type == 'array') {
		objNew = [];
		if (obj instanceof Array) {
			_.compact(obj).forEach(function (val, key) {
				objNew[key] = forceSchema(schema.items, val);
			});
		} else {
			objNew = null;
		}
	} else if (schema.type == 'object') {
		objNew = {};
		if (obj instanceof Object) {
			_.forEach(schema.properties, function (schemaPart, key) {
				if (obj.hasOwnProperty(key)) {
					objNew[key] = forceSchema(schemaPart, obj[key]);
				}
			});
		} else {
			objNew = null;
		}
	} else if (schema.type == 'integer') {
		objNew = parseInt(obj);
		if (isNaN(objNew)) {
			objNew = 0;
		}
	} else if (schema.type == 'number') {
		objNew = parseFloat(obj);
		if (isNaN(objNew)) {
			objNew = 0;
		}
	} else if (schema.type == 'string') {
		objNew = obj ? obj.toString() : '';
	} else if (schema.type == 'boolean') {
		objNew = !_.contains([false, 0, '', '0', 'false', undefined, null], obj);
	} else if (schema.type == 'any') {
		objNew = obj;
	}
	return objNew;
}

util.forceSchema = forceSchema;

function prepareId(id) {
	var newId;
	if (typeof id == 'string') {
		if (id.length == 24) {
			newId = new mongodb.ObjectID(id);
		} else {
			console.log('prepareId error: string length is not 24'.red, id);
		}
	} else if (id instanceof mongodb.ObjectID) {
		return id;
	} else if (id instanceof Object && id.hasOwnProperty('$in')) {
		newId = {
			$in: []
		};
		id.$in.forEach(function (item, i) {
			newId.$in.push(prepareId(item));
		});
	} else {
		console.log('prepareId error'.red, id);
	}
	return newId;
};

util.prepareId = prepareId;

util.passwordHash = function (password) {
	return require('crypto').createHash('sha512').update(password).digest("hex");
}

module.exports = util;
