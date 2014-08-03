/** Асинхронный подгрузчик всякого *********************************************/
(function (global, $) {
	global.load = function (urls, onLoad) {
		var loadPromise = function (input) {
			return new vow.Promise(function (resolve, reject, notify) {
				var traverse = {};
				var url;
				if (typeof input == 'string') {
					url = input;
				} else {
					traverse = input;
					url = traverse.url;
				}
				$.get(url, function (data) {
					var ext = url.split('.');
					ext = ext[ext.length - 1];
					if (ext == 'ejs') {
						data = _.template(data);
					} else if (ext == 'js') {
						var module = {
							exports: {}
						};
						function define(cb){
							cb({}, {}, module);
						}
						(function (module) {
							eval(data);
						})(module);
						data = module.exports;
					}
					var toResolve;
					if (traverse.hasOwnProperty('url')) {
						toResolve = traverse;
						toResolve.result = data;
					} else {
						toResolve = data;
					}
					resolve(toResolve);
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
})(this, jQuery);
