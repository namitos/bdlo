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
			this.$el.find('form input[type=submit]').click();
		},
		'submit form': function () {
			this.saveModel();
			return false;
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
		var changeField = function (input, callback) {
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
				var val = $input.val();
				if($input.attr('type') == 'number'){
					val = parseInt($input.val());
				}
				callback(view._treeObj(keys, val));
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
			var data = view.model.toJSON();
			view._compact(data);
			view.model.set(data);
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
	},
	_compact: function (obj) {
		for (var key in obj) {
			if (obj[key] instanceof Array) {
				obj[key] = _.compact(obj[key]);
			} else if (obj[key] instanceof Object) {
				this._compact(obj[key]);
			}
		}
	}
});
