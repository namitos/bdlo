const Model = require('model-server-mongo');
const Tree = require('./models/Tree');
const User = require('./models/Tree');
const UserToken = require('./models/Tree');
module.exports = (app) => {
  app.models = app.models || {};
  app.models.Model = Model(app); //for extending, not for use
  app.models.Tree = Tree(app);
  app.models.User = User(app);
  app.models.UserToken = UserToken(app);
}