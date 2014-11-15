module.exports = function (app) {
	app.get('/admin/schemas', function (req, res) {
		res.renderPage(app.get('coreViewsPath') + '/admin/schemas/main');
	});
	app.get('/admin/schemas/available', function(req, res){
		res.send(app.get('conf').editableSchemas);
	});
};
