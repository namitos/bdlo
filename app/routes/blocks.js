var _ = require('lodash');

module.exports = function (app) {
	function matchBlock(pathname, block) {
		if(block.hasOwnProperty('urls') && block.urls.length>0){
			if(_.contains(block.urls, pathname)){
				if (block.urlsType == 'exclude') {
					return false;
				}else{
					return true;
				}
			}else{
				//@TODO:сделать проверку на неточные адреса типа /users/*

			}
		}else{
			return true;
		}
	}

	app.get('/blocks', function (req, res) {
		var db = app.get('db');
		db.collection('blocks').find().toArray(function (err, blocks) {
			var result = [];
			blocks.forEach(function (block) {
				if (matchBlock(req.query.pathname, block)) {
					result.push(block);
				}
			});
			res.send(result);
		});
	});
};