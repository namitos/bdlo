var _ = require('lodash');
var mongodb = require('mongodb');

function forceSchema(schema, obj) {
	console.log('util.forceSchema deprecated!');

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
		objNew = !_.includes([false, 0, '', '0', 'false', undefined, null], obj);
	} else if (schema.type == 'any') {
		objNew = obj;
	}
	return objNew;
}

function prepareId(id) {
	console.log('util.prepareId deprecated!');

	var newId;
	try {
		if (id instanceof Array) {
			newId = [];
			id.forEach(function (item, i) {
				newId.push(prepareId(item));
			});
		} else if (id instanceof Object && id.hasOwnProperty('$in')) {
			newId = {
				$in: prepareId(id.$in)
			};
		} else {
			newId = new mongodb.ObjectID(id.toString());
		}
	} catch (err) {
		console.error(id, err);
	}
	return newId;
}

function passwordHash(password) {
	console.log('util.passwordHash deprecated!');

	return require('crypto').createHash('sha512').update(password).digest("hex");
}

module.exports = {
	forceSchema: forceSchema,
	prepareId: prepareId,
	passwordHash: passwordHash
};
