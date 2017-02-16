'use strict';

const _ = require('lodash');

module.exports = (app) => {
  return class Tree extends app.models.Model {

    /**
     * @param parent
     * @param branches
     * @param maxDeep
     * @returns {*} all children branches in flat array
     */
    static branches(parent = '', branches = [], maxDeep = Infinity) {
      --maxDeep;
      return this.read({
        parent: parent
      }).then((result) => {
        if (result.length) {
          branches = branches.concat(result);
          let parents = {
            $in: []
          };
          result.forEach((item) => {
            parents.$in.push(item._id.toString());
          });
          if (maxDeep) {
            return this.branches(parents, branches, maxDeep);
          } else {
            return branches;
          }
        } else {
          return branches;
        }
      });
    }

    /**
     * @param id
     * @param branches
     * @returns {*} array of breadcrumb branches
     */
    static breadcrumb(id, branches = []) {
      if (id) {
        return this.read({
          _id: this.prepareIdSingle(id)
        }).then((items) => {
          if (items.length) {
            let item = items[0];
            branches.push(item);
            if (item.parent) {
              return this.breadcrumb(item.parent, branches);
            } else {
              return branches.reverse();
            }
          } else {
            return branches.reverse();
          }
        });
      } else {
        return Promise.resolve(branches);
      }
    }

    static childrenIn(val) {
      if (val && val.$in) {
        val.$in = _(val.$in).uniq().compact().value();

        let promises = [];
        val.$in.forEach((id) => {
          promises.push(this.branches(id));
        });
        return Promise.all(promises).then((values) => {
          let ids = [];
          values.forEach((value) => {
            ids = ids.concat(value);
          });
          ids = ids.map((branch) => branch._id.toString());
          val.$in = _(ids.concat(val.$in)).uniq().compact().value();
        })
      } else {
        return Promise.reject();
      }
    }
  }
};
