const Queue = require('queue');

module.exports = (app) => {
  function c(data) {
    return data.item.create().then(() => data);
  }

  function r(data) {
    if (data.input.count) {
      return data.model.count(data.input.where).then((itemsCount) => {
        data.items = new app.models.Model.Collection(); //for backward compatibility
        data.itemsCount = itemsCount;
        return data;
      });
    } else {
      return data.model.read(data.input.where, data.input.options).then((items) => {
        data.items = items;
        return data;
      });
    }
  }

  function u(data) {
    return data.item.update(data.input.where).then(() => data);
  }

  function d(data) {
    return data.item.delete(data.input.where).then((deleted) => {
      data.deleted = deleted;
      return data;
    });
  }

  let crud = {};
  let c2m = {}; //collections to models mapping
  Object.keys(app.models).forEach((modelName) => {
    let Model = app.models[modelName];
    if (Model.schema) {
      crud[modelName] = {
        model: Model,
        c: new Queue(c),
        r: new Queue(r),
        u: new Queue(u),
        d: new Queue(d)
      };
      if (!Model.schema.name) {
        throw new Error(`schema.name of ${modelName} is required!`);
      }
      c2m[Model.schema.name] = modelName;
    }
  });

  app.crud = crud;
};
