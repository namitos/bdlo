'use strict';

define([
	'backbone',
	'fc',
	'util'
	/*'ckeditor',
	 'ace',
	 'jquery',*/
	//'jqueryui'
	//'twbs'
], function (Backbone, fc, util/*, ckeditor, ace, $*/) {

	var ObjModel = Backbone.Model.extend({
		idAttribute: '_id'
	});

	var ObjCollection = Backbone.Collection.extend({
		model: ObjModel,
		initialize: function (args) {
			_.merge(this, args);
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

	var ListView = Backbone.View.extend({
		tagName: 'ul',
		className: 'nav',
		initialize: function (args) {
			_.merge(this, args);
			this.menuCollection = new ObjCollection({
				schemaName: this.schemaName
			});
			this.listenTo(this.menuCollection, 'sync', this.render);

			var fields = {};
			fields[this.schema.info.titleField] = true;
			this.menuCollection.fetch({
				data: {
					fields: fields
				}
			});
		},
		render: function () {
			var view = this;
			var items = view.menuCollection.toJSON();
			if (items.length) {
				items.forEach(function (row) {
					var $el = $("<li><a href='#" + view.schemaName + "/" + row._id + "'>" + row[view.schema.info.titleField] + "</a></li>");
					if (view.activeId == row._id) {
						$el.addClass('active');
					}
					view.$el.append($el);
				});
			} else {
				view.$el = $("<div class='alert'>No documents</div>");
			}
			view.$target.html(view.$el);
			return view;
		},
		events: {
			'click li a': function (e) {
				var $el = $(e.target).parent();
				$el.parent().find('.active').removeClass('active');
				$el.addClass('active');
			}
		}
	});

	var FormView = Backbone.View.extend({
		getObj: function (id, cb) {
			var collection = new ObjCollection({
				schemaName: this.schemaName
			});
			if (id == 'new') {
				cb(collection.add(new ObjModel()));
			} else {
				collection.fetch({
					data: {
						_id: id
					},
					complete: function () {
						cb(collection.get(id));
					}
				});
			}
		},
		initialize: function (args) {
			_.merge(this, args);
			//this.render();
			var view = this;
			this.getObj(this.activeId, function (obj) {
				view.model = obj;
				if (view.model) {
					view.$target.html(view.$el);
					view.render();
					view.listenTo(view.model, 'sync', view.render);
				} else {
					view.$el.html("<div class='alert alert-danger'>Object is not exists</div>");
				}
			});
		},
		render: function () {
			var view = this;
			var $form = $("<form></form>");
			var $fields = $(fc(view.schemas[view.schemaName], view.model.attributes));
			var $btns = $("<div class='btn-group'><button type='submit' class='btn btn-primary save'><span class='glyphicon glyphicon-save'></span><span class='text'>Save</span></button></div>");
			if (view.model.id) {
				$btns.append("<button type='button' class='btn btn-danger delete'><span class='glyphicon glyphicon-remove'></span><span class='text'>Delete</span></button>");
			}
			$form.append($fields);
			$form.append($btns);
			view.$el.html($form);
			return view;
		},
		events: {
			'submit form': function (e) {
				util.notify({
					tag: 'info',
					title: 'Editor',
					body: 'Material is saving',
					hide: 4000
				});
				this.model.save({}, {
					success: function () {
						util.notify({
							tag: 'success',
							title: 'Editor',
							body: 'Material is saved',
							hide: 4000
						});
					}
				});
				return false;
			},
			'click .delete': function (e) {
				if (confirm('Are you sure?')) {
					this.$el.remove();
					this.model.destroy();
				}
			}
		}
	});

	return  {
		ObjModel: ObjModel,
		ObjCollection: ObjCollection,
		ListView: ListView,
		FormView: FormView
	};
});