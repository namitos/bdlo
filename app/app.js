var express = require('express.io');
var app = express();
var RedisStore = require('connect-redis')(express);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongodb = require('mongodb');
var fs = require('fs');
var logger = require('winston');
var os = require('os');
var cluster = require('cluster');
var vow = require('vow');

var conf = require('./conf');

var sessionConfiguration={
	cookieParser: express.cookieParser,
	store: new RedisStore({ host: conf.session.redis.host, port: conf.session.redis.port, ttl: 604800 }),
	secret: conf.session.secret,
	key: 'session',
	cookie: { maxAge: 604800000 },
	fail:function(data, accept){
		accept(null, true);
	},
	success:function(data, accept){
		accept(null, true);
	}
};

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'info', colorize: true, timestamp: true });
logger.info('--------------------');
logger.info('process.env.NODE_ENV', process.env.NODE_ENV);

app.set('port', conf.port);
app.set('views', conf.viewsDir);
app.set('view cache', conf.viewCache);
app.set('view engine', 'ejs');

app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session(sessionConfiguration));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/../static'));
app.use(function (req, res, next) {
	res.renderPage = function (template, parameters) {
		res.render(template, parameters, function (err, html) {
			res.render('page', {
				html: html,
				user: req.hasOwnProperty('user')?req.user:false
			});
		});
	};
	next();
});
app.use(function (req, res, next) {
	var url=req.url.split('/');
	if(url[1]=='admin'){
		if(req.hasOwnProperty('user') && req.user.permission('full access')){
			next();
		}else{
			res.send(403 ,'access denied');
		}
	}else{
		next();
	}
});

app.http().io();

app.io.set('heartbeat timeout', 50);
app.io.set('heartbeat interval', 20);
app.io.set('browser client minification', true);
app.io.set('store', new express.io.RedisStore(conf.ioStore));

/*app.io.set('authorization', function (data, accept) {
	require('passport.socketio').authorize(sessionConfiguration)(data, accept);
});*/

/*require('express.io-middleware')(app);
app.io.use(function (req, next) {
	console.log('middleware');
	next();
});*/

logger.info('Initialized io');


var mongoConnectPromise = function () {
	return new vow.Promise(function(resolve, reject, notify) {
		mongodb.MongoClient.connect(conf.mongoConnect, function (err, db) {
			if (err) {
				reject(err);
			}
			app.set('db', db);

			//MMMMM, SPAGHETTI!
			var User = require('./models/user');
			passport.use(new LocalStrategy(
				function (username, password, done) {
					console.log('trying', username, password);
					password = require('crypto').createHash('sha512').update(password).digest("hex");
					db.collection('users').find({username: username, password:password}).toArray(function(err, result){
						if(err){
							done(err, null);
						}else{
							if(result.length){
								console.log('user exists');
								done(null, new User(result[0]));
							}else{
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
				db.collection('users').find({_id: new mongodb.ObjectID(id)}).toArray(function(err, result){
					if(err){
						done(err, null);
					}else{
						if(result.length){
							done(null, new User(result[0]));
						}else{
							console.log('user not exists');
							done(null, null);
						}
					}
				});
			});

			logger.info('Mongo connected');
			resolve();
		});
	});
};


var routesPromise = function () {
	return new vow.Promise(function(resolve, reject, notify){
		fs.readdir('./routes', function (err, files) {
			if (err) {
				reject(err);
			}
			files.forEach(function (file) {
				require('./routes/' + file).init(app);
			});
			logger.info('Routes loaded');
			resolve();
		});
	});
};


vow.all([mongoConnectPromise(), routesPromise()]).then(function (results) {
	if (cluster.isMaster) {
		var CPUsCount = os.cpus().length;
		for (var i = 0; i < CPUsCount; ++i) {
			cluster.fork();
		}
		cluster.on('listening', function (worker, address) {
			logger.info('Worker %d is now listening on port %d in %s mode.', worker.process.pid, address.port,
				app.get('env'));
		});
		cluster.on('exit', function (worker) {
			logger.info('Worker %d died.', worker.process.pid);
			cluster.fork();
		});
	} else {
		app.listen(app.get('port'));
	}
});