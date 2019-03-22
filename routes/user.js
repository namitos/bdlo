const passport = require('passport');
const express = require('express');
const apiAw = require('../lib/apiAw');

module.exports = (app) => {
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

  router.post(
    '/logout',
    apiAw(async (req, res) => {
      app.models.UserToken.c
        .deleteMany({
          user: req.user._id.toString(),
          value: req.session.id.toString(),
          type: 'session'
        })
        .catch((err) => console.error(err));
      req.logout();
      res.send({});
    }, true)
  );

  router.post(
    '/register-push',
    apiAw(async (req, res) => {
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
    }, true)
  );

  app.use('/api/auth', router);
};
