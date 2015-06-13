var os = require('os');
var fs = require('fs');
var cluster = require('cluster');
var exec = require('child_process').exec;
var colors = require('colors');
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'production';
}


/**
 *
 * @param callback {Function}
 */
function clearPids(pidsDir, callback) {
	fs.readdir(pidsDir, function (err, files) {
		if (err) {
			fs.mkdir(pidsDir, function () {
				callback();
			});
		} else {
			var promises = [];
			files.forEach(function (file) {
				promises.push(new Promise(function (resolve, reject, notify) {
					exec('kill ' + file, function (error, stdout, stderr) {
						fs.unlink(pidsDir + '/' + file, function (err) {
							resolve();
						});
					});
				}));
			});
			Promise.all(promises).then(function () {
				callback();
			});
		}
	});
}
/**
 *
 * @param conf {Object}
 * @param middlewares {Function}
 */
module.exports = function (conf, middlewares) {
	conf.pidsDir = conf.pidsDir || './pids';

	if (cluster.isMaster) {
		var ports = {};
		var startPort = conf.port;

		clearPids(conf.pidsDir, function () {
			fs.writeFile(conf.pidsDir + '/' + process.pid, 'master', function (err) {
			});
			var maxWorkers = conf.maxWorkers && conf.maxWorkers <= os.cpus().length ? conf.maxWorkers : os.cpus().length;
			console.log(('maxWorkers: ' + maxWorkers).yellow);
			for (var i = 0; i < maxWorkers; ++i) {
				var newWorker = cluster.fork({
					port: startPort
				});
				ports[newWorker.process.pid] = startPort;
				++startPort;
			}
			console.log('pids:ports', ports);
			cluster.on('exit', function (worker, address) {
				fs.unlink(conf.pidsDir + '/' + worker.process.pid, function (err) {
				});
				var port = ports[worker.process.pid];
				delete ports[worker.process.pid];
				console.log(('Worker ' + worker.process.pid + ' died.').red, address);
				var newWorker = cluster.fork({
					port: port
				});
				ports[newWorker.process.pid] = port;
				console.log('pids:ports', ports);
			});

			cluster.on('listening', function (worker, address) {
				fs.writeFile(conf.pidsDir + '/' + worker.process.pid, '', function (err) {
				});
				console.log(('Worker ' + worker.process.pid + ' is now listening on port ' + address.port + ' in ' + process.env.NODE_ENV + ' mode.').green);
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
		require('./worker')(conf, middlewares);
	}
};
