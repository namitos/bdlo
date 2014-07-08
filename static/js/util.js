(function (global, $) {
	if (!global.hasOwnProperty('util')) {
		global.util = {};
	}
	function loadVocabularies(schemas, schemaName, callback) {
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
	};

	function loadBlocks(pathname, widgets) {
		$.get('/blocks', {
			pathname: pathname
		}, function (blocks) {
			blocks.forEach(function (block) {
				block.weight = parseInt(block.weight);
			});
			blocks.sort(function (a, b) {
				if (a.weight < b.weight) {
					return -1;
				}
				if (a.weight > b.weight) {
					return 1;
				}
				return 0;
			});
			blocks.forEach(function (block) {
				if (block.link) {
					block.title = "<a href='" + block.link + "'>" + block.title + "</a>";
				}
				var $wrapper = $("<div class='panel panel-default panel-" + block._id + "'><div class='panel-heading'><div class='panel-title'>" + block.title + "</div></div><div class='panel-body'>" + block.content + "</div></div>");
				if (block.hasOwnProperty('widget') && block.widget) {
					$wrapper.addClass('panel-' + block.widget);
					var $content = widgets[block.widget]($wrapper);
					if ($content) {
						$wrapper.find('.panel-body').html($content);
						$(block.target).append($wrapper);
					}
				}else{
					$(block.target).append($wrapper);
				}
			});
		});
	};

	function buildMenu(items) {
		var menu = '';
		items.forEach(function (item) {
			var children = item.hasOwnProperty('children') ? buildMenu(item.children) : '';
			menu += "<li><a href='" + item.url + "'>" + item.title + "</a>" + children + "</li>";
		});
		return "<ul class='nav navbar-nav'>" + menu + "</ul>";
	};

	global.util.loadVocabularies = loadVocabularies;
	global.util.loadBlocks = loadBlocks;
	global.util.buildMenu = buildMenu;
})(this, jQuery);
