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
		}
	};


};