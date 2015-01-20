var Middleware = function () {
	this.fns = [];
};

Middleware.prototype.use = function (fn) {
	this.fns.push(fn);
};

Middleware.prototype.run = function (data, fn) {
	var fns = this.fns;
	function run(i) {
		if (fns.length > 0) {
			fns[i](data, function (err) {
				if (err) return fn(err);
				if (!fns[i + 1]) return fn(null);
				run(i + 1);
			});
		} else {
			return fn(null);
		}

	}

	run(0);
}

module.exports = Middleware;