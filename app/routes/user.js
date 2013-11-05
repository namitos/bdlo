var passport = require('passport');

var init=function(app){
	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
	});
	app.get('/login', function(req, res){
		res.renderPage('user_login');
	});
	app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
		res.redirect('/');
	});

};

exports.init=init;