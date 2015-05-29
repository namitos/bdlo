var _ = require('lodash');
var mongodb = require('mongodb');

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

function prepareId(id) {
	var newId;
	if (typeof id == 'string') {
		if (id.length == 24) {
			newId = new mongodb.ObjectID(id);
		} else {
			console.error('prepareId error: string length is not 24', id);
		}
	} else if (id instanceof mongodb.ObjectID) {
		newId = id;
	} else if (id instanceof Array) {
		newId = [];
		id.forEach(function (item, i) {
			newId.push(prepareId(item));
		});
	} else if (id instanceof Object && id.hasOwnProperty('$in')) {
		newId = {
			$in: prepareId(id)
		};
	} else {
		console.error('prepareId error', id);
	}
	return newId;
}

function passwordHash(password) {
	return require('crypto').createHash('sha512').update(password).digest("hex");
}

module.exports = {
	forceSchema: forceSchema,
	prepareId: prepareId,
	passwordHash: passwordHash
};
