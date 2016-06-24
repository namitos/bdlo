Function.prototype.inspect = function () {
	return this.toString();
};

module.exports = function (input) {
	var connect = '';
	if (input.conf.mongo) {
		connect = "mongodb://" + input.conf.mongo.host + ":" + input.conf.mongo.port + "/" + input.conf.mongo.db;
	} else {
		connect = input.conf.mongoConnect;
	}
	require('mongodb').MongoClient.connect(connect).then(function (db) {
		var express = require('express');
		var app = express();
		app.db = db;
		app.conf = input.conf;
		if (!app.conf.hasOwnProperty('staticApp')) {
			app.conf.staticApp = true;
		}
		if (!app.conf.staticAppPath) {
			app.conf.staticAppPath = process.env.NODE_ENV == 'development' ? 'static/app' : 'static/app-build';
		}
		if (!app.conf.hasOwnProperty('canAuth')) {
			app.conf.canAuth = true;
		}

		var server;
		if (app.conf.ssl) {
			var fs = require('fs');
			server = require('https').createServer({
				key: fs.readFileSync(app.conf.ssl.key),
				cert: fs.readFileSync(app.conf.ssl.cert)
			}, app);
		} else {
			server = require('http').createServer(app);
		}

		app.util = require('./lib/util');

		app.io = require('socket.io')(server);

		input.beforeStart ? input.beforeStart(app) : '';

		var session = require('express-session');
		var SessionStore = require('connect-mongo')(session);
		app.sessionStore = new SessionStore({
			db: app.db
		});

		app.use(require('body-parser').urlencoded({extended: true, limit: '50mb'}));

		if (app.conf.canAuth) {
			var auth = require('./lib/auth')(app);

			app.passport = require('passport');
			app.passport.serializeUser(auth.serialize);
			app.passport.deserializeUser(auth.deserialize);

			app.use(require('cookie-parser')());
			app.use(session({
				store: app.sessionStore,
				secret: app.conf.session.secret,
				key: 'session',
				cookie: {maxAge: 604800000},
				resave: true,
				saveUninitialized: true
			}));
			app.use(app.passport.initialize());
			app.use(app.passport.session());

			app.passport.use(auth.strategy());
			app.io.use(auth.ioUserMiddleware);
		}

		if (app.conf.staticApp) {
			app.use(express.static(app.conf.staticAppPath));
		}
		app.use('/files', express.static('static/files'));

		app.models = app.models || {};
		app.models.Model = require('model-server-mongo')(app);//for extending, not for use
		app.models.User = app.models.User || require('./models/User')(app);

		input.dataModels(app);
		require('./crud')(app);
		input.dataMiddlewares(app);
		require('./routes')(app);
		input.routes(app);

		var port = process.env.port || app.conf.port;
		server.listen(port, function () {
			console.log('Worker ' + process.pid + ' is now listening on port ' + port + ' in ' + process.env.NODE_ENV + ' mode.');
			if (input.afterStart) {
				input.afterStart(app);
			}
		});
	}).catch(function (err) {
		console.error(err);
	});
};
