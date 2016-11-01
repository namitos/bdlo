var cookieParser = require('cookie-parser');
var LocalStrategy = require('passport-local').Strategy;

module.exports = function (app) {

	var auth = {};
	auth.strategy = function () {
		return new LocalStrategy(function (username, password, done) {
			app.models.User.read({
				username: username,
				password: app.util.passwordHash(password),
				deleted: {
					$nin: [true]
				}
			}).then(function (users) {
				if (users.length) {
					done(null, users[0]);
				} else {
					done(null, null);
				}
			}).catch(function (err) {
				console.error('error', err);
				done(err, null);
			});
		});
	};

	auth.serialize = function (user, done) {
		done(null, user._id.toString());
	};

	auth.deserialize = function (id, done) {
		app.models.User.read({
			_id: app.models.User.prepareIdSingle(id),
			deleted: {
				$nin: [true]
			}
		}).then(function (users) {
			if (users.length) {
				done(null, users[0]);
			} else {
				done(null, new app.models.User({roles: ['anon']}));
			}
		}).catch(function (err) {
			console.error(err);
			done(null, new app.models.User({roles: ['anon']}));
		});
	};

	auth.ioUserMiddleware = function (socket, next) {
		var req = {
			headers: {
				cookie: socket.handshake.headers.cookie || ''
			}
		};
		var cookies;
		cookieParser(app.conf.session.secret)(req, {}, function (err) {
			if (err) {
				console.error('error', err);
			}
			cookies = req.signedCookies || req.cookies;
		});
		app.sessionStore.get(cookies.session, function (err, session) {
			if (err) {
				console.error('error', err);
			}
			if (session && session.passport && session.passport.user) {
				auth.deserialize(session.passport.user, function (msg, user) {
					socket.request.user = user;
					next();
				});
			} else {
				socket.request.user = new app.models.User({roles: ['anon']});
				next();
			}
		});
	};

	return auth;
};
