var passport = require('passport');

module.exports = function (app) {
	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

	app.get('/login', function (req, res) {
		if (req.user.hasOwnProperty('_id')) {
			res.redirect('/');
		} else {
			res.renderPage(app.get('coreViewsPath') + '/userlogin');
		}
	});

	app.post('/login', passport.authenticate('local', {failureRedirect: '/login?err=1'}), function (req, res) {
		res.redirect('/');
	});

	app.get('/user/current', function (req, res) {
		delete req.user.password;
		res.send(req.user);
	});

};