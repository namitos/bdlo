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
			res.renderPage(app.get('adminViewsPath') + '/userlogin');
		}
	});

	app.post('/login', passport.authenticate('local', { failureRedirect: '/login?err=1' }), function (req, res) {
		res.redirect('/');
	});

	app.get('/userscript', function (req, res) {
		var user = {};
		if (req.hasOwnProperty('user')) {
			var user = req.user;
			delete user.password;
		}
		res.header({'Content-Type': 'application/javascript'});
		res.send("var user = new User(" + JSON.stringify(user) + "); try{ module.exports = user; } catch(e) {}");
	});

};