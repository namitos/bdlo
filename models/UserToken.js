'use strict';

module.exports = (app) => {
  return class UserToken extends app.models.Model {
    static get schema() {
      return {
        type: 'object',
        name: 'UserToken',
        properties: {
          created: {
            type: 'integer'
          },
          user: {
            type: 'string'
          },
          value: {
            type: 'string'
          },
          subscription: {
            type: 'string'
          },
          userAgent: {
            type: 'string'
          },
          type: {//session or api
            type: 'string'
          }
        }
      }
    }

    create() {
      this.created = new Date().valueOf();
      return super.create(...arguments);
    }
  }
};