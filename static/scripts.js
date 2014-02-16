window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;


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



/** Асинхронный подгрузчик всякого *********************************************/
var loadTemplates = function (templates, onLoad) {
	load(templates, function(results){
		for(var key in results){
			results[key]= _.template(results[key]);
		}
		onLoad(results);
	});
};
var load = function (urls, onLoad) {
	var loadPromise = function (url) {
		return new vow.Promise(function(resolve, reject, notify) {
			$.get(url, function (data) {
				resolve(data);
			});
		});
	};
	var promises = {};
	for (var key in urls) {
		promises[key] = loadPromise(urls[key]);
	}
	vow.all(promises).then(function (results) {
		onLoad(results);
	});
};





/** Backbone вьюха для мультизначений форм *********************************************/

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


/** Помощь по схемам и генератор форм из них *********************************************/
var schemaHelper = {
	tableRow: function (schema, obj, parentKeyName) {
		var html = '';
		if (!obj) {
			var obj = {};
		}
		for (var key in schema.properties) {
			var field = schema.properties[key];
			if (field.hasOwnProperty('properties')) {
				html += schemaHelper.tableRow(field, obj.hasOwnProperty(key) ? obj[key] : {}, key);
			} else {
				var value = obj.hasOwnProperty(key) ? obj[key] : '';
				var attributes = {
					value: value,
					name: parentKeyName ? parentKeyName + '.' + key : key
				};
				html += "<td data-name='"+attributes.name+"'>" + attributes.value + "</td>";
			}
		}
		return html;
	},
	formPartPrimitive: function (fieldSchema, value, name) {
		var inputTypes = {
			string: 'text',
			number: 'number',
			integer: 'number',
			boolean: 'number'
		};
		var attributes = {
			value: value,
			name: name,
			placeholder: name,
			'class': 'form-control',
			required: fieldSchema.hasOwnProperty('required') && fieldSchema.required == true ? true : false
		};
		var input='';
		var label=name;
		if (fieldSchema.type == 'any') {
			if (fieldSchema.hasOwnProperty('info')) {
				if(fieldSchema.info.hasOwnProperty('type')){
					attributes.type = fieldSchema.info.type;
				}
				if(fieldSchema.info.hasOwnProperty('label')){
					label=fieldSchema.info.label;
				}
			}
		} else {
			attributes.type = inputTypes[fieldSchema.type];
		}

		if(attributes.type=='file' && value && value.length){
			input+="<ul class='file-list'>";
			var fileName='';
			for(var i=0;i<value.length;++i){
				if(value[i]!=null){
					fileName=value[i].split('/');
					fileName=fileName[fileName.length-1];
					input+="<li data-i='"+i+"' data-field='"+name+"'><a class='btn-file-delete'><span class='glyphicon glyphicon-remove'></span><span class='text'>Delete</span></a><a style='display:inline-block;width:100px;overflow:hidden;text-overflow:ellipsis;' target='_blank' href='/"+value[i]+"'>"+fileName+"</a></li>";
				}
			}
			input+="</ul>";
		}
		if(attributes.type=='select'){
			input+="<select " + this.htmlAttributes(attributes) + "><option></option>";
			for(var key in fieldSchema.info.options){
				input+="<option value='"+key+"' "+(key==attributes.value?'selected':'')+">"+fieldSchema.info.options[key]+"</option>";
			}
			input+="</select>";
		}else{
			input+="<input " + this.htmlAttributes(attributes) + ">";
		}

		return "<div class='form-group'><label>" + label + "</label>"+input+"</div>";
	},
	formPartMulti:function (schema, obj, parentKeyName, i){
		return "<div class='multi-item' data-i='"+i+"' data-field='"+parentKeyName+"'>"+this.formPart(schema, obj, parentKeyName+'['+i+']')+"<button class='btn btn-danger btn-multi-delete'><span class='glyphicon glyphicon-minus'></span><span class='text'>Delete</span></button></div>";
	},
	formPart: function (schema, obj, parentKeyName) {
		var html = '';
		if (!obj) {
			obj = {};
		}
		var propKey = 'properties';
		if (schema.hasOwnProperty('items')) {
			propKey = 'items';
		}
		var keyName;
		for (var key in schema[propKey]) {
			var fieldSchema = schema[propKey][key];
			if (fieldSchema.type=='object') {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html += this.formPart(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : {}, keyName);

			} else if (fieldSchema.type=='array') {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html+="<div class='multi'>";
				var i=0;
				if(obj.hasOwnProperty(key) && obj[key].length){
					for(i=0;i<obj[key].length;++i){
						if(fieldSchema.items.type=='object'){
							html += this.formPartMulti(fieldSchema.items, obj[key][i], keyName, i);
						}else{
							html += 'массивы из примитивов пока не поддерживаются';
							//html += this.formPartPrimitive(fieldSchema.items, obj.hasOwnProperty(key) ? obj[key] : '', keyName);
						}
					}
				}
				html += "<button class='btn btn-info btn-multi-add' data-schema='"+JSON.stringify(fieldSchema.items)+"' data-keyname='"+keyName+"' data-i='"+i+"'><span class='glyphicon glyphicon-plus'></span><span class='text'>Add</span></button></div>";

			} else {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html += this.formPartPrimitive(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : '', keyName);
			}
		}
		return "<fieldset>" + html + "</fieldset>";
	},
	form:function(schema, obj, formAttributes){
		return "<form "+this.htmlAttributes(formAttributes)+">"+this.formPart(schema, obj)+"<div class='form-group'><input type='submit' class='btn btn-primary'></div></form>";
	},
	htmlAttributes:function(attributes){
		var attributesArray=[];
		for(var key in attributes){
			if(attributes[key]===false){

			} else if(attributes[key]===true){
				attributesArray.push(key);
			}else{
				attributesArray.push(key+"='"+attributes[key]+"'");
			}
		}
		return attributesArray.join(' ');
	},
	generate:function(obj){
		var schema={};
		if(obj instanceof Array){
			schema.type='array';
			schema.items=this.generate(obj[0]);

		}else if(obj instanceof Object){
			schema.type='object';
			schema.properties={};
			for(var key in obj){
				schema.properties[key]=this.generate(obj[key]);
			}
		}else if(typeof obj == 'string'){
			schema.type='string';

		}else if(typeof obj == 'number'){
			schema.type='number';

		}
		return schema;
	}
};


jQuery(document).on('click', '.btn-multi-add', function(e){
	var $el=jQuery(this);
	var schema=$el.data('schema');
	var keyName=$el.data('keyname');
	var i = $el.data('i');
	$el.before(schemaHelper.formPartMulti(schema, {}, keyName, i));
	$el.data('i', ++i);
	e.preventDefault();
});
jQuery(document).on('click', '.btn-multi-delete', function(e){
	var $el=jQuery(this);
	var $row=$el.parent();
	$row.remove();
	e.preventDefault();
});
jQuery(document).on('click', '.btn-file-delete', function(e){
	var $el=jQuery(this);
	var $row=$el.parent();
	$row.remove();
	e.preventDefault();
});


