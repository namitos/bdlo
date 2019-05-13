const _ = require('lodash');

module.exports = (app) => {
  return class Tree extends app.models.Model {
    /**
     * @param parent
     * @param branches
     * @param maxDeep
     * @returns {*} all children branches in flat array
     */
    static async branches(parent = '', branches = [], maxDeep = Infinity) {
      --maxDeep;

      let result = await this.read({ parent });
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
    }

    /**
     * @param parent
     * @param branches
     * @param maxDeep
     * @returns {*} all children branches in tree
     */
    static async branchesTree(parent = '', maxDeep = Infinity) {
      --maxDeep;
      let branches = await this.read({ parent });
      if (branches.length === 0) {
        return [];
      }
      let parents = {
        $in: []
      };
      branches.forEach((item) => {
        parents.$in.push(item._id.toString());
      });
      if (maxDeep) {
        let r = await this.branchesTree(parents, maxDeep);
        let rK = _.groupBy(r, 'parent');
        branches.forEach((branch) => {
          branch.children = rK[branch._id] || [];
        });
      }

      return branches;
    }

    /**
     * @param id
     * @param branches
     * @returns {*} array of breadcrumb branches
     */
    static async breadcrumb(id, params, branches = []) {
      if (id) {
        let items = await this.read({ _id: this.prepareIdSingle(id) }, params);
        if (items.length) {
          let item = items[0];
          branches.push(item);
          if (item.parent) {
            return this.breadcrumb(item.parent, params, branches);
          } else {
            return branches.reverse();
          }
        } else {
          return branches.reverse();
        }
      } else {
        return branches;
      }
    }

    /**
     * adds to $in other children ids
     * @param {Object} val
     * @param {Object} val.$in @required
     */
    static async childrenIn(val) {
      if (val && val.$in) {
        val.$in = [...new Set(val.$in.filter((v) => v))];

        let promises = [];
        val.$in.forEach((id) => {
          promises.push(this.branches(id));
        });

        let values = await Promise.all(promises);

        let ids = [];
        values.forEach((value) => {
          ids = ids.concat(value);
        });
        ids = ids.map((branch) => branch._id.toString());
        val.$in = ids.concat(val.$in);
      } else {
        return Promise.reject({ type: 'TreeError', text: 'val.$in argument required' });
      }
    }
  };
};
