var passport = require('passport');

module.exports = function(app){
	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
	});
	app.get('/login', function(req, res){
		if(req.hasOwnProperty('user')){
			res.redirect('/');
		}else{
			res.renderPage('userlogin');
		}
	});
	app.post('/login', passport.authenticate('local', { failureRedirect: '/login?err=1' }), function(req, res){
		res.redirect('/');
	});
};