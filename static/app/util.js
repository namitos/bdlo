'use strict';

define(function () {
	return {
		notify: function (data) {
			var $wrapper = $('#notifications');
			if (!$wrapper.length) {
				$('body').append("<div id='notifications'></div>");
				$wrapper = $('#notifications');
			}
			var $el = $("<div style='opacity:0' class='alert alert-" + data.tag + "'><button type='button' class='close' data-dismiss='alert'>×</button><strong>" + data.title + "</strong><p>" + data.body + "</p></div>");
			$wrapper.append($el);
			$el.css({
				opacity: 1
			});
			$el.on('click', '.close', function () {
				$el.remove();
			});
			if (data.hide) {
				setTimeout(function () {
					$el.remove();
				}, data.hide);
			}
		},
		load: function(toLoad, cb) {
			var toLoad1 = [];
			for (var key in toLoad) {
				toLoad1.push(toLoad[key]);
			}
			require(toLoad1, function () {
				var i = 0;
				var schemas = {};
				for (var key in toLoad) {
					schemas[key] = arguments[i];
					++i;
				}
				cb(schemas);
			});
		}
	}
});