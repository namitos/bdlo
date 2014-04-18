/** Помощь по схемам и генератор форм из них *********************************************/
(function(context){
	function tableRow(schema, obj, parentKeyName) {
		var html = '';
		if (!obj) {
			var obj = {};
		}
		for (var key in schema.properties) {
			var field = schema.properties[key];
			if (field.hasOwnProperty('properties')) {
				html += tableRow(field, obj.hasOwnProperty(key) ? obj[key] : {}, key);
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
	}
	function formPartPrimitive(fieldSchema, value, name) {
		var inputTypes = {
			string: 'text',
			number: 'number',
			integer: 'number',
			boolean: 'number'
		};
		var attributes = {
			value: value,
			name: name,
			'class': 'form-control',
			required: fieldSchema.hasOwnProperty('required') && fieldSchema.required == true ? true : false
		};
		var input='';
		var label=name;
		if(fieldSchema.hasOwnProperty('info')){
			if(fieldSchema.info.hasOwnProperty('label')){
				label=fieldSchema.info.label;
			}
			if(fieldSchema.info.hasOwnProperty('placeholder')){
				attributes.placeholder=fieldSchema.info.placeholder;
			}
			if(fieldSchema.info.hasOwnProperty('pattern')){
				attributes.pattern=fieldSchema.info.pattern;
			}
		}
		if(fieldSchema.hasOwnProperty('minimum')){
			attributes.min = fieldSchema.minimum;
		}


		if (fieldSchema.hasOwnProperty('info') && fieldSchema.info.hasOwnProperty('type')) {
			attributes.type = fieldSchema.info.type;
		}else{
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
			input+="<select " + htmlAttributes(attributes) + "><option></option>";
			for(var key in fieldSchema.info.options){
				input+="<option value='"+key+"' "+(key==attributes.value?'selected':'')+">"+fieldSchema.info.options[key]+"</option>";
			}
			input+="</select>";
		}else if(attributes.type=='textarea'){
			var value = attributes.value;
			delete attributes.value;
			input+="<textarea " + htmlAttributes(attributes) + ">" + value + "</textarea>";
		}else{
			input+="<input " + htmlAttributes(attributes) + ">";
		}

		return "<div class='form-group'><label>" + label + "</label>"+input+"</div>";
	}
	function formPartMulti(schema, obj, parentKeyName, i){
		return "<div class='multi-item' data-i='"+i+"' data-field='"+parentKeyName+"'>"+formPart(schema, obj, parentKeyName+'['+i+']')+"<button class='btn btn-danger btn-multi-delete'><span class='glyphicon glyphicon-minus'></span><span class='text'>Delete</span></button></div>";
	}
	function formPart(schema, obj, parentKeyName) {
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
			if (fieldSchema.type == 'object') {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html += formPart(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : {}, keyName);

			} else if (fieldSchema.type == 'array') {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html += "<div class='multi'>";
				var i = 0;
				if (obj.hasOwnProperty(key) && obj[key].length) {
					for (i = 0; i < obj[key].length; ++i) {
						if (fieldSchema.items.type == 'object') {
							html += formPartMulti(fieldSchema.items, obj[key][i], keyName, i);
						} else {
							html += 'массивы из примитивов пока не поддерживаются';
							//html += formPartPrimitive(fieldSchema.items, obj.hasOwnProperty(key) ? obj[key] : '', keyName);
						}
					}
				}
				html += "<button class='btn btn-info btn-multi-add' data-schema='" + JSON.stringify(fieldSchema.items) + "' data-keyname='" + keyName + "' data-i='" + i + "'><span class='glyphicon glyphicon-plus'></span><span class='text'>Add</span></button></div>";

			} else {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				html += formPartPrimitive(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : '', keyName);
			}
		}
		return "<fieldset>" + html + "</fieldset>";
	}
	function form(schema, obj, formAttributes){
		var $form = $("<form " + htmlAttributes(formAttributes) + "></form>");
		$form.append(formPart(schema, obj));
		if(formAttributes){
			if(formAttributes.hasOwnProperty('method')){
				$form.append("<div class='form-group'><input type='submit' class='btn btn-primary'></div>");
			}else{
				$form.on('submit', function(){
					return false;
				});
			}
		}
		return $form;
	}
	function htmlAttributes(attributes){
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
	}
	function generate(obj){
		var schema={};
		if(obj instanceof Array){
			schema.type='array';
			schema.items=generate(obj[0]);

		}else if(obj instanceof Object){
			schema.type='object';
			schema.properties={};
			for(var key in obj){
				schema.properties[key]=generate(obj[key]);
			}
		}else if(typeof obj == 'string'){
			schema.type='string';

		}else if(typeof obj == 'number'){
			schema.type='number';

		}
		return schema;
	}

	$(document).on('click', '.btn-multi-add', function(e){
		var $el=jQuery(this);
		var schema=$el.data('schema');
		var keyName=$el.data('keyname');
		var i = $el.data('i');
		$el.before(formPartMulti(schema, {}, keyName, i));
		$el.data('i', ++i);
		e.preventDefault();
	});
	$(document).on('click', '.btn-multi-delete', function(e){
		var $el=jQuery(this);
		var $row=$el.parent();
		$row.remove();
		e.preventDefault();
	});
	$(document).on('click', '.btn-file-delete', function(e){
		var $el=jQuery(this);
		var $row=$el.parent();
		$row.remove();
		e.preventDefault();
	});

	context.schemaHelper = {
		generate: generate,
		form: form,
		formPart: function(){
			return "this method is deprecated. use method 'form'!";
		}
	};
})(this);
