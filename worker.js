module.exports = function (conf, callback) {
	var express = require('express.io');
	var app = express();
	var RedisStore = require('connect-redis')(express);
	var passport = require('passport');
	var LocalStrategy = require('passport-local').Strategy;
	var mongodb = require('mongodb');
	var fs = require('fs');
	var vow = require('vow');
	var vowFs = require('vow-fs');
	var drev = require('drev');

	var sessionConfiguration = {
		cookieParser: express.cookieParser,
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

	app.set('env', process.env.hasOwnProperty('NODE_ENV') ? process.env.NODE_ENV : 'production');
	app.set('port', conf.port);
	app.set('views', conf.viewsDir);
	app.set('view cache', conf.viewCache);
	app.set('view engine', 'ejs');
	app.set('conf', conf);


	app.use(express.favicon());

	app.use(express.bodyParser({ limit: '500mb'}));
//app.use(express.json({limit: '500mb'}));
//app.use(express.urlencoded({limit: '500mb'}));

	app.use(express.cookieParser());
	app.use(express.session(sessionConfiguration));
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(express.static(conf.staticPath));

	app.use(function (req, res, next) {
		var url = req.url.split('/');
		res.renderPage = function (template, parameters) {
			if (!parameters) {
				parameters = {};
			}
			parameters.user = req.hasOwnProperty('user') ? req.user : false;
			parameters.conf = conf;
			res.render(template, parameters, function (err, html) {
				res.render(url[1] == 'admin' ? 'admin/page' : 'page', {
					html: html,
					user: req.hasOwnProperty('user') ? req.user : false,
					conf: conf
				});
			});
		};
		next();
	});
	app.use(function (req, res, next) {
		var url = req.url.split('/');
		if (url[1] == 'admin') {
			if (req.hasOwnProperty('user') && req.user.permission('full access')) {
				next();
			} else {
				res.send(403, 'access denied');
			}
		} else {
			next();
		}
	});

	app.http().io();

	app.io.set('heartbeat timeout', 50);
	app.io.set('heartbeat interval', 20);
	app.io.set('browser client minification', true);
	app.io.set('store', new express.io.RedisStore(conf.ioStore));


	app.io.set('authorization', function (data, accept) {
		//console.log(data);
		//console.log(require('passport.socketio').authorize(sessionConfiguration).toString());
		//logger.info('New client (%s) connecting in common mode.', data.headers['x-real-ip']);
		require('passport.socketio').authorize(sessionConfiguration)(data, accept);
	});

	/*app.io.on("connection", function(socket){
	 console.log(socket.handshake.user);
	 });*/

	require('express.io-middleware')(app);
	app.io.use(function (req, next) {
		console.log(req.handshake.user);
		console.log('middleware!!!!!!!!!!!!!');
		next();
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
		routes: routesPromise('./app/routes'),
		projectInfo: vowFs.read('./package.json', 'utf8')
	};
	if (conf.hasOwnProperty('routesAdditionalPath')) {
		promises.routesAdditionalPath = routesPromise(conf.routesAdditionalPath);
	}
	vow.all(promises).then(function (result) {

		var db = result.db;
		app.set('db', db);
		var User = require('./app/models/user');
		passport.use(new LocalStrategy(
			function (username, password, done) {
				console.log('trying', username, password);
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
			console.log('user serialize', user);
			done(null, user._id.toString());
		});
		passport.deserializeUser(function (id, done) {
			console.log('user deserialize', id);
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
		app.set('conf', conf);

		drev.start(conf.session.redis.host, conf.session.redis.port);

		app.listen(app.get('port'));
		if (callback) {
			callback(result);
		}
	});
};

