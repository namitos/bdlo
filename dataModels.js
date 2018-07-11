const Model = require('model-server-mongo');
const Session = require('./models/Session');
const Tree = require('./models/Tree');
const User = require('./models/User');
const UserToken = require('./models/UserToken');
module.exports = (app) => {
  app.models = app.models || {};
  app.models.Model = Model(app); //for extending, not for use
  app.models.Session = Session(app);
  app.models.Tree = Tree(app);
  app.models.User = User(app);
  app.models.UserToken = UserToken(app);
}