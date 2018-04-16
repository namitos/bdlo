const passport = require('passport');
const _ = require('lodash');
const express = require("express");


module.exports = (app) => {
  const auth = require('../lib/auth')(app);
  const router = express.Router();

  router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).send({ name: 'AuthError', err });
      } else if (user && user._id) {
        req.logIn(user, (err) => {
          if (err) {
            return res.status(500).send({ name: 'AuthError', err });
          } else {
            return res.status(200).send({});
          }
        });
      } else {
        return res.status(401).send({ name: 'AuthError', text: 'unauthorized' });
      }
    })(req, res, next);
  });


  router.post('/logout', (req, res, next) => {
    if (req.user._id) {
      app.models.UserToken.c.deleteMany({
        user: req.user._id.toString(),
        value: req.session.id.toString(),
        type: 'session'
      }).catch((err) => console.error(err));
    }
    req.logout();
    res.send({});
  });

  router.post('/register-push', async (req, res) => {
    try {
      if (req.user._id && req.session.id) {
        let { subscription } = req.body;
        let where = {
          user: req.user._id.toString(),
          value: req.session.id.toString(),
          type: 'session'
        };
        let [ut] = await app.models.UserToken.read(where);
        if (ut) {
          await app.models.UserToken.c.updateOne(where, { $set: { subscription } });
        } else {
          let ut = await new app.models.UserToken(Object.assign(where, { subscription })).create();
        }

        res.send({});
      } else {
        res.status(403).send({});
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({});
    }
  });

  app.use('/api/auth', router);



  //@deprecated всё, что ниже




  app.post('/auth/login', passport.authenticate('local', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));

  app.get('/auth/success', (req, res) => {
    res.send({
      result: 'success'
    });
  });

  app.get('/auth/failure', (req, res) => {
    res.send({
      result: 'failure'
    });
  });

  app.get('/auth/logout', (req, res) => {
    if (req.user._id) {
      app.models.UserToken.c.deleteMany({
        user: req.user._id.toString(),
        value: req.session.id.toString(),
        type: 'session'
      }).catch((err) => console.error(err));
    }
    req.logout();
    res.redirect('/');
  });

  app.options('/api/login', (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.send({});
  });

  app.post('/api/login', (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    Promise.resolve()
      .then(() => req.body.username && req.body.password ? true : Promise.reject())
      .then(() => app.models.User.read({
        username: req.body.username,
        password: app.models.User.passwordHash(req.body.password),
        deleted: { $nin: [true] }
      }))
      .then((users) => {
        if (users.length) {
          let user = users[0];
          return new app.models.UserToken({
            user: user._id,
            value: app.models.User.genToken(),
            type: 'api'
          }).create()
        } else {
          return Promise.reject('not found');
        }
      })
      .then((token) => res.send({ token: token.value }))
      .catch((err) => {
        console.error(err);
        res.status(401).send({})
      });
  });

  app.post('/api/logout', auth.expressBearerMiddleware, (req, res) => {
    app.models.UserToken.read({
        value: req.bearerToken,
        type: 'api'
      })
      .then(([userToken]) => app.models.UserToken.c.deleteMany({
        user: userToken.user, //deleteing clones of subscriptions with same values if exists
        subscription: userToken.subscription,
        type: 'api'
      }))
      .then(() => res.send({}))
      .catch((err) => {
        console.error(err);
        res.status(500).send({})
      });
  });

  app.post('/api/register-push', auth.expressBearerMiddleware, (req, res) => {
    app.models.UserToken.c.updateOne({
        value: req.bearerToken,
        type: 'api'
      }, {
        $set: { subscription: req.body.subscription }
      })
      .then(() => res.send({}))
      .catch((err) => {
        console.error(err);
        res.status(500).send({})
      });
  });

  app.io.on('connect', (socket) => {
    socket.on('currentUser', (input, fn) => {
      let user = _.clone(socket.request.user);
      delete user.password;
      user.permissions = socket.request.user.permissions;
      fn(user);
    });
  });
};
