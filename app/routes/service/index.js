var exec = require("child_process").exec;
var crypto = require('crypto');

module.exports = function (app) {
	if (app.get('env') != 'production') {
		app.post('/servicehooks', function (req, res) {
			exec('git pull', function () {
				exec('npm install', function () {
					console.log('process send restart');
					res.send({result: 'ok'});
					process.send({ cmd: 'restart' });
				});
			});
		});
		app.get('/init', function (req, res) {
			var db = app.get('db');
			db.collection('users').remove(function () {
				db.collection('users').insert({
					username: 'admin',
					password: crypto.createHash('sha512').update('123').digest("hex"),
					roles: ['admin']
				}, function (err, docs) {
					res.send(docs);
				});
			});

		});
	}
};
