var FormRowModel = Backbone.Model.extend({
});

var FormRowView = Backbone.View.extend({
	className: "form-row-view",
	initialize: function (input) {
		this.options = input.options;
		if(!this.options.hasOwnProperty('deleteConfirm')){
			this.options.deleteConfirm=true;
		}
	},
	render: function () {
		var data = this.model.toJSON();
		data.cid = this.model.cid;
		if(this.options.hasOwnProperty('additional')){
			data.additional=this.options.additional;
		}
		this.$el.html(this.options.template(data));
		return this;
	},
	events: {
		'keyup input': 'changeField',
		'change input': 'changeField',
		'keyup textarea': 'changeField',
		'change textarea': 'changeField',
		'change select': 'changeField',
		'click .delete': function () {//обработка удаления модели
			if(
				(this.options.deleteConfirm==false) ||
					(this.options.deleteConfirm==true && confirm('Are you sure?'))
				){
				this.$el.remove();
				this.model.destroy();
			}
		},
		'click .btn-multi-delete': function (e) {//обработка удаления мультиполя(элемента из массива) из модели
			var instance = this;
			var $el = instance.$(e.currentTarget).parent();
			var i = $el.data('i');
			var newModel = instance.model.toJSON();
			var headObj = instance._headObj($el.data('field'), newModel);
			delete headObj[i];
			instance.model.set(newModel);
			if (instance.options.hasOwnProperty('presave')) {
				instance.model = instance.options.presave(instance.model);
			}
			if (instance.options.hasOwnProperty('autosave') && instance.options.autosave == true) {
				instance.saveModel();
			}
		},
		'click .btn-file-delete': function(e){
			var instance = this;
			var $el = instance.$(e.currentTarget).parent();
			var i = $el.data('i');
			var newModel = instance.model.toJSON();
			var headObj = instance._headObj($el.data('field'), newModel);
			delete headObj[i];
			instance.model.set(newModel);
			if (instance.options.hasOwnProperty('presave')) {
				instance.model = instance.options.presave(instance.model);
			}
			if (instance.options.hasOwnProperty('autosave') && instance.options.autosave == true) {
				instance.saveModel();
			}
		},
		'click .save': function () {
			this.saveModel();
		}
	},
	changeField: function (e) {
		var fileReadPromise = function(file){
			return new vow.Promise(function(resolve, reject, notify) {
				var reader = new FileReader();
				reader.onload = function (a) {
					console.log(a.target.result);
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
		var changeField = function(input, callback){//@TODO возможно получится упростить получение самого верхнего объекта как тут 'click .btn-multi-delete'
			var $input = jQuery(input);
			var keys = $input.attr('name').split('.');
			var update = {};
			var headObject = update;

			for (var i = 0; i < keys.length; ++i) {
				var key = keys[i];
				if (i == keys.length - 1) {//если последний
					if (input.type == 'file') {
						filesRead(input.files, function(result){
							headObject[key] = result;
							callback(update);
						});
					} else {
						headObject[key] = $input.val();
						callback(update);
					}
				} else if (!update.hasOwnProperty(keys[i])) {
					if (key.indexOf('[') == -1) {
						update[key] = {};
						headObject = update[key];
					} else {
						key = key.split(/[\[,\]]/);
						update[key[0]] = [];
						update[key[0]][parseInt(key[1])] = {};
						headObject = update[key[0]][parseInt(key[1])];
					}
				}
			}
		};

		var instance = this;
		changeField(e.currentTarget, function(update){
			instance.model.set(_.merge(instance.model.toJSON(), update));
			//console.log('instance.model.toJSON()', instance.model.toJSON());
			if (instance.options.hasOwnProperty('presave')) {
				instance.model = instance.options.presave(instance.model);
			}
			if (instance.options.hasOwnProperty('autosave') && instance.options.autosave == true) {
				instance.saveModel();
			}
		});
	},
	saveModel:function(){
		var _this=this;
		//console.log('saving... instance.model.toJSON()', this.model.toJSON());
		this.model.save({}, {
			success:function(model){
				if(_this.options.hasOwnProperty('saveSuccess')){
					_this.model = model;
					_this.render();
					_this.options.saveSuccess(model);
				}
			},
			error: function(model){
				if(_this.options.hasOwnProperty('saveError')){
					_this.options.saveError(model);
				}
			}
		});
	},
	_headObj:function(fieldString, obj){
		var fieldParts = fieldString.split('.');
		var headObj = obj;
		fieldParts.forEach(function (fieldPart) {
			headObj = headObj[fieldPart];
		});
		return headObj;
	}
});