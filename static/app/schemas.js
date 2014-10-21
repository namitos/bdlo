'use strict';

define([
	'backbone',
	'util',
	'text!/admin/schemas/available'
], function (Backbone, util, availableSchemas) {
	availableSchemas = JSON.parse(availableSchemas);

	function load (cb) {
		var toLoad = {};
		for (var key in availableSchemas) {
			toLoad[key] = availableSchemas[key].hasOwnProperty('path') ? availableSchemas[key].path : '/core/schemas/' + key + '.js';
		}
		util.load(toLoad, cb);
	}

	function loadVocabularies(schemas, schemaName, cb) {
		var primitives = [];
		var toLoad = [];
		forEachPrimitives(schemas[schemaName], function(primitive){
			if(primitive.widget && primitive.widget == 'select' && primitive.schema && availableSchemas[primitive.schema]) {
				primitives.push(primitive);
				toLoad.push('text!/rest/' + primitive.schema + '?fields[' + schemas[primitive.schema].titleField + ']=true');
			}
		});
		util.load(toLoad, function(loaded){
			primitives.forEach(function(primitive, i){
				var data = JSON.parse(loaded[i]);
				var options = {};
				data.forEach(function(item){
					options[item._id] = item[schemas[primitive.schema].titleField];
				})
				primitive.options = options;
			});
			cb();
		});
	}

	function forEachPrimitives(schema, fn) {
		if (schema.type == 'object') {
			for (var key in schema.properties) {
				forEachPrimitives(schema.properties[key], fn);
			}
		} else if (schema.type == 'array') {
			forEachPrimitives(schema.properties[key].items, fn);
		} else {
			fn(schema);
		}
	}

	return {
		load: load,
		loadVocabularies: loadVocabularies,
		ListView: Backbone.View.extend({
			tagName: 'ul',
			className: 'nav',
			initialize: function (args) {
				_.merge(this, args);
				this.render();
			},
			render: function () {
				for (var key in this.schemas) {
					this.$el.append("<li><a href='#" + key + "'>" + this.schemas[key].name + "</a></li>");
				}
				this.$target.html(this.$el);
				return this;
			},
			events: {
				'click li a': function (e) {
					var $el = $(e.target).parent();
					$el.parent().find('.active').removeClass('active');
					$el.addClass('active');
				}
			},
			activateLink: function (name) {
				this.$el.find('a[href=#' + name + ']').parent().addClass('active');
			}
		})
	}
});