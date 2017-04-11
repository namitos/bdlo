const cookieParser = require('cookie-parser');
const LocalStrategy = require('passport-local').Strategy;
const BearerStrategy = require("passport-http-bearer");

module.exports = function (app) {

  let auth = {};
  auth.localStrategy = function () {
    return new LocalStrategy((username, password, done) => {
      app.models.User.read({
        username: username,
        password: app.models.User.passwordHash(password),
        deleted: {
          $nin: [true]
        }
      }).then((users) => {
        if (users.length) {
          done(null, users[0]);
        } else {
          done(null, null);
        }
      }).catch((err) => {
        console.error('error', err);
        done(err, null);
      });
    });
  };

  auth.bearerStrategy = function () {
    return new BearerStrategy((token, done) => {
      app.models.UserToken.read({
        value: token
      })
        .then((tokens) => tokens.length ? app.models.User.byId(tokens[0].user) : Promise.reject())
        .then((user) => done(null, user, {scope: 'all'}))
        .catch((err) => {
          console.error(err);
          done(null, false);
        })
    })
  };

  auth.serialize = function (user, done) {
    done(null, user._id.toString());
  };

  auth.deserialize = function (id, done) {
    app.models.User.read({
      _id: app.models.User.prepareIdSingle(id),
      deleted: {
        $nin: [true]
      }
    }).then((users) => {
      if (users.length) {
        done(null, users[0]);
      } else {
        done(null, new app.models.User({roles: ['anon']}));
      }
    }).catch(function (err) {
      console.error(err);
      done(null, new app.models.User({roles: ['anon']}));
    });
  };

  auth.ioUserMiddleware = function (socket, next) {
    let req = {
      headers: {
        cookie: socket.handshake.headers.cookie || ''
      }
    };
    cookieParser(app.conf.session.secret)(req, {}, (err) => {
      if (err) {
        console.error('error', err);
      }
      let cookies = req.signedCookies || req.cookies;
      app.sessionStore.get(cookies[app.conf.session.key || 'session'], (err, session) => {
        if (err) {
          console.error('error', err);
        }
        if (session && session.passport && session.passport.user) {
          auth.deserialize(session.passport.user, (msg, user) => {
            socket.request.user = user;
            next();
          });
        } else {
          socket.request.user = new app.models.User({roles: ['anon']});
          next();
        }
      });
    });
  };

  auth.expressBearerMiddleware = function (req, res, next) {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.send({});
    } else {
      app.passport.authenticate('bearer', {session: false})(req, res, function () {
        req.bearerToken = req.headers.authorization.split(' ')[1];
        app.models.UserToken.c.updateOne({//update lifetime
          value: req.bearerToken
        }, {
          $set: {created: new Date().valueOf()}
        }).catch((err) => console.error('err', err));
        next(...arguments);
      });
    }
  };

  return auth;
};
