(function (context) {
	function User(data) {
		_.merge(this, data);
	}

	User.prototype.permission = function (permission) {
		if (this.hasOwnProperty('permissions')) {
			for (var key in this.permissions) {
				if (this.permissions[key] == permission) {
					return true;
				}
			}
		}
		return false;
	};
	context.User = User;
})(this);