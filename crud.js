'use strict';

const util = require('util');
const Queue = require('queue');

module.exports = (app) => {
  let base64FilesMiddleware = require('./dataMiddlewares/base64Files')(app.conf.fileUpload);
  let connectionsMiddleware = require('./dataMiddlewares/connections')(app);

  function c(data) {
    return data.item.create().then(() => data);
  }

  function r(data) {
    if (data.input.count) {
      return data.model.count(data.input.where).then((itemsCount) => {
        data.items = [];//for backward compatibility
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
    })
  }

  let crud = {};
  let c2m = {};//collections to models mapping
  Object.keys(app.models).forEach((modelName) => {
    let Model = app.models[modelName];
    if (Model.schema) {
      crud[modelName] = {
        model: Model,
        c: new Queue(base64FilesMiddleware, c),
        r: new Queue(r, connectionsMiddleware),
        u: new Queue(base64FilesMiddleware, u),
        d: new Queue(d)
      };
      if (!Model.schema.name) {
        throw new Error(`schema.name of ${modelName} is required!`);
      }
      c2m[Model.schema.name] = modelName;
    }
  });

  app.crud = crud;


  app.io.on('connect', (socket) => {
    socket.on('data:create', (input, fn) => {
      input.collection = c2m[input.collection];
      if (app.crud[input.collection] && socket.request.user.crudPermission('create', input)) {
        app.crud[input.collection].c.run({
          socket: socket,
          user: socket.request.user,
          input: input,
          item: new app.crud[input.collection].model(input.data)
        }).then((data) => {
          fn(data.item);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    socket.on('data:read', (input, fn) => {
      input.collection = c2m[input.collection];
      input.where = input.where || {};
      if (app.crud[input.collection] && socket.request.user.crudPermission('read', input)) {
        if (input.where._id) {
          input.where._id = app.models.Model.prepareId(input.where._id);
        }
        app.crud[input.collection].r.run({
          socket: socket,
          user: socket.request.user,
          input: input,
          model: app.crud[input.collection].model
        }).then((data) => {
          fn(data.items);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    socket.on('data:update', (input, fn) => {
      input.collection = c2m[input.collection];
      if (app.crud[input.collection] && socket.request.user.crudPermission('update', input)) {
        app.crud[input.collection].u.run({
          socket: socket,
          user: socket.request.user,
          input: input,
          item: new app.crud[input.collection].model(input.data)
        }).then((data) => {
          fn(data.item);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    socket.on('data:delete', (input, fn) => {
      input.collection = c2m[input.collection];
      if (app.crud[input.collection] && socket.request.user.crudPermission('delete', input)) {
        app.crud[input.collection].d.run({
          socket: socket,
          user: socket.request.user,
          input: input,
          item: new app.crud[input.collection].model(input.data)
        }).then((data) => {
          fn(data.deleted);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    //todo remove copypaste
    socket.on('data:count', (input, fn) => {
      input.collection = c2m[input.collection];
      input.where = input.where || {};
      if (app.crud[input.collection] && socket.request.user.crudPermission('read', input)) {
        if (input.where._id) {
          input.where._id = app.models.Model.prepareId(input.where._id);
        }
        input.count = true;
        app.crud[input.collection].r.run({
          socket: socket,
          user: socket.request.user,
          input: input,
          model: app.crud[input.collection].model
        }).then((data) => {
          fn(data.itemsCount);
        }).catch((err) => {
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    socket.on('data:breadcrumb', (input, fn) => {
      input.collection = c2m[input.collection];
      input.where = input.where || {};
      if (
        app.models[input.collection] &&
        app.models[input.collection].breadcrumb &&
        socket.request.user.crudPermission('read', input)
      ) {
        app.models[input.collection].breadcrumb(input.where._id).then((items) => {
          fn(items);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        });
      } else {
        fn({
          error: 'access denied'
        });
      }
    });

    socket.on('data:schemas', (input, fn) => {
      let schemasAvailable = {};
      Object.keys(app.models).forEach((modelName) => {
        if (
          app.models[modelName].schema/* &&
         socket.request.user.crudPermission('read', {collection: modelName})*/
        ) {
          schemasAvailable[modelName] = app.models[modelName].schema;
        }
      });
      fn(util.inspect(schemasAvailable, {depth: null}));
    });

    //experimental functionality
    socket.on('data:aggregate', (input, fn) => {
      if (
        app.models[input.collection] &&
        socket.request.user.permission('full access')
      ) {
        app.models[input.collection].c.aggregate(input.where).toArray().then((result) => {
          fn(result);
        }).catch((err) => {
          console.error(err);
          fn({
            error: err
          });
        })
      } else {
        fn({
          error: 'access denied'
        });
      }
    });
  });
};
