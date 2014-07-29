/** Помощь по схемам и генератор форм из них *********************************************/
(function (context) {
	function formPartPrimitive(fieldSchema, value, name) {
		var inputTypes = {
			string: 'text',
			number: 'number',
			integer: 'number',
			boolean: 'number'
		};
		console.log(name);
		var attributes = {
			name: name,
			'class': 'form-control',
			required: fieldSchema.hasOwnProperty('required') && fieldSchema.required == true ? true : false,
			type: inputTypes[fieldSchema.type]
		};
		var label = name;
		if (fieldSchema.hasOwnProperty('info')) {
			if (fieldSchema.info.hasOwnProperty('label')) {
				label = fieldSchema.info.label;
			}
			['placeholder', 'pattern', 'multiple', 'wysiwyg', 'code', 'type'].forEach(function(attribute){
				if (fieldSchema.info.hasOwnProperty(attribute)) {
					attributes[attribute] = fieldSchema.info[attribute];
				}
			});
		}
		if (fieldSchema.hasOwnProperty('minimum')) {
			attributes.min = fieldSchema.minimum;
		}

		var $wrapper = $("<div><label>" + label + "</label></div>");
		$wrapper.addClass("form-group " + _.compact(name.trim().split(/[\.\[\]]/)).join(' '));

		if (attributes.type == 'file' && value && value.length) {
			var $files = $("<ul class='file-list'></ul>");
			var fileName = '';
			for (var i = 0; i < value.length; ++i) {
				if (value[i] != null) {
					fileName = value[i].split('/');
					fileName = fileName[fileName.length - 1];
					$files.append("<li data-i='" + i + "' data-field='" + name + "'><a class='btn-file-delete'><span class='glyphicon glyphicon-remove'></span><span class='text'>Delete</span></a><a style='display:inline-block;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' target='_blank' href='/static/" + value[i] + "'>" + fileName + "</a></li>");
				}
			}
			$wrapper.append($files);
		}
		var $input;
		if (attributes.type == 'select') {
			$input = $("<select><option></option></select>");
			var $option;
			for (var key in fieldSchema.info.options) {
				$option = $("<option></option>");
				$option.attr({
					value: key,
					selected: key == value? true : false
				});
				$option.text(fieldSchema.info.options[key]);
				$input.append($option);
			}
		} else if (attributes.type == 'textarea') {
			$input = $("<textarea></textarea>");
		} else {
			$input = $("<input>");
		}
		$input.attr(attributes);
		if(attributes.type != 'file'){
			$input.val(value);
		}
		$wrapper.append($input);
		return $wrapper;
	}

	function formPartMulti(schema, obj, parentKeyName, i) {
		var $wrapper = $("<div></div>");
		$wrapper.addClass('multi-item');
		$wrapper.attr('data-i', i);
		$wrapper.attr('data-field', parentKeyName);
		$wrapper.append(formPart(schema, obj, parentKeyName + '[' + i + ']'));
		$wrapper.append("<button class='btn btn-danger btn-multi-delete'><span class='glyphicon glyphicon-minus'></span><span class='text'>Delete</span></button>");
		return $wrapper;
	}

	function formPartMultiPrimitive(schema, obj, parentKeyName, i) {
		var $wrapper = $("<div></div>");
		$wrapper.addClass('multi-item');
		$wrapper.attr('data-i', i);
		$wrapper.attr('data-field', parentKeyName);
		$wrapper.append(formPartPrimitive(schema, obj, parentKeyName + '[' + i + ']'));
		$wrapper.append("<button class='btn btn-danger btn-multi-delete'><span class='glyphicon glyphicon-minus'></span><span class='text'>Delete</span></button>");
		return $wrapper;
	}

	function formPart(schema, obj, parentKeyName) {
		var $wrapper = $("<fieldset></fieldset>");
		$wrapper.addClass("group");
		if(parentKeyName){
			$wrapper.addClass(_.compact(parentKeyName.trim().split(/[\.\[\]]/)).join(' '));
		}
		if (schema.hasOwnProperty('info') && schema.info.hasOwnProperty('label')) {
			$wrapper.append("<legend>" + schema.info.label + "</legend>");
		}
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
				$wrapper.append(formPart(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : {}, keyName));

			} else if (fieldSchema.type == 'array') {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				var $array = $("<fieldset></fieldset>");
				$array.addClass('multi');
				if (fieldSchema.hasOwnProperty('info') && fieldSchema.info.hasOwnProperty('label')) {
					$array.append("<legend>" + fieldSchema.info.label + "</legend>");
				}
				var $items = $("<div class='items'></div>");
				var i = 0;
				if (obj.hasOwnProperty(key) && obj[key].length) {
					for (i = 0; i < obj[key].length; ++i) {
						if (fieldSchema.items.type == 'object') {
							$items.append(formPartMulti(fieldSchema.items, obj[key][i], keyName, i));
						} else {
							$items.append(formPartMultiPrimitive(fieldSchema.items, obj[key][i], keyName, i));
						}
					}
				}
				$array.append($items);
				$array.append("<div class='btn-group'><button class='btn btn-info btn-multi-add' data-schema='" + JSON.stringify(fieldSchema.items) + "' data-keyname='" + keyName + "' data-i='" + i + "'><span class='glyphicon glyphicon-plus'></span><span class='text'>Add</span></button></div>");
				$wrapper.append($array);
			} else {
				keyName = parentKeyName ? parentKeyName + '.' + key : key;
				$wrapper.append(formPartPrimitive(fieldSchema, obj.hasOwnProperty(key) ? obj[key] : '', keyName));
			}
		}
		return $wrapper;
	}

	function form(schema, obj, formAttributes) {
		var $form = $("<form><input type='submit' value='' style='display:none;'></form>");
		$form.append(formPart(schema, obj));
		if (formAttributes) {
			$form.attr(formAttributes);
			if (formAttributes.hasOwnProperty('method')) {
				$form.append("<div class='form-group'><input type='submit' class='btn btn-primary'></div>");
			} else {
				$form.on('submit', function () {
					return false;
				});
			}
		}
		return $form;
	}

	function generate(obj) {
		var schema = {};
		if (obj instanceof Array) {
			schema.type = 'array';
			schema.items = generate(obj[0]);

		} else if (obj instanceof Object) {
			schema.type = 'object';
			schema.properties = {};
			for (var key in obj) {
				schema.properties[key] = generate(obj[key]);
			}
		} else if (typeof obj == 'string') {
			schema.type = 'string';

		} else if (typeof obj == 'number') {
			schema.type = 'number';

		}
		return schema;
	}

	$(document).on('click', '.btn-multi-add', function (e) {
		var $el = jQuery(this);
		var schema = $el.data('schema');
		var keyName = $el.data('keyname');
		var i = $el.data('i');
		var $items = $el.closest('.multi').find('.items');
		if (schema.type != 'object' && schema.type != 'array') {
			$items.append(formPartMultiPrimitive(schema, '', keyName, i));
		} else {
			$items.append(formPartMulti(schema, {}, keyName, i));
		}

		$el.data('i', ++i);
		e.preventDefault();
	});
	$(document).on('click', '.btn-multi-delete', function (e) {
		var $el = jQuery(this);
		var $row = $el.parent();
		$row.remove();
		e.preventDefault();
	});
	$(document).on('click', '.btn-file-delete', function (e) {
		var $el = jQuery(this);
		var $row = $el.parent();
		$row.remove();
		e.preventDefault();
	});

	context.schemaHelper = {
		generate: generate,
		form: form
	};
})(this);
