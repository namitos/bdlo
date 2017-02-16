'use strict';

const crypto = require('crypto');
const _ = require('lodash');

module.exports = function (app) {
  return class User extends app.models.Model {
    static get schema() {
      return {
        name: 'User',
        safeDelete: true,
        updatePatch: true,
        type: 'object',
        properties: {
          username: {
            label: 'Логин',
            type: 'string',
            required: true
          },
          password: {
            label: 'Пароль',
            type: 'string'
          },
          roles: {
            label: 'Роли',
            type: 'array',
            items: {
              required: true,
              allowEmpty: false,
              type: 'string',
              widget: 'select',
              options: {
                admin: 'Администратор системы',
                contentmanager: 'Контент-менеджер'
              }
            }
          },
          deleted: {
            type: 'boolean',
            label: 'Удалено'
          }
        }
      }
    }

    constructor(properties) {
      super(properties);

      if (!this.hasOwnProperty('roles')) {
        this.roles = [];
      }
      let permissions = [];
      this.roles.forEach(function (roleName) {
        if (app.conf.roles.hasOwnProperty(roleName)) {
          app.conf.roles[roleName].forEach(function (permissionString) {
            permissions.push(permissionString);
          });
        }
      });
      if (this.hasOwnProperty('_id') && app.conf.roles.registered) {
        app.conf.roles.registered.forEach(function (permissionString) {
          permissions.push(permissionString);
        });
      }
      Object.defineProperty(this, 'permissions', {
        value: _.uniq(permissions)
      });
    }

    static passwordHash(password) {
      return crypto.createHash('sha512').update(password).digest("hex");
    }

    static genPassword() {
      return this.passwordHash(Math.random().toString()).substr(0, 10);
    }

    permission(permissionString) {
      return _.includes(this.permissions, permissionString) || _.includes(this.permissions, 'full access');
    }

    crudPermission(op, input) {
      let op2perm = {
        create: 'write',
        read: 'read',
        update: 'write',
        'delete': 'write'
      };
      return this.permission(input.collection + ' ' + op2perm[op]) || this.permission(input.collection + ' ' + op2perm[op] + ' his') && (() => {
          let ModelSchema = app.models[input.collection].schema;
          if (ModelSchema.ownerField) {
            let ownerField = ModelSchema.ownerField;
            if (op == 'create' || op == 'update') {
              input.data = input.data || {};
              input.data[ownerField] = this._id.toString();
            }
            if (op == 'read' || op == 'update' || op == 'delete') {
              input.where = input.where || {};
              input.where[ownerField] = this._id.toString();
            }
            console.log('user.crudPermission patched', op, input);
            return true;
          } else {
            return false;
          }
        })();
    }
  }
};