/** Асинхронный подгрузчик всякого *********************************************/
var load = function (urls, onLoad) {
	var loadPromise = function (url) {
		return new vow.Promise(function (resolve, reject, notify) {
			$.get(url, function (data) {
				var ext = url.split('.');
				ext = ext[ext.length - 1];
				if (ext == 'ejs') {
					data = _.template(data);
				} else if (ext == 'js') {
					var module = {};
					(function (module) {//это сделано для схем, которые также подтягиваются на бекенде и пишутся в module.exports
						eval(data);
					})(module);
					data = module.exports;
				}
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
