'use strict';

module.exports = (app) => {
  return class Session extends app.models.Model {
    static get schema() {
      return {
        type: 'object',
        name: 'Session',
        properties: {
          sid: {
            type: 'string'
          },
          data: {
            type: 'any'
          }
        }
      }
    }
  }
};