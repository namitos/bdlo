const _ = require('lodash');

module.exports = (app) => {
  return (data) => {
    let input = data.input;
    let items = data.items;
    if (!input.connections) {
      return Promise.resolve(data);
    } else {
      let promises = [];
      let modelKeys = Object.keys(input.connections);
      modelKeys.forEach((modelName) => {
        let connection = input.connections[modelName];
        let where = connection.where || {};
        where[connection.r] = {
          $in: _.uniq(_.compact(_.map(items, connection.l)))
        };

        if (connection.r == '_id') {
          where[connection.r] = app.models.Model.prepareId(where[connection.r]);
        } else {
          where[connection.r].$in = where[connection.r].$in.map((id) => {
            return id.toString();
          });
        }
        if (app.crud[modelName] && data.user.crudPermission('read', {
            collection: modelName,
            where: where
          })) {
          promises.push(app.models[modelName].read(where));
        } else {
          promises.push(Promise.reject('access denied'));
        }
      });
      return Promise.all(promises).then((result) => {
        let groups = {};
        result.forEach((items, i) => {
          let modelName = modelKeys[i];
          groups[modelName] = _.groupBy(items, input.connections[modelName].r);
        });
        items.forEach((item) => {
          item.connections = {};
          Object.keys(groups).forEach((modelName) => {
            let connection = input.connections[modelName];
            let key = _.get(item, connection.l);
            item.connections[modelName] = groups[modelName][key] ? groups[modelName][key] : [];
          });
        });
        return data;
      });
    }
  }
};