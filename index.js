const express = require('express');
const fs = require('fs');
const mongoConnect = require('./lib/mongoConnect');

module.exports = async (input) => {
  let { db } = await mongoConnect({ mongo: input.conf.mongo });
  let app = express();
  app.db = db;
  app.conf = input.conf;

  let server;
  if (app.conf.ssl) {
    server = require('https').createServer(
      {
        key: fs.readFileSync(app.conf.ssl.key),
        cert: fs.readFileSync(app.conf.ssl.cert)
      },
      app
    );
  } else {
    server = require('http').createServer(app);
  }

  if (input.beforeStart) {
    input.beforeStart(app);
  }

  if (!app.conf.hasOwnProperty('canAuth')) {
    app.conf.canAuth = true;
  }
  if (app.conf.canAuth) {
    let session = require('express-session');
    class SessionStore extends session.Store {
      constructor() {
        super(...arguments);
      }

      async get(sid, fn) {
        try {
          let [session] = await app.models.Session.read({ sid });
          fn(null, session && session.data);
        } catch (err) {
          fn(err);
        }
      }

      async set(sid, data, fn) {
        try {
          let [session] = await app.models.Session.read({ sid });
          if (session) {
            await session.updateQuery({ $set: { data } });
          } else {
            session = await new app.models.Session({ sid, data }).create();
          }
          fn();
        } catch (err) {
          fn(err);
        }
      }

      async touch(sid, sess, fn) {
        try {
          let [session] = await app.models.Session.read({ sid });
          await session.updateQuery({ $set: { 'data.cookie': sess.cookie } });
          fn();
        } catch (err) {
          fn(err);
        }
      }

      async destroy(sid, fn) {
        try {
          let [session] = await app.models.Session.read({ sid });
          await session.delete();
          fn();
        } catch (err) {
          fn(err);
        }
      }
    }

    app.sessionStore = new SessionStore();

    app.use(require('cookie-parser')());
    let bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(bodyParser.json({ limit: '50mb' }));

    let auth = require('./lib/auth')(app);

    app.passport = require('passport');
    app.passport.serializeUser(auth.serialize);
    app.passport.deserializeUser(auth.deserialize);

    app.use(
      session({
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
      })
    );
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
  if (input.dataModels) {
    input.dataModels(app);
  }
  require('./lib/crud')(app);
  if (input.dataMiddlewares) {
    input.dataMiddlewares(app);
  }
  if (input.dataMiddleware) {
    input.dataMiddleware(app);
  }
  require('./routes')(app);
  if (input.routes) {
    input.routes(app);
  }

  let port = process.env.port || app.conf.port;
  server.listen(port, () => {
    console.log(`Worker ${process.pid} is now listening on port ${port} in ${process.env.NODE_ENV} mode.`);
    if (input.afterStart) {
      input.afterStart(app);
    }
  });
};
