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
		'click .delete': function () {
			if(
				(this.options.deleteConfirm==false) ||
				(this.options.deleteConfirm==true && confirm('Are you sure?'))
			){
				this.$el.remove();
				this.model.destroy();
			}
		},
		'click .save': function () {
			this.saveModel();
		}
	},
	changeField: function (e) {
		var $input = jQuery(e.currentTarget);
		var keys = $input.attr('name').split('.');
		var update = {};
		var headObject = update;
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (i == keys.length - 1) {//если последний
				headObject[key] = $input.val();
			} else if (!update.hasOwnProperty(keys[i])) {
				if (key.indexOf('[') == -1) {
					update[key] = {};
					headObject = update[key];
				} else {
					key=key.split(/[\[,\]]/);
					update[key[0]] = [];
					update[key[0]][parseInt(key[1])] = {};
					headObject = update[key[0]][parseInt(key[1])];
				}
			}
		}
		console.log(update);
		this.model.set(_.merge(this.model.toJSON(), update));
		console.log(this.model.toJSON());
		if (this.options.hasOwnProperty('presave')) {
			this.model = this.options.presave(this.model);
		}
		if (this.options.hasOwnProperty('autosave') && this.options.autosave == true) {
			this.saveModel();
		}
	},
	saveModel:function(){
		var _this=this;
		this.model.save({}, {
			success:function(model){
				if(_this.options.hasOwnProperty('saveSuccess')){
					_this.options.saveSuccess(model);
				}
			}
		});
	}
});

var FormRowsView = Backbone.View.extend({
	initialize: function (input) {
		this.options = {
			min: input.min,
			max: input.max,
			defaults: input.defaults,
			renderRow: input.renderRow,
			template: input.template,
			additional:input.additional
		};
		//todo: тут надо ещё сдеть проверку, если хранилище - локалсторадж.
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
		'click .add': 'addRow'
	},
	render: function () {
		this.$el.html("<div class='rows'></div><button type='button' class='btn btn-info add' value='Ещё'><span class='glyphicon glyphicon-plus'></span></button>");
		for (var key in this.collection.models) {
			this.renderRow(this.collection.models[key]);
		}
	},
	addRow: function (e) {
		if (this.options.max && this.options.max <= this.collection.size()) {
		} else {
			var object = this.collection.create(this.options.defaults);
			this.renderRow(object);
		}
	},
	renderRow: function (model) {
		var row = new FormRowView({
			model: model,
			options: {
				template: this.options.template,
				autosave: true,
				deleteConfirm: false,
				additional: this.options.additional
			}
		});
		var el = row.render().$el;
		this.$el.find('.rows').append(el);
		if (this.options.renderRow) {
			this.options.renderRow(el);
		}
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
			any: 'text',
			string: 'text',
			number: 'number',
			integer: 'number',
			boolean: 'number'
		};
		var attributes = {
			type: inputTypes[fieldSchema.type],
			value: value,
			name: name,
			placeholder: name,
			'class': 'form-control',
			required: fieldSchema.hasOwnProperty('required') && fieldSchema.required == true ? true : false
		};
		return "<div class='form-group'><label>" + attributes.placeholder + "</label><input " + this.htmlAttributes(attributes) + "></div>";

	},
	formPartMulti:function (schema, obj, parentKeyName){
		return "<div class='multi-item'>"+this.formPart(schema, obj, parentKeyName)+"<button class='btn btn-danger btn-multi-delete'><span class='glyphicon glyphicon-minus'></span></button></div>";
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
							html += this.formPartMulti(fieldSchema.items, obj[key][i], keyName+'['+i+']');
						}else{
							html += 'массивы из примитивов пока не поддерживаются';
							//html += this.formPartPrimitive(fieldSchema.items, obj.hasOwnProperty(key) ? obj[key] : '', keyName);
						}
					}
				}
				html += "<button class='btn btn-info btn-multi-add' data-schema='"+JSON.stringify(fieldSchema.items)+"' data-keyname='"+keyName+"' data-i='"+i+"'><span class='glyphicon glyphicon-plus'></span></button></div>";

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
	$el.before(schemaHelper.formPartMulti(schema, {}, keyName+'['+i+']'));
	$el.data('i', ++i);
	e.preventDefault();
});
jQuery(document).on('click', '.btn-multi-delete', function(e){
	var $el=jQuery(this);
	var $row=$el.parent();
	$row.remove();
	e.preventDefault();
});



/** Socket.io *********************************************/
io = io.connect();

