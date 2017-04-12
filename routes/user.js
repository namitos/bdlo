const passport = require('passport');
const _ = require('lodash');
const express = require("express");


module.exports = (app) => {
  const auth = require('../lib/auth')(app);

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
    app.models.UserToken.c.deleteMany({
      user: req.user._id.toString(),
      value: req.session.id.toString(),
      type: 'session'
    }).catch((err) => console.error(err));

    req.logout();
    res.redirect('/');
  });

  app.post('/auth/register-push', (req, res) => {
    if (req.user._id && req.session.id) {
      let where = {
        user: req.user._id.toString(),
        value: req.session.id.toString(),
        type: 'session'
      };
      app.models.UserToken.read(where)
        .then((items) => {
          if (items.length) {
            return items[0];
          } else {
            new app.models.UserToken(where).create();
          }
        })
        .then((item) => app.models.UserToken.c.updateOne(where, {
          $set: {subscription: req.body.subscription}
        }))
        .then(() => res.send({}))
        .catch((err) => {
          console.error(err);
          res.status(500).send({});
        })
    } else {
      res.status(401).send({});
    }
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
        deleted: {$nin: [true]}
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
      .then((token) => res.send({token: token.value}))
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
        user: userToken.user,//deleteing clones of subscriptions with same values if exists
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
      $set: {subscription: req.body.subscription}
    })
      .then(() => res.send({}))
      .catch((err) => {
        console.error(err);
        res.status(500).send({})
      });
  });

  app.get('/firebase-messaging-sw.js', (req, res) => {
    if (app.conf.firebase && app.conf.firebase.public) {
      res.set('Content-Type', 'application/javascript');
      res.send(`
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-messaging.js');
firebase.initializeApp({
  messagingSenderId: "${app.conf.firebase.public.messagingSenderId}"
});
const messaging = firebase.messaging();
console.log('messaging azaza', messaging);
messaging.setBackgroundMessageHandler((payload) => {
  console.log('Received background message', payload);
  const notificationOptions = {
    body: '123',
    icon: '/theme/logo-big.png'
  };
  return self.registration.showNotification('title', notificationOptions);
});`);
    } else {
      res.status(404).send();
    }

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