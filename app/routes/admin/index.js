module.exports = function (app) {
	app.get('/admin/schemas', function (request, response) {
		response.renderPage(app.get('adminViewsPath') + '/admin/schemas/main');
	});
};
