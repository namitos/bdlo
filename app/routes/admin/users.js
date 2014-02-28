exports.init=function(app){
	app.get('/admin/users', function(request, response){
		response.renderPage('admin/users/main');
	});
};