'use strict';

define([
	'backbone',
	'fc',
	'util',
	'schemas',
	'ckeditor',
	'ace'
], function (Backbone, fc, util, schemas, CKEDITOR, ace) {
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
		className: 'view-list',
		fetch: function (data) {
			if (!data) {
				data = {};
			}
			var fields = {};
			fields[this.schema.titleField] = true;
			this.collection.fetch({
				data: _.merge(data, {
					fields: fields
				})
			});
		},
		initialize: function (args) {
			_.merge(this, args);
			var view = this;
			view.collection = new ObjCollection({
				schemaName: view.schemaName
			});
			view.listenTo(view.collection, 'sync', this.render);
			schemas.load(function (loadedSchemas) {
				schemas.loadVocabularies(loadedSchemas, view.schemaName, function () {
					view.schemas = loadedSchemas;
					view.schema = loadedSchemas[view.schemaName];
					view.fetch();
				});

			});
		},
		render: function () {
			var view = this;
			var items = view.collection.toJSON();

			if (!view.initialRender) {
				view.$el.html("<div class='filter'><a class='toggle'><span class='glyphicon glyphicon-filter'></span> Filter</a><div class='content' hidden></div></div><ul class='nav'></ul>");

				var filterSchema = _.cloneDeep(view.schema);
				for (var key in filterSchema.properties) {
					if (!filterSchema.properties[key].hasOwnProperty('filterable')) {
						delete filterSchema.properties[key];
					}
				}
				view.filterSchema = filterSchema;

				if (_.size(view.filterSchema.properties)) {
					view.$el.find('.filter .content').html(fc(view.filterSchema, {}));
				} else {
					view.$el.find('.filter').html("<div class='alert'><span class='glyphicon glyphicon-filter'></span> No filter</div>");
				}
				view.initialRender = true;
			}

			var $nav = view.$el.find('.nav');

			items.sort(function (a, b) {
				if (a[view.schema.titleField] > b[view.schema.titleField]) return 1;
				if (a[view.schema.titleField] < b[view.schema.titleField]) return -1;
				return 0;
			});

			if (items.length) {
				$nav.html('');
				items.forEach(function (row) {
					var $el = $("<li><a href='#" + view.schemaName + "/" + row._id + "'>" + row[view.schema.titleField] + "</a></li>");
					if (view.activeId == row._id) {
						$el.addClass('active');
					}
					$nav.append($el);
				});
			} else {
				$nav.html("<div class='alert'>No documents</div>");
			}
			view.$target.html(view.$el);

			view.delegateEvents();
			//костыль потому что бекбон не поддерживает нестандартные события
			view.$el.find('.filter .object-root').on('changeObj', function (e) {
				var data = e.originalEvent.detail;
				for (var key in data) {
					if (!data[key]) {
						delete data[key];
					}
				}
				view.fetch(data);
			});
			return view;
		},
		events: {
			'click li a': function (e) {
				var $el = $(e.currentTarget).parent();
				$el.parent().find('.active').removeClass('active');
				$el.addClass('active');
			},
			'click .toggle': function (e) {
				$(e.currentTarget).next().toggle();
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
			var view = this;
			schemas.load(function (loadedSchemas) {
				view.schemas = loadedSchemas;
				schemas.loadVocabularies(view.schemas, view.schemaName, function () {
					view.getObj(view.activeId, function (obj) {
						view.model = obj;
						if (view.model) {
							view.$target.html(view.$el);
							view.render();
							view.listenTo(view.model, 'sync', view.render);
						} else {
							view.$el.html("<div class='alert alert-danger'>Object is not exists</div>");
						}
					});
				});
			});
		},
		render: function () {
			var view = this;
			var $fields = $(fc(view.schemas[view.schemaName], view.model.attributes));

			//adding wysiwyg
			$fields.find('.widget-wysiwyg').each(function () {
				CKEDITOR.replace(this, {
					allowedContent: true
				});
			});
			var instance;
			for (var i in CKEDITOR.instances) {
				instance = CKEDITOR.instances[i];
				instance.el = $fields.find('[name=' + instance.name + ']')[0];
				instance.on('change', function () {
					this.updateElement();
					this.el.changeField();
				});
			}

			//code input
			$fields.find('.widget-code').each(function () {
				var $textarea = $(this);
				var $wrapper = $("<div class='form-control-code' id='code-" + this.name + "'>");
				$textarea.hide().after($wrapper);
				var editor = ace.edit($wrapper[0]);
				editor.getSession().setValue($textarea.val());
				editor.getSession().on('change', function () {
					$textarea.val(editor.getSession().getValue())[0].changeField();
				});
				if ($textarea.attr('language')) {
					editor.getSession().setMode("ace/mode/" + $textarea.attr('language'));
				}

				//editor.setTheme("ace/theme/monokai");
			});

			var $btns = $("<div class='btn-group'><button type='submit' class='btn btn-primary save'><span class='glyphicon glyphicon-save'></span><span class='text'>Save</span></button></div>");
			if (view.model.id) {
				$btns.append("<button type='button' class='btn btn-danger delete'><span class='glyphicon glyphicon-remove'></span><span class='text'>Delete</span></button>");
			}
			var $form = $("<form></form>");
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

	return {
		ObjModel: ObjModel,
		ObjCollection: ObjCollection,
		ListView: ListView,
		FormView: FormView
	};
});