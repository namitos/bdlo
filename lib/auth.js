const cookieParser = require('cookie-parser');
const LocalStrategy = require('passport-local').Strategy;

module.exports = function (app) {

  let auth = {};
  auth.strategy = function () {
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

  return auth;
};
