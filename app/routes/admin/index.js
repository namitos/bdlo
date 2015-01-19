module.exports = function (app) {
	app.get('/admin/schemas', function (req, res) {
		res.renderPage(app.get('coreViewsPath') + '/admin/schemas/main');
	});
};
