module.exports = function (conf, callback) {
	var express = require('express');
	var app = express();
	var server = require('http').createServer(app);

	app.io = require('socket.io')(server);

	var session = require('express-session');
	var RedisStore = require('connect-redis')(session);
	var passport = require('passport');
	var LocalStrategy = require('passport-local').Strategy;
	var mongodb = require('mongodb');
	var fs = require('fs');
	var vow = require('vow');
	var vowFs = require('vow-fs');
	var drev = require('drev');

	var sessionConfiguration = {
		store: new RedisStore({ host: conf.session.redis.host, port: conf.session.redis.port, ttl: 604800 }),
		secret: conf.session.secret,
		key: 'session',
		cookie: { maxAge: 604800000 },
		fail: function (data, accept) {
			accept(null, true);
		},
		success: function (data, accept) {
			accept(null, true);
		}
	};

	app.set('conf', conf);
	app.set('env', process.env.hasOwnProperty('NODE_ENV') ? process.env.NODE_ENV : 'production');
	app.set('views', conf.viewsPath);
	app.set('view cache', conf.viewCache);
	app.engine('ejs', require('consolidate').lodash);
	app.set('view engine', 'ejs');
	app.set('adminViewsPath', __dirname + '/static/views');


	app.use(require('body-parser')({ limit: '500mb'}));
	app.use(require('cookie-parser')());
	app.use(session(sessionConfiguration));
	app.use(passport.initialize());
	app.use(passport.session());

	app.use('/core', express.static(__dirname + '/static'));
	app.use('/static', express.static(conf.staticPath));

	app.use(function (req, res, next) {
		var url = req.url.split('/');
		res.renderPage = function (template, parameters) {
			if (!parameters) {
				parameters = {};
			}
			parameters.user = req.hasOwnProperty('user') ? req.user : false;
			parameters.conf = conf;
			res.render(template, parameters, function (err, html) {
				res.render(url[1] == 'admin' ? app.get('adminViewsPath') + '/admin/page' : 'page', {
					html: html,
					user: req.hasOwnProperty('user') ? req.user : false,
					conf: conf
				});
			});
		};
		next();
	});

	var User = require('./app/models/user');
	app.use(function (req, res, next) {
		if (!req.hasOwnProperty('user')){
			req.user = new User({roles:['anon']}, conf);
		}
		var url = req.url.split('/');
		if (url[1] == 'admin') {
			if (req.user.permission('full access')) {
				next();
			} else {
				res.send(403, 'access denied');
			}
		} else {
			next();
		}
	});

	function mongoConnectPromise(connectionString) {
		return new vow.Promise(function (resolve, reject, notify) {
			var MongoClient = mongodb.MongoClient;
			MongoClient.connect(connectionString, function (err, db) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					resolve(db);
				}
			});
		});
	}

	function routesPromise(path) {
		return new vow.Promise(function (resolve, reject, notify) {
			fs.readdir(path, function (err, files) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					files.forEach(function (file) {
						require(path + '/' + file)(app);
					});
					resolve(files);
				}
			});
		});
	}

	var promises = {
		db: mongoConnectPromise(conf.mongoConnect),
		routes: routesPromise(__dirname + '/app/routes'),
		projectInfo: vowFs.read('./package.json', 'utf8')
	};
	if (conf.hasOwnProperty('routesPath')) {
		promises.routesPath = routesPromise(conf.routesPath);
	}
	vow.all(promises).then(function (result) {
		var db = result.db;
		app.set('db', db);
		passport.use(new LocalStrategy(
			function (username, password, done) {
				//console.log('trying', username, password);
				password = require('crypto').createHash('sha512').update(password).digest("hex");
				db.collection('users').find({username: username, password: password}).toArray(function (err, result) {
					if (err) {
						done(err, null);
					} else {
						if (result.length) {
							console.log('user exists');
							done(null, new User(result[0], conf));
						} else {
							console.log('user not exists');
							done(null, null);
						}
					}
				});
			}
		));
		passport.serializeUser(function (user, done) {
			//console.log('user serialize', user);
			done(null, user._id.toString());
		});
		passport.deserializeUser(function (id, done) {
			//console.log('user deserialize', id);
			db.collection('users').find({_id: new mongodb.ObjectID(id)}).toArray(function (err, result) {
				if (err) {
					done(err, null);
				} else {
					if (result.length) {
						done(null, new User(result[0], conf));
					} else {
						console.log('user not exists');
						done(null, null);
					}
				}
			});
		});

		app.set('projectInfo', JSON.parse(result.projectInfo));

		drev.start(conf.session.redis.host, conf.session.redis.port);

		server.listen(process.env.port, function () {
		});
	});
};

