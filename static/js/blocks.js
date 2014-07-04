(function (context, $) {
	context.loadBlocks = function (pathname, widgets) {
		$.get('/blocks', {
			pathname: pathname
		}, function (blocks) {
			var blocks = blocks.sort(function (a, b) {
				if (parseInt(a.weight) < parseInt(b.weight)) {
					return -1;
				}
				if (parseInt(a.weight) > parseInt(b.weight)) {
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
					var $content = widgets[block.widget]();
					if ($content) {
						$wrapper.find('.panel-body').html($content);
					}

				}
				$(block.target).append($wrapper);
			});
		});
	}
})(this, jQuery);
