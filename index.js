Function.prototype.inspect = function () {
	return this.toString();
};

module.exports = function (input) {
	require('mongodb').MongoClient.connect(input.conf.mongoConnect).then(function (db) {

		var express = require('express');
		var app = express();
		app.db = db;
		app.conf = input.conf;

		var server = require('http').createServer(app);

		app.util = require('./lib/util');

		app.io = require('socket.io')(server);

		input.beforeStart ? input.beforeStart(app) : '';

		var session = require('express-session');
		var SessionStore = require('connect-mongo')(session);
		app.sessionStore = new SessionStore({
			db: app.db
		});

		var auth = require('./lib/auth')(app);

		app.passport = require('passport');
		app.passport.serializeUser(auth.serialize);
		app.passport.deserializeUser(auth.deserialize);

		app.use(require('body-parser').urlencoded({extended: true, limit: '50mb'}));
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
		app.use(express.static(process.env.NODE_ENV == 'development' ? 'static/app' : 'static/app-build'));
		app.use('/files', express.static('static/files'));

		app.passport.use(auth.strategy());
		app.io.use(auth.ioUserMiddleware);

		app.models = {};
		app.models.Model = require('model-server-mongo')(app);//for extending, not for use
		app.models.User = require('./models/User')(app);

		input.dataModels(app);
		require('./crud')(app);
		input.dataMiddlewares(app);
		require('./routes')(app);
		input.routes(app);

		server.listen(process.env.port, function () {
			console.log('Worker ' + process.pid + ' is now listening on port ' + process.env.port + ' in ' + process.env.NODE_ENV + ' mode.');
			input.afterStart(app);
		});
	}).catch(function (err) {
		console.error(err);
	});
};
