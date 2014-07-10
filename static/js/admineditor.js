(function (context, $) {
	var toLoad = {};
	for (var key in schemas) {
		toLoad[key] = schemas[key].hasOwnProperty('path') ? schemas[key].path : '/core/schemas/' + key + '.js';
	}

	function resizeList($list) {
		if ($(window).width() > 767) {
			if ($(window).width() > 992) {
				$list.height($(window).height() - 150);
			} else {
				$list.height($(window).height() - 200);
			}
		} else {
			$list.height(141);
		}
	}

	load(toLoad, function (result) {
		for (var key in schemas) {
			schemas[key].schema = result[key];
		}

		var schemasMenuHtml = "<ul class='nav nav-tabs'>";
		for (var key in schemas) {
			schemasMenuHtml += "<li><a href='#s/" + key + "/new'>" + schemas[key].name + "</a></li>";
		}
		schemasMenuHtml += "</ul>";
		var $listSchemas = $('.list-schemas');
		$listSchemas.html(schemasMenuHtml);
		$listSchemas.on('click', 'li', function () {
			$('li', $listSchemas).removeClass('active');
			$(this).addClass('active');
		});


		var ObjModel = Backbone.Model.extend({
			idAttribute: '_id'
		});
		var ObjCollectionList = Backbone.View.extend({
			className: "collection-list",
			fetchCollection: function () {
				var fieldsToFetch = {};
				fieldsToFetch[schemas[this.options.schemaName].schema.info.titleField] = true;
				if (this.options.schemaName == 'pages') {
					fieldsToFetch['parent'] = true;
				}
				this.collection.fetch({
					data: {
						fields: fieldsToFetch
					}
				});
			},
			initialize: function (input) {
				this.options = input.options;
				var _this = this;
				var ObjCollection = Backbone.Collection.extend({
					model: ObjModel,
					url: function () {
						return '/rest/' + _this.options.schemaName;
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
				this.collection = new ObjCollection();
				this.collectionFullObj = new ObjCollection();

				this.collection.bind('sync', this.render, this);
				this.collection.bind('destroy', this.render, this);
				this.collectionFullObj.bind('sync', this.fetchCollection, this);
				this.collectionFullObj.bind('destroy', this.fetchCollection, this);
			},
			render: function () {
				var schemaName = this.options.schemaName;

				function list(elements) {
					var listHtml = "<ul class='list-group'>";
					elements.forEach(function (obj) {
						if (obj.hasOwnProperty('_id')) {
							listHtml += "<li class='list-group-item'><a href='#s/" + schemaName + "/" + obj._id + "'>" + obj[schemas[schemaName].schema.info.titleField] + "</a>" + (obj.hasOwnProperty('children') ? list(obj.children) : '') + "</li>";
						}
					});
					listHtml += "</ul>";
					return listHtml;
				}

				if (schemaName == 'pages') {
					var listHtml = list(this.collection.toJSONTree());
				} else {
					var listHtml = list(this.collection.toJSON());
				}

				if (this.collection.length > 0) {
					this.$el.html(listHtml);
					resizeList($('.collection-list .wrapper'));

				} else {
					this.$el.html("<div class='alert alert-info'>No documents</div>");
				}

			}
		});

		$(window).on('resize', function () {
			resizeList($('.collection-list .wrapper'));
		});

		var views = {};

		var schemasRoute = Backbone.Router.extend({
			listView: function (schemaName) {
				var list = new ObjCollectionList({
					el: $('.collection-list .wrapper'),
					options: {
						schemaName: schemaName
					}
				});
				list.fetchCollection();
				return list;
			},
			routes: {
				's/:schemaName': function (schemaName) {
					this.navigate("s/" + schemaName + "/new", {trigger: true});
				},
				's/:schemaName/:id': function (schemaName, id) {
					var routerItem = this;

					util.loadVocabularies(schemas, schemaName, function () {
						$('.form-schema-new').html("<a class='btn btn-info' href='#s/" + schemaName + "/new'><span class='glyphicon glyphicon-plus'></span> New</a>");
						if (views.hasOwnProperty(schemaName)) {
							views[schemaName].fetchCollection();
						} else {
							views[schemaName] = routerItem.listView(schemaName);
						}
						var view = views[schemaName];

						function getObj(id, callback) {
							var obj;
							if (id == 'new') {
								obj = view.collectionFullObj.add(new ObjModel());
								callback(obj);
							} else {
								view.collectionFullObj.fetch({
									data: {
										_id: id
									},
									complete: function () {
										obj = view.collectionFullObj.get(id);
										callback(obj ? obj : false);
									}
								});
							}
						};
						getObj(id, function (obj) {
							var html;
							if (obj) {
								var options = {
									template: function (obj) {
										var buttons = [];
										if (obj.hasOwnProperty('_id')) {
											buttons.push("<button type='button' class='btn btn-danger delete'><span class='glyphicon glyphicon-minus'></span> Delete</button>");
										}
										buttons.push("<button type='button' class='btn btn-primary save'><span class='glyphicon glyphicon-save'></span> Save</button>");
										var $wrapper = $("<div></div>");
										$wrapper.append(schemaHelper.form(schemas[schemaName].schema, obj));
										$wrapper.append("<div class='btn-group'>" + buttons.join('') + "</div>");
										return $wrapper;
									},
									saveSuccess: function (obj) {
										window.location.hash = 's/' + schemaName + '/' + obj.id;
									},
									afterRender: function (view) {
										//date input
										view.$el.find('input[type=dateUnixtime]').each(function () {
											var $input = $(this);
											$input.hide().after("<div></div>").next().datepicker({
												dateFormat: $.datepicker.TIMESTAMP,
												onSelect: function (val) {
													$(this).prev().val(val).change();
												}
											});
											$input.next().datepicker('setDate', new Date(parseInt($input.val())));
										});
										//wysiwyg input
										view.$el.find('textarea[wysiwyg]').each(function () {
											CKEDITOR.replace(this);
										});
										var instance;
										for (var i in CKEDITOR.instances) {
											instance = CKEDITOR.instances[i];
											instance.$el = view.$el.find('textarea[name=' + instance.name + ']');
											instance.on('change', function () {
												this.updateElement();
												this.$el.change();
											});
										}
										//code input
										view.$el.find('textarea[code]').each(function () {
											var $textarea = $(this);
											var $wrapper = $("<div class='form-control-code' style='height:500px;' id='code-"+this.name+"'>");
											$textarea.hide().after($wrapper);
											var editor = ace.edit($wrapper[0]);
											editor.getSession().setValue($textarea.val());
											editor.getSession().on('change', function() {
												console.log(editor.getSession().getValue());
												$textarea.val(editor.getSession().getValue()).change();
											});
											editor.getSession().setMode("ace/mode/javascript");
											editor.setTheme("ace/theme/monokai");
										});
									}
								};
								if (schemas[schemaName].hasOwnProperty('presave')) {
									options.presave = schemas[schemaName].presave;
								}
								var formView = new FormRowView({
									model: obj,
									options: options
								});
								html = formView.render().el;
							} else {
								html = "<div class='alert alert-danger'>Object is not exists</div>";
							}
							$('.form-schema').html(html);
						});

					});


				}
			}
		});
		var app = new schemasRoute();
		Backbone.history.start();
	});

})(this, jQuery);
