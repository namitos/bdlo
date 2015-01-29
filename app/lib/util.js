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


util.prepareId = function (id) {//todo сделать проверку на длину строк, чтоб она совпадала с той, которая нужна для ObjectID и поместить в util
	var newId;
	if (id instanceof Object) {
		if (id.hasOwnProperty('$in')) {
			newId = {
				$in: []
			};
			id.$in.forEach(function (item, i) {
				newId.$in.push(new mongodb.ObjectID(item.toString()));
			});
		}
	} else {
		newId = new mongodb.ObjectID(id.toString());
	}
	return newId;
};

module.exports = util;