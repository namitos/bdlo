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

		if (input.beforeStart) {
			input.beforeStart(app);
		}

		if (!app.conf.hasOwnProperty('canAuth')) {
			app.conf.canAuth = true;
		}
		if (app.conf.canAuth) {
			var session = require('express-session');
			var SessionStore = require('connect-mongo')(session);
			app.sessionStore = new SessionStore({
				db: app.db
			});

			var bodyParser = require('body-parser');
			app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
			app.use(bodyParser.json());

			var auth = require('./lib/auth')(app);

			app.passport = require('passport');
			app.passport.serializeUser(auth.serialize);
			app.passport.deserializeUser(auth.deserialize);

			app.use(require('cookie-parser')());
			app.use(session({
				store: app.sessionStore,
				secret: app.conf.session.secret,
				key: 'session',
				cookie: {maxAge: app.conf.session.maxAge || 604800000},
				resave: false,
				saveUninitialized: false,
				rolling: true
			}));
			app.use(app.passport.initialize());
			app.use(app.passport.session());
			app.use((req, res, next) => {
				req.user = req.user || new app.models.User({roles: ['anon']});
				next();
			});
			app.passport.use(auth.strategy());
			app.io.use(auth.ioUserMiddleware);
		}

		if (app.conf.staticAppPath) {
			app.use(express.static(app.conf.staticAppPath));
		}
		if (app.conf.staticFilesPath) {
			app.use('/files', express.static(app.conf.staticFilesPath));
		}

		app.models = app.models || {};
		app.models.Model = require('model-server-mongo')(app);//for extending, not for use
		app.models.Tree = require('./models/Tree')(app);

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
