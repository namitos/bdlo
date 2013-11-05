var _ = require('lodash');

var conf = require('../conf');

var User = function (fields) {
	var _this = this;
	for (var key in fields) {
		this[key] = fields[key];
	}
	this.permissions = [];
	this.roles.forEach(function (roleName) {
		conf.roles[roleName].forEach(function (permissionString) {
			_this.permissions.push(permissionString);
		});
	});
	this.permissions = _.unique(this.permissions);
};

User.prototype.permission = function (permissionString) {
	return _.contains(this.permissions, permissionString) || _.contains(this.permissions, 'full access');
};

module.exports = User;