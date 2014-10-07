'use strict';

define([
	'backbone',
	'text!/admin/schemas/available'
], function (Backbone, availableSchemas) {
	availableSchemas = JSON.parse(availableSchemas);

	return {
		load: function (cb) {
			var toLoad = [];
			for (var key in availableSchemas) {
				toLoad.push(availableSchemas[key].hasOwnProperty('path') ? availableSchemas[key].path : '/core/schemas/' + key + '.js');
			}
			require(toLoad, function () {
				var i = 0;
				var schemas = {};
				for (var key in availableSchemas) {
					schemas[key] = arguments[i];
					++i;
				}
				cb(schemas);
			});
		},
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