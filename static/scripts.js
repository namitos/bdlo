/** jQuery плагин для отсыла форм без перехода *********************************************/
(function ($) {
	jQuery.fn.ajaxform = function (callback, action_new) {
		jQuery(this).submit(function () {
			var form = this;
			var formData = new FormData(form);
			var xhr = new XMLHttpRequest();
			var method = jQuery(form).attr('method');
			if (!method) {
				method = 'GET';
			}
			var action = action_new ? action_new : jQuery(form).attr('action');
			xhr.open(method, action, true);
			xhr.onload = function (e) {
				callback.call(form, this.response);
			};
			xhr.send(formData);
			return false;
		});
	}
})(jQuery);




/** Backbone вьюха для мультизначений форм *********************************************/

var formRowModel = Backbone.Model.extend({
});

var formRowView = Backbone.View.extend({
	initialize: function (input) {
		this.options = input.options;
	},
	render: function () {
		var data = this.model.toJSON();
		data.cid = this.model.cid;
		this.$el.html(this.options.template(data));
		return this;
	},
	events: {
		"keyup input": "changeField",
		"change input": "changeField"
	},
	changeField: function (e) {
		this.model.set(jQuery(e.currentTarget).attr('name'), jQuery(e.currentTarget).val());
		this.model.save();
	}
});

var formRowsView = Backbone.View.extend({
	initialize: function (input) {
		this.options = {
			min: input.min,
			max: input.max,
			defaults: input.defaults,
			renderRow: input.renderRow,
			template: input.template
		};
		if (this.collection.size()) {//если мы передали уже заполненную коллекцию
			var models = this.collection.toJSON();
			this.collection.fetch();
			var size = this.collection.size();
			for (var i = size - 1; i >= 0; i--) {//удаляем всё из локалстораджа
				this.collection.models[i].destroy();
			}
			for (var key in models) {//заполняем его переданными данными. если forEach юзать, то контекст не тот и соси хуй получается
				this.collection.create(models[key]);
			}
		} else {
			console.log('передана пустая коллекция, забираем из хранилища');
			this.collection.fetch();
			if (this.options.min && this.options.min > this.collection.size()) {
				for (var i = this.collection.size(); i < this.options.min; i++) {
					this.collection.create(this.options.defaults);
				}
			}
		}
		this.render();
	},
	events: {
		'click .add': 'addRow',
		'click .delete': 'deleteRow'
	},
	render: function () {
		this.$el.html("<div class='rows'></div><button type='button' class='btn btn-info add' value='Ещё'><span class='glyphicon glyphicon-plus'></span></button>");
		for (var key in this.collection.models) {
			this.renderRow(this.collection.models[key]);
		}
	},
	addRow: function (e) {
		console.log('addRow');
		if (this.options.max && this.options.max <= this.collection.size()) {
		} else {
			var object = this.collection.create(this.options.defaults);
			this.renderRow(object);
		}
	},
	renderRow: function (model) {
		var row = new formRowView({
			model: model,
			options: {
				template: this.options.template
			}
		});
		var el = row.render().$el;
		this.$el.find('.rows').append(el);
		if (this.options.renderRow) {
			this.options.renderRow(el);
		}
	},
	deleteRow: function (e) {
		var rows = this.$el.find('.rows');
		if (this.options.min && this.options.min >= this.collection.size()) {
		} else {
			var el = this.$(e.currentTarget).parent().parent();
			var object = this.collection.get(el.data('cid'));
			object.destroy();
			this.$(e.currentTarget).parent().parent().remove();
		}
	}
});


/** Подгрузчик темплейтов *********************************************/

var loadTemplates = function (templates, onLoad) {
	var loadTemplatePromise = function (name, url) {
		var promise = Vow.promise();
		$.get(url, function (data) {
			promise.fulfill({
				name: name,
				template: _.template(data)
			});
		});
		return promise;
	};
	var promises = [];
	for (var name in templates) {
		promises.push(loadTemplatePromise(name, templates[name]));
	}
	Vow.all(promises).then(function (results) {
		var templates = {};
		results.forEach(function (result) {
			templates[result.name] = result.template;
		});
		onLoad(templates);
	});
};


/** Socket.io *********************************************/
io = io.connect();

