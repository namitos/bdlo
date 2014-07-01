(function (context, $) {
	context.util = {
		loadVocabularies: function (schemas, schemaName, callback) {
			toLoad = [];
			_.forIn(schemas[schemaName].schema.properties, function (schemaPart, key) {//вытаскивание промисов на загрузку словарей надо сделать рекурсивно из всех схемы, а не только из первого уровня
				if (schemaPart.type == 'any' && schemaPart.hasOwnProperty('info') && schemaPart.info.hasOwnProperty('type') && schemaPart.info.type == 'select' && schemaPart.info.hasOwnProperty('schema')) {
					toLoad.push({
						obj: schemaPart,
						url: '/rest/' + schemaPart.info.schema
					});
				}
			});
			load(toLoad, function (result) {
				_.forIn(result, function (loadedItem, key) {
					var options = {};
					loadedItem.result.forEach(function (vocabularyItem) {
						options[vocabularyItem._id] = vocabularyItem[schemas[loadedItem.obj.info.schema].schema.info.titleField];
					});
					loadedItem.obj.info.options = options;
				});
				callback();
			});
		},
		buildMenu: function (items) {
			var menu = '';
			items.forEach(function (item) {
				var children = item.hasOwnProperty('children') ? context.util.buildMenu(item.children) : '';
				menu += "<li><a href='" + item.url + "'>" + item.title + "</a>" + children + "</li>";
			});
			return "<ul class='nav navbar-nav'>" + menu + "</ul>";
		}
	};

})(this, jQuery);
