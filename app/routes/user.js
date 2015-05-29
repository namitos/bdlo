var passport = require('passport');
var _ = require('lodash');

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
		console.error("don't use /user/current ajax route. it's deprecated. use currentUser socket");
		res.send(req.user);
	});

	app.io.on('connect', function (socket) {
		socket.on('currentUser', function (input, fn) {
			var user = _.clone(socket.request.user);
			delete user.password;
			fn(user);
		});
	});

};