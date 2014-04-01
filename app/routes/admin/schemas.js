module.exports = function (app) {
	app.get('/admin/schemas', function (request, response) {
		response.renderPage('admin/schemas/main');
	});
};