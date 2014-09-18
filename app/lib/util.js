var _ = require('lodash');

module.exports = function (app) {
	app.util = {
		/**
		 * Пытается достать схему, если не получается, то возвращает false
		 *
		 * @param name
		 * @returns {object|boolean}
		 */
		getSchema: function (name) {
			var conf = app.get('conf');
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
		},
		forceSchema: function (schema, obj) {
			var objNew;
			if (schema.type == 'array') {
				objNew = [];
				if (obj instanceof Array) {
					obj.forEach(function (val, key) {
						objNew[key] = app.util.forceSchema(schema.items, val);
					});
				} else {
					objNew = null;
				}
			} else if (schema.type == 'object') {
				objNew = {};
				if (obj instanceof Object) {
					_.forEach(schema.properties, function (schemaPart, key) {
						if (obj.hasOwnProperty(key)) {
							objNew[key] = app.util.forceSchema(schemaPart, obj[key]);
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
				objNew = obj.toString();
			} else if (schema.type == 'boolean') {
				objNew = _.contains([false, 0, '', '0', 'false'], obj) ? false : true;
			} else if (schema.type == 'any') {
				objNew = obj;
			}
			return objNew;
		}
	};


};
