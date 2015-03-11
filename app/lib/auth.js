var cookieParser = require('cookie-parser');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

module.exports = function (app) {

	var auth = {};
	auth.strategy = function () {
		return new LocalStrategy(function (username, password, done) {
			var conf = app.get('conf');
			app.db.collection('users').find({
				username: username,
				password: app.util.passwordHash(password)
			}).toArray(function (err, result) {
				if (err) {
					console.error(err);
					done(err, null);
				} else {
					if (result.length) {
						done(null, new User(result[0], conf));
					} else {
						done(null, null);
					}
				}
			});
		});
	};

	auth.serialize = function (user, done) {
		done(null, user._id.toString());
	};

	auth.deserialize = function (id, done) {
		var conf = app.get('conf');
		app.db.collection('users').find({_id: app.util.prepareId(id)}).toArray(function (err, result) {
			if (err) {
				done(err, null);
			} else {
				if (result.length) {
					done(null, new User(result[0], conf));
				} else {
					done(null, new User({roles: ['anon']}, conf));
				}
			}
		});
	};

	auth.permissionsMiddleware = function (req, res, next) {
		var conf = app.get('conf');
		if (!req.hasOwnProperty('user')) {
			req.user = new User({roles: ['anon']}, conf);
		}
		var url = req.url.split('/');
		if (url[1] == 'admin') {
			if (req.user.permission('base admin access')) {
				next();
			} else {
				res.send(403, 'access denied');
			}
		} else {
			next();
		}
	};

	auth.ioUserMiddleware = function (socket, next) {
		var conf = app.get('conf');
		var req = {
			headers: {
				cookie: socket.handshake.headers.cookie || ''
			}
		};
		var cookies;
		cookieParser(conf.session.secret)(req, {}, function (err) {
			if (err) {
				console.error(err);
			}
			cookies = req.signedCookies || req.cookies;
		});
		app.sessionStore.get(cookies.session, function (err, session) {
			if (err) {
				console.error(err);
			}
			if (session && session.passport && session.passport.user) {
				auth.deserialize(session.passport.user, function (msg, user) {
					socket.request.user = user;
					next();
				});
			} else {
				socket.request.user = new User({roles: ['anon']}, conf);
				next();
			}
		});
	};

	return auth;
};
