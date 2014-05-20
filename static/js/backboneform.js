var FormRowView = Backbone.View.extend({
	className: "form-row-view",
	initialize: function (input) {
		this.options = input.options;
		if (!this.options.hasOwnProperty('deleteConfirm')) {
			this.options.deleteConfirm = true;
		}
	},
	render: function () {
		var data = this.model.toJSON();
		data.cid = this.model.cid;
		if (this.options.hasOwnProperty('additional')) {
			data.additional = this.options.additional;
		}
		this.$el.html(this.options.template(data));

		if (this.options.hasOwnProperty('afterRender')) {
			this.options.afterRender(this);
		}
		return this;
	},
	events: {
		'keyup input': 'changeField',
		'change input': 'changeField',
		'keyup textarea': 'changeField',
		'change textarea': 'changeField',
		'change select': 'changeField',
		'click .delete': function () {//обработка удаления модели
			if (
				(this.options.deleteConfirm == false) ||
					(this.options.deleteConfirm == true && confirm('Are you sure?'))
				) {
				this.$el.remove();
				this.model.destroy();
			}
		},
		'click .btn-multi-delete': function (e) {//обработка удаления мультиполя(элемента из массива) из модели
			var view = this;
			var $el = view.$(e.currentTarget).parent();
			var i = $el.data('i');
			var newModel = view.model.toJSON();
			var headObj = view._headObj($el.data('field').split('.'), newModel);
			delete headObj[i];
			view.model.set(newModel);
			if (view.options.hasOwnProperty('autosave') && view.options.autosave == true) {
				view.saveModel();
			}
		},
		'click .btn-file-delete': function (e) {
			var view = this;
			var $el = view.$(e.currentTarget).parent();
			var i = $el.data('i');
			var newModel = view.model.toJSON();
			var headObj = view._headObj($el.data('field').split('.'), newModel);
			delete headObj[i];
			view.model.set(newModel);
			if (view.options.hasOwnProperty('autosave') && view.options.autosave == true) {
				view.saveModel();
			}
		},
		'click .save': function () {
			this.saveModel();
		}
	},
	changeField: function (e) {
		var view = this;
		var fileReadPromise = function (file) {
			return new vow.Promise(function (resolve, reject, notify) {
				var reader = new FileReader();
				reader.onload = function (a) {
					resolve(a.target.result);
				};
				reader.readAsDataURL(file);
			});

		};
		var filesRead = function (files, callback) {
			var promises = [];
			for (var i = 0; i < files.length; ++i) {
				promises.push(fileReadPromise(files[i]));
			}
			vow.all(promises).then(function (result) {
				callback(result);
			});
		};
		var changeField = function (input, callback) {//@TODO возможно получится упростить получение самого верхнего объекта как тут 'click .btn-multi-delete'
			var $input = jQuery(input);
			var keys = _.compact($input.attr('name').split(/[\.\[\]]/));
			keys.forEach(function (key, i) {
				if (parseInt(key).toString() == key) {
					keys[i] = parseInt(key);
				}
			});
			if (input.type == 'file') {
				filesRead(input.files, function (result) {
					callback(view._treeObj(keys, result));
				});
			} else {
				callback(view._treeObj(keys, $input.val()));
			}
		};
		changeField(e.currentTarget, function (update) {
			view.model.set(_.merge(view.model.toJSON(), update));
			if (view.options.hasOwnProperty('autosave') && view.options.autosave == true) {
				view.saveModel();
			}
		});
	},
	saveModel: function () {
		var view = this;
		var save = function (view) {
			view.model.save({}, {
				success: function (model) {
					if (view.options.hasOwnProperty('saveSuccess')) {
						view.model = model;
						view.render();
						view.options.saveSuccess(model);
					}
				},
				error: function (model) {
					if (view.options.hasOwnProperty('saveError')) {
						view.options.saveError(model);
					}
				}
			});
		};
		if (view.options.hasOwnProperty('presave')) {
			view.options.presave(view.model, function (model) {
				save(view);
			});
		} else {
			save(view);
		}


	},
	_headObj: function (fieldParts, obj) {
		var headObj = obj;
		fieldParts.forEach(function (fieldPart) {
			headObj = headObj[fieldPart];
		});
		return headObj;
	},
	/**
	 * @param {Array} fieldParts
	 * @param {String} val
	 * @returns {{}} возвращает вложенный объект в соответствии с плоским массивом fieldParts
	 */
	_treeObj: function (fieldParts, val) {
		var obj = {};
		var headObj = obj;
		fieldParts.forEach(function (fieldPart, i) {
			if (!headObj.hasOwnProperty(fieldPart)) {
				if (fieldParts.length == i + 1) {
					headObj[fieldPart] = val;
				} else {
					if (typeof fieldParts[i + 1] == 'number') {
						headObj[fieldPart] = [];
					} else {
						headObj[fieldPart] = {};
					}

				}
			}
			headObj = headObj[fieldPart];
		});
		return obj;
	}
});
