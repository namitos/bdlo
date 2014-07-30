module.exports = function (app) {
	app.get('/admin/schemas', function (request, response) {
		response.renderPage(app.get('coreViewsPath') + '/admin/schemas/main');
	});
};
