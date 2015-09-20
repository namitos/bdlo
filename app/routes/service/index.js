var exec = require("child_process").exec;

module.exports = function (app) {
	if (app.get('env') != 'production') {
		app.post('/servicehooks', function (req, res) {
			exec('git pull', function () {
				exec('npm install', function () {
					console.log('process send restart');
					res.send({result: 'ok'});
					process.send({cmd: 'restart'});
				});
			});
		});
		app.get('/init', function (req, res) {
			var db = app.get('db');
			db.collection('users').find().toArray().then(function (result) {
				if (result.length == 0) {
					db.collection('users').insertOne({
						username: 'admin',
						password: app.util.passwordHash('123'),
						roles: ['admin']
					}).then(function (docs) {
						res.send(docs);
					}).catch(function (err) {
						console.error(err);
					});
				} else {
					console.log('пользователи уже есть')
				}


			}).catch(function (err) {
				console.error(err);
			});

		});
	}
};
