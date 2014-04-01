var os = require('os');
var fs = require('fs');
var cluster = require('cluster');
var exec = require("child_process").exec;
var vow = require('vow');

var conf = require('./conf');


function clearPids(callback) {
	var killPromise = function (pid) {
		return new vow.Promise(function(resolve, reject, notify) {
			exec('kill ' + pid, function (error, stdout, stderr) {
				console.log('kill ' + pid, error, stdout, stderr);
				fs.unlink('./pids/' + pid, function (err) {
					console.log('delete ' + pid);
					resolve();
					if (err) {
						console.log(err);
					}
				});
			});
		});
	};
	fs.readdir('./app/pids', function (err, files) {
		if (err) {
			console.log(err);
			fs.mkdir('pids', function(){
				callback();
			});
		}else{
			var promises = [];
			files.forEach(function (file) {
				if(file!='donotdelete'){
					promises.push(killPromise(file));
				}
			});
			vow.all(promises).then(function () {
				callback();
			});
		}
	});

}

if (cluster.isMaster) {
	clearPids(function () {
		fs.writeFile('./app/pids/' + process.pid, 'master', function (err) {});
		var CPUsCount = os.cpus().length;
		for (var i = 0; i < CPUsCount; ++i) {
			cluster.fork();
		}
		cluster.on('exit', function (worker) {
			fs.unlink('./app/pids/' + worker.process.pid, function (err) {});
			console.log('Worker ' + worker.process.pid + ' died.');
			cluster.fork();
		});

		cluster.on('listening', function (worker, address) {
			fs.writeFile('./app/pids/' + worker.process.pid, '', function (err) {});
			console.log('Worker ' + worker.process.pid + ' is now listening on port ' + address.port + ' in ' + process.env.NODE_ENV + ' mode.');
			worker.on('message', function (msg) {
				if(msg.cmd=='restart'){
					console.log('restart all children instances');
					Object.keys(cluster.workers).forEach(function(id) {
						cluster.workers[id].kill();
					});
				}
			});
		});
	});
} else {
	require('./app/worker')(conf);
}
