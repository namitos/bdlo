module.exports = function (conf, modifyApp) {
	var express = require('express');
	var app = express();
	var server = require('http').createServer(app);

	require('./app/lib/util')(app);
	require('./app/lib/crud')(app);

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

	var cookieParser = require('cookie-parser');
	var auth = require('./app/lib/auth')(app);

	app.io.use(auth.ioUserMiddleware);

	var passport = require('passport');
	var LocalStrategy = require('passport-local').Strategy;
	passport.use(new LocalStrategy(auth.auth));
	passport.serializeUser(auth.serialize);
	passport.deserializeUser(auth.deserialize);

	var mongodb = require('mongodb');
	var fs = require('fs');
	var vow = require('vow');
	var vowFs = require('vow-fs');

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
	}

	app.set('conf', conf);
	app.set('corePath', __dirname);
	app.set('env', process.env.NODE_ENV);
	app.set('views', conf.viewsPath);
	app.set('view cache', conf.viewCache);
	app.engine('ejs', require('consolidate').lodash);
	app.set('view engine', 'ejs');
	app.set('coreViewsPath', __dirname + '/static/views');

	var middleWares = [
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
			fn: cookieParser()
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
			fn: passport.initialize()
		},
		{
			key: 'passportSession',
			fn: passport.session()
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

	if (modifyApp) {
		modifyApp(app, middleWares);
	}

	middleWares.forEach(function (obj) {
		if (obj.hasOwnProperty('url')) {
			app.use(obj.url, obj.fn);
		} else {
			app.use(obj.fn);
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
		routesCore: routesPromise(__dirname + '/app/routes'),
		projectInfo: vowFs.read('./package.json', 'utf8')
	};
	if (conf.hasOwnProperty('routesPath')) {
		promises.routes = routesPromise(conf.routesPath);
	}

	vow.all(promises).then(function (result) {
		app.get('*', function (req, res) {
			res.renderPage(app.get('coreViewsPath') + '/staticpage', {
				title: '404',
				page: {
					content: 'Not found'
				}
			});
		});

		app.db = result.db;
		app.set('db', app.db);//@TODO remove

		app.set('projectInfo', JSON.parse(result.projectInfo));
		server.listen(process.env.port, function () {
		});
	});
};

