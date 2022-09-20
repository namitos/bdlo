const passport = require('passport');
const apiAw = require('../lib/apiAw');

module.exports = (app) => {
  app.post('/api/auth/login', (req, res, next) => {
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

  app.post(
    '/api/auth/logout',
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
};
