'use strict';

define([
	'backbone',
	'util',
	'models/primitives'
], function (Backbone, util, primitives) {
	return {
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