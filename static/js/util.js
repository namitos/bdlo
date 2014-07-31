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


	if (!global.Notification) {
		global.Notification = function (title, data) {
			var $wrapper = $('#notifications');
			if (!$wrapper.length) {
				$('body').append("<div id='notifications'></div>");
				$wrapper = $('#notifications');
			}
			$wrapper.find('.alert-' + data.tag).remove();
			this.$el = $("<div style='opacity:0' class='alert alert-" + data.tag + "'><button type='button' class='close' data-dismiss='alert'>×</button><strong>" + title + "</strong><p>" + data.body + "</p></div>");

			$wrapper.append(this.$el);
			this.$el.css({
				opacity: 1
			});
			var notification = this;
			this.$el.on('click', function(){
				if(notification.onclick){
					notification.onclick();
				}
			});
		};
		global.Notification.requestPermission = function (callback) {
			callback('granted');
		};
		global.Notification.prototype.close = function(){
			this.$el.remove();
		}
	}

	function sendNoficiation(title, tag, text, onclick) {
		global.Notification.requestPermission(function (result) {
			console.log(result);
		});
		var message = new global.Notification(title, {
			tag: tag,
			body: text,
			icon: ''
		});
		message.onclick = function () {
			if (onclick) {
				message.onclick = onclick;
			}
			this.close();
		}
	};
	
	function makeTabs(data) {
		var $wrapper = $("<div class='tabs-wrapper'></div>");
		var $tabs = $("<ul class='nav nav-tabs'></ul>");
		var $tabsContent = $("<div class='tab-content'></div>");
		for(var key in data){
			$tabs.append("<li><a href='#" + key + "' data-toggle='tab'>" + data[key].title + "</a></li>");
			var $dataWrap = $("<div class='tab-pane' id='" + key + "'></div>");
			$dataWrap.append(data[key].html);
			$tabsContent.append($dataWrap);
		}
		$wrapper.append($tabs).append($tabsContent);
		return $wrapper;
	}
	global.util.loadVocabularies = loadVocabularies;
	global.util.loadBlocks = loadBlocks;
	global.util.buildMenu = buildMenu;
	global.util.sendNoficiation = sendNoficiation;
	global.util.makeTabs = makeTabs;
})(this, jQuery);
