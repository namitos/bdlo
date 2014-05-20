var exec = require("child_process").exec;

module.exports = function (app) {
	if(app.get('env')!='production'){
		var serviceCallback = function (req, res) {
			exec('git pull', function () {
				exec('npm install', function(){
					console.log('process send restart');
					res.send({result: 'ok'});
					process.send({ cmd: 'restart' });
				});
			});
		};
		//app.get('/servicehooks', serviceCallback);
		app.post('/servicehooks', serviceCallback);
	}
};
