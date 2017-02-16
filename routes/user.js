const passport = require('passport');
const _ = require('lodash');

module.exports = (app) => {
  app.get('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

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

  app.post('/auth/login', passport.authenticate('local', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));

  app.io.on('connect', (socket) => {
    socket.on('currentUser', (input, fn) => {
      let user = _.clone(socket.request.user);
      delete user.password;
      user.permissions = socket.request.user.permissions;
      fn(user);
    });
  });
};