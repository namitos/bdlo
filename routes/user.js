var passport = require('passport');
var _ = require('lodash');

module.exports = function (app) {
	app.get('/auth/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

	app.get('/auth/success', function (req, res) {
		res.send({
			result: 'success'
		});
	});

	app.get('/auth/failure', function (req, res) {
		res.send({
			result: 'failure'
		});
	});

	app.post('/auth/login', passport.authenticate('local', {
		successRedirect: '/auth/success',
		failureRedirect: '/auth/failure'
	}));

	app.io.on('connect', function (socket) {
		socket.on('currentUser', function (input, fn) {
			var user = _.clone(socket.request.user);
			delete user.password;
			user.permissions = socket.request.user.permissions;
			fn(user);
		});
	});

};