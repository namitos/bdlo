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