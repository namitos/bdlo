module.exports = (input) => {
  let connect = '';
  if (input.conf.mongo) {
    connect = "mongodb://" + input.conf.mongo.host + ":" + input.conf.mongo.port + "/" + input.conf.mongo.db;
  } else {
    connect = input.conf.mongoConnect;
  }
  require('mongodb').MongoClient.connect(connect).then((db) => {
    let express = require('express');
    let app = express();

    app.db = db;
    app.conf = input.conf;

    let server;
    if (app.conf.ssl) {
      let fs = require('fs');
      server = require('https').createServer({
        key: fs.readFileSync(app.conf.ssl.key),
        cert: fs.readFileSync(app.conf.ssl.cert)
      }, app);
    } else {
      server = require('http').createServer(app);
    }

    app.io = require('socket.io')(server);

    if (input.beforeStart) {
      input.beforeStart(app);
    }

    if (!app.conf.hasOwnProperty('canAuth')) {
      app.conf.canAuth = true;
    }
    if (app.conf.canAuth) {
      let session = require('express-session');
      //let SessionStore = require('connect-mongo')(session);

      class SessionStore extends session.Store {
        constructor(settings) {
          super(...arguments);
        }

        async get(sid, fn) {
          let [session] = await app.models.Session.read({ sid })
          fn(null, session && session.data);
        }

        async set(sid, data, fn) {
          let [session] = await app.models.Session.read({ sid });
          if (session) {
            await session.updateQuery({ $set: { data } });
          } else {
            session = await new app.models.Session({ sid, data }).create();
          }
          fn();
        }

        async touch(sid, sess, fn) {
          let [session] = await app.models.Session.read({ sid });
          await session.updateQuery({ $set: { 'data.cookie': sess.cookie } });
          fn();
        }

        async destroy(sid, fn) {
          let [session] = await app.models.Session.read({ sid });
          await session.delete();
          fn();
        }
      }

      app.sessionStore = new SessionStore({ db: app.db });

      let bodyParser = require('body-parser');
      app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
      app.use(bodyParser.json({ limit: '50mb' }));

      let auth = require('./lib/auth')(app);

      app.passport = require('passport');
      app.passport.serializeUser(auth.serialize);
      app.passport.deserializeUser(auth.deserialize);

      app.use(session({
        store: app.sessionStore,
        secret: app.conf.session.secret,
        key: app.conf.session.key || 'session',
        cookie: {
          maxAge: app.conf.session.maxAge || 604800000,
          domain: app.conf.authSubdomains && app.conf.domain ? `.${app.conf.domain}` : null
        },
        resave: false,
        saveUninitialized: false,
        rolling: true
      }));
      app.use(app.passport.initialize());
      app.use(app.passport.session());
      app.use((req, res, next) => {
        req.user = req.user || new app.models.User({ roles: ['anon'] });
        next();
      });
      app.passport.use(auth.localStrategy());
      app.io.use(auth.ioUserMiddleware);
    }

    if (app.conf.staticAppPath) {
      app.use(express.static(app.conf.staticAppPath));
    }
    if (app.conf.staticFilesPath) {
      app.use('/files', express.static(app.conf.staticFilesPath));
    }


    require('./dataModels')(app);
    input.dataModels(app);
    require('./lib/crud')(app);
    input.dataMiddlewares(app);
    require('./routes')(app);
    input.routes(app);

    let port = process.env.port || app.conf.port;
    server.listen(port, () => {
      console.log('Worker ' + process.pid + ' is now listening on port ' + port + ' in ' + process.env.NODE_ENV + ' mode.');
      if (input.afterStart) {
        input.afterStart(app);
      }
    });
  }).catch((err) => {
    console.error(err);
  });
};