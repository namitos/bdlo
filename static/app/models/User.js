define(['underscore'], function () {
	function User(data) {
		_.merge(this, data);
	}

	User.prototype.permission = function (permissionString) {
		return _.contains(this.permissions, permissionString) || _.contains(this.permissions, 'full access');
	};
	return User;
});
