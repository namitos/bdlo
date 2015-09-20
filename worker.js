module.exports = function (conf, modifyApp) {
	Function.prototype.inspect = function () {
		return this.toString();
	};

	if (!process.env.NODE_ENV) {
		process.env.NODE_ENV = 'production';
	}

	var express = require('express');
	var app = express();
	var server = require('http').createServer(app);

	app.util = require('./app/lib/util');

	app.io = require('socket.io')(server);
	app.io.adapter(require('socket.io-redis')({
		host: conf.session.redis.host,
		port: conf.session.redis.port
	}));

	app.redis = require("redis").createClient(conf.session.redis.port, conf.session.redis.host, {
		return_buffers: true
	});
	app.ioEmitter = require('socket.io-emitter')(app.redis);

	var session = require('express-session');
	var RedisStore = require('connect-redis')(session);
	app.sessionStore = new RedisStore({
		client: app.redis
	});

	var auth = require('./app/lib/auth')(app);

	app.passport = require('passport');
	app.passport.serializeUser(auth.serialize);
	app.passport.deserializeUser(auth.deserialize);

	var mongodb = require('mongodb');
	var fs = require('fs');
	var vow = require('vow');

	app.response.__proto__.renderPage = function (template, parameters) {
		if (!parameters) {
			parameters = {};
		}
		var res = this;
		var req = res.req;
		var url = req.url.split('/');
		parameters.user = req.hasOwnProperty('user') ? req.user : false;
		parameters.conf = conf;
		res.render(template, parameters, function (err, html) {
			var title = parameters.hasOwnProperty('title') ? parameters.title : '';
			var h1Title = parameters.hasOwnProperty('h1Title') ? parameters.h1Title : title;
			var toRender = {
				html: html,
				user: req.hasOwnProperty('user') ? req.user : false,
				conf: conf,
				title: title,
				h1Title: h1Title,
				seoContent: '',
				seoKeywords: '',
				seoDescription: '',
				url: req.url
			};
			if (res.seo) {
				toRender.title = res.seo.title;
				toRender.h1Title = res.seo.h1Title;
				toRender.seoContent = res.seo.content;
				toRender.seoKeywords = res.seo.keywords;
				toRender.seoDescription = res.seo.description;
			}
			res.render(url[1] == 'admin' ? app.get('coreViewsPath') + '/admin/page' : 'page', toRender);
		});
	};

	app.conf = conf;
	app.set('conf', conf);
	app.set('corePath', __dirname);
	app.set('env', process.env.NODE_ENV);
	app.set('views', conf.viewsPath);
	app.set('view cache', conf.viewCache);
	app.engine('ejs', require('consolidate').lodash);
	app.set('view engine', 'ejs');
	app.set('coreViewsPath', __dirname + '/static/views');

	var middlewares = [
		{
			key: 'bodyParserJson',
			fn: require('body-parser').json({limit: '500mb'})
		},
		{
			key: 'bodyParserUrlencoded',
			fn: require('body-parser').urlencoded({extended: true, limit: '50mb'})
		},
		{
			key: 'cookieParser',
			fn: require('cookie-parser')()
		},
		{
			key: 'session',
			fn: session({
				store: app.sessionStore,
				secret: conf.session.secret,
				key: 'session',
				cookie: {maxAge: 604800000},
				resave: true,
				saveUninitialized: true
			})
		},
		{
			key: 'passportInitialize',
			fn: app.passport.initialize()
		},
		{
			key: 'passportSession',
			fn: app.passport.session()
		},
		{
			key: 'coreStatic',
			fn: express.static(__dirname + '/static'),
			url: '/core'
		},
		{
			key: 'static',
			fn: express.static(conf.staticPath),
			url: '/static'
		},
		{
			key: 'permissions',
			fn: auth.permissionsMiddleware
		},
		{
			key: 'seo',
			fn: function (req, res, next) {
				var db = app.get('db');
				db.collection('seo').find({
					route: req.url.split('?')[0]
				}).toArray(function (err, result) {
					if (result.length > 0) {
						res.seo = result[0];
					}
					next();
				});
			}
		},
		{
			key: 'pages',
			fn: function (req, res, next) {
				var db = app.get('db');
				db.collection('pages').find({
					route: req.url.split('?')[0]
				}).toArray(function (err, result) {
					if (result.length > 0) {
						res.renderPage(app.get('coreViewsPath') + '/staticpage', {
							title: result[0].title,
							h1Title: result[0].title,
							page: result[0]
						});
					} else {
						next();
					}
				});
			}
		}
	];

	var middlewaresIo = [
		{
			key: 'ioUserMiddleware',
			fn: auth.ioUserMiddleware
		}
	];

	var middlewaresPassport = [
		{
			key: 'local',
			fn: auth.strategy()
		}
	];

	function mongoConnectPromise(connectionString) {
		return new vow.Promise(function (resolve, reject, notify) {
			var MongoClient = mongodb.MongoClient;
			MongoClient.connect(connectionString, function (err, db) {
				if (err) {
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
					reject(err);
				} else {
					var paths = [];
					files.forEach(function (file) {
						paths.push(path + '/' + file);
					});
					resolve(paths);
				}
			});
		});
	}

	var promises = {
		db: mongoConnectPromise(conf.mongoConnect),
		routesCore: routesPromise(__dirname + '/app/routes')
	};
	if (conf.hasOwnProperty('routesPath')) {
		promises.routes = routesPromise(conf.routesPath);
	}

	vow.all(promises).then(function (result) {
		app.db = result.db;
		app.set('db', app.db);//@TODO remove

		var Crud = require('./app/lib/crud');
		app.crud = new Crud(app.db, conf);

		if (modifyApp) {
			modifyApp(app, middlewares, middlewaresIo, middlewaresPassport);
		}

		middlewaresPassport.forEach(function (obj) {
			app.passport.use(obj.fn);
		});
		middlewares.forEach(function (obj) {
			if (obj.hasOwnProperty('url')) {
				app.use(obj.url, obj.fn);
			} else {
				app.use(obj.fn);
			}
		});
		middlewaresIo.forEach(function (obj) {
			app.io.use(obj.fn);
		});

		result.routesCore.forEach(function (path) {
			require(path)(app);
		});
		if (result.routes) {
			result.routes.forEach(function (path) {
				require(path)(app);
			});
		}
		app.get('*', function (req, res) {
			res.renderPage(app.get('coreViewsPath') + '/staticpage', {
				title: '404',
				page: {
					content: 'Not found'
				}
			});
		});
		server.listen(process.env.port, function () {
		});
	}, function (err) {
		console.error(err);
	});
};
