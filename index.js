var os = require('os');
var fs = require('fs');
var cluster = require('cluster');
var exec = require('child_process').exec;
var vow = require('vow');

function clearPids(callback) {
	var killPromise = function (pid) {
		return new vow.Promise(function (resolve, reject, notify) {
			exec('kill ' + pid, function (error, stdout, stderr) {
				console.log('kill ' + pid, error, stdout, stderr);
				fs.unlink('./pids/' + pid, function (err) {
					console.log('delete ' + pid);
					resolve();
				});
			});
		});
	};
	fs.readdir('./pids', function (err, files) {
		if (err) {
			fs.mkdir('pids', function () {
				callback();
			});
		} else {
			var promises = [];
			files.forEach(function (file) {
				promises.push(killPromise(file));
			});
			vow.all(promises).then(function () {
				callback();
			});
		}
	});

}

module.exports = function (conf) {
	if (cluster.isMaster) {
		var ports = {};
		var maxPort = conf.port;

		clearPids(function () {
			fs.writeFile('./pids/' + process.pid, 'master', function (err) {
			});
			var CPUsCount = os.cpus().length;
			for (var i = 0; i < CPUsCount; ++i) {
				var newWorker = cluster.fork({
					port: maxPort
				});
				ports[newWorker.process.pid] = maxPort;
				++maxPort;
			}
			console.log('pids:ports', ports);
			cluster.on('exit', function (worker, address) {
				fs.unlink('./pids/' + worker.process.pid, function (err) {
				});
				var port = ports[worker.process.pid];
				delete ports[worker.process.pid];
				console.log('Worker ' + worker.process.pid + ' died.', address);
				var newWorker = cluster.fork({
					port: port
				});
				ports[newWorker.process.pid] = port;
				console.log('pids:ports', ports);
			});

			cluster.on('listening', function (worker, address) {
				fs.writeFile('./pids/' + worker.process.pid, '', function (err) {
				});
				console.log('Worker ' + worker.process.pid + ' is now listening on port ' + address.port + ' in ' + process.env.NODE_ENV + ' mode.');
				worker.on('message', function (msg) {
					if (msg.cmd == 'restart') {
						console.log('restart all children instances');
						Object.keys(cluster.workers).forEach(function (id) {
							cluster.workers[id].kill();
						});
					}
				});
			});
		});
	} else {
		require('./worker')(conf);
	}
}
