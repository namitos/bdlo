'use strict'

define(['backbone'], function (Backbone) {
	var ObjModel = Backbone.Model.extend({
		idAttribute: '_id'
	});

	var ObjCollection = Backbone.Collection.extend({
		model: ObjModel,
		initialize: function (models, args) {
			if (!args) {//stupid crunch
				_.merge(this, models);
			} else {
				_.merge(this, args);
			}
		},
		url: function () {
			return '/rest/' + this.schemaName;
		},
		toJSONTree: function () {
			var data = this.toJSON();
			data.forEach(function (el, i) {
				if (el.hasOwnProperty('parent') && el.parent != '') {
					try {
						var parent = _.find(data, {
							_id: el.parent
						});
						if (parent) {
							if (!parent.hasOwnProperty('children')) {
								parent.children = [];
							}
							parent.children.push(el);
							delete data[i];
						}
					} catch (e) {
					}
				}
			});
			return _.compact(data);
		}
	});

	return {
		ObjModel: ObjModel,
		ObjCollection: ObjCollection
	}
});