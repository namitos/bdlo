'use strict';

define([
	'backbone'
], function (Backbone) {


	function forEachPrimitives(schema, fn) {
		if (schema.type == 'object') {
			for (var key in schema.properties) {
				forEachPrimitives(schema.properties[key], fn);
			}
		} else if (schema.type == 'array') {
			forEachPrimitives(schema.items, fn);
		} else {
			fn(schema);
		}
	}

	function notify(data) {
		var $wrapper = $('#notifications');
		if (!$wrapper.length) {
			$('body').append("<div id='notifications'></div>");
			$wrapper = $('#notifications');
		}
		var $el = $("<div style='opacity:0' class='alert alert-" + data.tag + "'><button type='button' class='close' data-dismiss='alert'>×</button><strong>" + data.title + "</strong><p>" + data.body + "</p></div>");
		$wrapper.append($el);
		$el.css({
			opacity: 1
		});
		$el.on('click', '.close', function () {
			$el.remove();
		});
		if (data.hide) {
			setTimeout(function () {
				$el.remove();
			}, data.hide);
		}
	}

	function loadCollections(collections) {
		var promises = [];
		collections.forEach(function (collection) {
			promises.push(new Promise(function (resolve, reject) {
				collection.collection.fetch({
					data: collection.where,
					success: function () {
						resolve(collection.collection);
					}
				});
			}));
		});
		return Promise.all(promises);
	}

	function loadSchemas() {
		return new Promise(function (resolve, reject) {
			socket.emit('schemas', {}, function (result) {
				try {
					var data;
					eval('data = ' + result);
					resolve(data);
				} catch (e) {
					console.error(e);
					reject();
				}
			});
		});
	}

	function loadVocabularies(schemas, schemaName) {
		return new Promise(function (resolve, reject) {
			var primitiveFields = [];
			var toLoad = [];
			forEachPrimitives(schemas[schemaName], function (primitive) {
				if (primitive.widget && primitive.widget == 'select' && primitive.schema && schemas[primitive.schema]) {
					primitiveFields.push(primitive);
					var fields = {};
					fields[schemas[primitive.schema].titleField] = true;
					toLoad.push({
						collection: new primitives.ObjCollection([], {schemaName: primitive.schema}),
						where: {fields: fields}
					});
				}
			});
			loadCollections(toLoad).then(function () {
				primitiveFields.forEach(function (primitive, i) {
					var data = toLoad[i].collection.models;
					var options = {};
					data.forEach(function (item) {
						item = item.toJSON();
						options[item._id] = item[schemas[primitive.schema].titleField];
					})
					primitive.options = options;
				});
				resolve();
			});
		});

	}

	return {
		notify: notify,
		loadCollections: loadCollections,
		loadSchemas: loadSchemas,
		loadVocabularies: loadVocabularies
	}
});
