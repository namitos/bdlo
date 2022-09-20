const apiAw = require('../lib/apiAw');
const express = require('express');

module.exports = (app) => {
  //read
  app.get(
    '/api/crud/:collection',
    apiAw(async (req, res) => {
      let user = req.user;
      let input = JSON.parse(req.query.q);
      input.collection = req.params.collection;

      if (!app.crud[input.collection] || !user.crudPermission('read', input)) {
        throw { name: 'CrudError', text: 'access denied' };
      }

      if (input.where._id) {
        input.where._id = app.models.Model.prepareId(input.where._id);
      }
      let data = await app.crud[input.collection].r.run({
        req,
        user,
        input,
        model: app.crud[input.collection].model
      });
      res.send(input.count ? { itemsCount: data.itemsCount } : data.items);
    })
  );

  //read tree breadcrumb
  app.get(
    '/api/crud/:collection/breadcrumb/:id',
    apiAw(async (req, res) => {
      let user = req.user;
      let input = JSON.parse(req.query.q);
      input.collection = req.params.collection;
      let id = req.params.id;

      if (!app.crud[input.collection] || !app.models[input.collection].breadcrumb || !user.crudPermission('read', input)) {
        throw { name: 'CrudError', text: 'access denied' };
      }

      let items = await app.models[input.collection].breadcrumb(id);
      res.send(items);
    })
  );

  //create
  app.post(
    '/api/crud/:collection',
    apiAw(async (req, res) => {
      let user = req.user;
      let input = { data: req.body };
      input.collection = req.params.collection;

      if (!app.crud[input.collection] || !user.crudPermission('create', input)) {
        throw { name: 'CrudError', text: 'access denied' };
      }

      try {
        let data = await app.crud[input.collection].c.run({
          req,
          user,
          input,
          item: new app.crud[input.collection].model(input.data)
        });
        res.send(data.item);
      } catch (err) {
        if (err && err.code === 11000) {
          throw { name: 'CrudError', text: 'duplicate key' };
        } else {
          throw { name: 'CrudError', error: err };
        }
      }
    })
  );

  //update
  app.put(
    '/api/crud/:collection',
    apiAw(async (req, res) => {
      let user = req.user;
      let input = { data: req.body };
      input.collection = req.params.collection;

      if (!app.crud[input.collection] || !user.crudPermission('update', input)) {
        throw { name: 'CrudError', text: 'access denied' };
      }

      try {
        let data = await app.crud[input.collection].u.run({
          req,
          user,
          input,
          item: new app.crud[input.collection].model(input.data)
        });
        res.send(data.item);
      } catch (err) {
        if (err && err.code === 11000) {
          throw { name: 'CrudError', text: 'duplicate key' };
        } else {
          throw { name: 'CrudError', error: err };
        }
      }
    })
  );

  //delete
  app.delete(
    '/api/crud/:collection/:id',
    apiAw(async (req, res) => {
      let user = req.user;
      let id = req.params.id;
      let input = { where: { _id: id } };
      input.collection = req.params.collection;

      if (!app.crud[input.collection] || !user.crudPermission('update', input)) {
        throw { name: 'CrudError', text: 'access denied' };
      }

      let data = await app.crud[input.collection].d.run({
        req,
        user,
        input,
        item: new app.crud[input.collection].model({ _id: id })
      });
      res.send(data.deleted);
    })
  );
};
