const crypto = require('crypto');
const nodemailer = require('nodemailer');
const nodemailerDirectTransport = require('nodemailer-direct-transport');
const fetchdata = require('fetchdata');

module.exports = function(app) {
  return class User extends app.models.Model {
    static get schema() {
      return {
        name: 'User',
        safeDelete: true,
        updatePatch: true,
        type: 'object',
        properties: {
          created: {
            type: 'integer'
          },
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
      this.roles.forEach(function(roleName) {
        if (app.conf.roles.hasOwnProperty(roleName)) {
          app.conf.roles[roleName].forEach(function(permissionString) {
            permissions.push(permissionString);
          });
        }
      });
      if (this.hasOwnProperty('_id') && app.conf.roles.registered) {
        app.conf.roles.registered.forEach(function(permissionString) {
          permissions.push(permissionString);
        });
      }
      Object.defineProperty(this, 'permissions', {
        value: [...new Set(permissions)]
      });
    }

    create() {
      this.created = new Date().valueOf();
      return super.create(...arguments);
    }

    static passwordHash(password) {
      return crypto.createHash('sha512').update(password).digest("hex");
    }

    static genPassword() {
      return this.passwordHash(Math.random().toString()).substr(0, 10);
    }

    static genToken() {
      return this.passwordHash(Math.random().toString()) + this.passwordHash(Math.random().toString()) + this.passwordHash(Math.random().toString()) + this.passwordHash(Math.random().toString());
    }

    permission(permissionString) {
      return this.permissions.includes(permissionString) || this.permissions.includes('full access');
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
          if (op === 'create' || op === 'update') {
            input.data = input.data || {};
            input.data[ownerField] = this._id.toString();
          }
          if (op === 'read' || op === 'update' || op === 'delete') {
            input.where = input.where || {};
            input.where[ownerField] = this._id.toString();
          }
          //console.log('user.crudPermission patched', op, input);
          return true;
        } else {
          return false;
        }
      })();
    }

    notifyEmail(subject, message) {
      return new Promise((resolve, reject) => {
        try {
          let transport;
          if (app.conf.mail.direct) {
            transport = nodemailerDirectTransport({
              name: app.conf.domain,
              from: app.conf.mail.fromName
            });
          } else {
            transport = app.conf.mail;
          }
          nodemailer.createTransport(transport).sendMail({
            from: app.conf.mail.fromName,
            to: this.username,
            subject: subject,
            html: message,
            dkim: app.conf.mail.dkim
          }, (err, info) => {
            if (err) {
              resolve({ type: 'NotifyEmailError', err });
            } else {
              resolve(info);
            }
          });
        } catch (err) {
          resolve({ type: 'NotifyEmailError', err });
        }
      });
    }

    async notifyPush(subject, message) {
      let items = await app.models.UserToken.read({
        user: this._id.toString()
      });

      let promises = [];


      items.forEach((item) => {
        if (item.subscription) {
          promises.push(fetchdata({
            urlFull: "https://fcm.googleapis.com/fcm/send",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `key=${app.conf.firebase.apiServerKey}`
            },
            body: JSON.stringify({
              notification: {
                title: subject,
                body: message,
                sound: 'default'
                //click_action: "https://blabla.com"
              },
              //data: {foo: 'bar'},
              to: item.subscription
            }),
            method: 'POST'
          }).catch((err) => {
            return err;
            //todo remove bad subscriptions
          }));
        }
      })

      let r = await Promise.all(promises);
      return r;
    }
  }
};