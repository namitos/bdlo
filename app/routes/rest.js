var mongodb = require('mongodb');
var _ = require('lodash');
var vow = require('vow');
var vowFs = require('vow-fs');

var conf = require('../conf');


function getSchema(collectionName){
	var schema = false;
	try{
		schema = require('../../static/schemas/'+collectionName);
	}catch(e){
		console.log(e);
	}
	return schema;
}
function autoType(obj){
    var digitValue;
    for(var key in obj){
        if(typeof obj[key]=='string'){
            digitValue=parseInt(obj[key]);
            if(obj[key]==digitValue.toString()){
                obj[key]=digitValue;
            }
        }else{
            autoType(obj[key]);
        }
    }
}

function isFile(str){
	if(!str){
		return false;
	}
	var a = str.substr(0, 5);
	if(a.indexOf('data:')!=-1){
		return true;
	}else{
		return false;
	}
}
function saveFilePromise(schemaPart, input){
	return new vow.Promise(function(resolve, reject, notify) {
		var promises=[];
		for(var i=0; i<input.length; ++i){
			if(isFile(input[i])){
				var matches = input[i].split(';base64,');
				var data = matches[1];
				var mime = matches[0].replace('data:', '');
				if(_.contains(schemaPart.info.mimes, mime)){
					var buf = new Buffer(data, 'base64');
					var fileName = require('crypto').createHash('sha512').update(data+(new Date()).valueOf()).digest("hex")+'.'+conf.fileUpload.mimes[mime];
					var fileDir = [
						conf.fileUpload.storages.filesystem[schemaPart.info.storage.access],
						schemaPart.info.storage.path
					].join('/');
					var filePath = [fileDir, fileName].join('/');
					var fileDirWrite = [conf.staticPath, fileDir].join('/');
					var filePathWrite = [fileDirWrite, fileName].join('/');
					promises.push(vowFs.write(filePathWrite, buf));
					input[i] = filePath;
				}else{
					input[i] = null;
					var promise=new vow.Promise(function(resolve, reject, notify){
						reject('mime type incorrect');
					});
					promises.push(promise);
				}
			}else{
				var promise=new vow.Promise(function(resolve, reject, notify){
					resolve('not changed(sended url of file) or not base64 of file');
				});
				promises.push(promise);
			}
		}
		vow.allResolved(promises).then(function(result){
			resolve(result);
		});
	});


}
function prepareFilesPromises(schema, obj) {
	var promises = [];
	for (var fieldName in schema.properties) {
		if (
			schema.properties[fieldName].type == 'any' &&
			schema.properties[fieldName].hasOwnProperty('info') &&
			schema.properties[fieldName].info.type == 'file' &&
			obj.hasOwnProperty(fieldName)
		) {
			obj[fieldName] = _.compact(obj[fieldName]);
			promises.push(saveFilePromise(schema.properties[fieldName], obj[fieldName]));
		} else if (
			schema.properties[fieldName].type == 'object' &&
			obj.hasOwnProperty(fieldName)
		) {
			prepareFilesPromises(schema.properties[fieldName], obj[fieldName]).forEach(function (promise) {
				promises.push(promise);
			});
		} else if (schema.properties[fieldName].type == 'array') {
			//@TODO: make array processing
		}
	}
	return promises;
}
function prepareFiles(schema, obj, callback){
	if(schema){
		vow.allResolved(prepareFilesPromises(schema, obj)).then(function(result){
			callback(result);
		});
	}else{
		callback([]);
	}
}
function prepareFilesMiddleware(req, res, next){
	prepareFiles(getSchema(req.params.collection), req.body, function(result){
		console.log('prepare files', JSON.stringify(result, ' ', 4));
		next();
	});
}



exports.init = function (app) {
	app.get('/admin/rest/:collection', function (request, response) {
		var db = app.get('db');
		if (request.query.hasOwnProperty('_id')) {
			request.query._id = new mongodb.ObjectID(request.query._id.toString());
		}
		var fields = [];
		if(request.query.hasOwnProperty('fields')){
			fields = request.query.fields;
			delete request.query.fields;
		}
		var optionKeys = ['skip', 'limit', 'sort'];
		var options = {};
		optionKeys.forEach(function (key) {
			options[key] = request.query[key];
			delete request.query[key];
		});
		autoType(request.query);
		db.collection(request.params.collection).find(request.query, fields, options).toArray(function (err, result) {
			response.send(result);
		});
	});

	app.delete('/admin/rest/:collection/:id', function (request, response) {
		var db = app.get('db');
		db.collection(request.params.collection).remove({ "_id": new mongodb.ObjectID(request.params.id) }, function (err, numRemoved) {
			if (err) {
				response.status(500).send();
			} else {
				response.status(200).send({ "_id": request.params.id });
			}
		});
	});

	app.put('/admin/rest/:collection/:id', prepareFilesMiddleware, function (request, response) {
		var db = app.get('db');
		if (request.body.hasOwnProperty('_id')) {
			delete request.body._id;
		}
		db.collection(request.params.collection).update({
			"_id": new mongodb.ObjectID(request.params.id)
		}, {
			"$set": request.body
		}, function (error, results) {
			if (error) {
				response.status(500).send();
			} else {
				request.body._id = request.params.id;
				response.status(200).send(request.body);
			}
		});
	});

	app.post('/admin/rest/:collection', prepareFilesMiddleware, function (request, response) {
		var db = app.get('db');
		if (request.body.hasOwnProperty('_id')) {
			delete request.body._id;
		}
		db.collection(request.params.collection).insert(request.body, function (err, results) {
			if (err) {
				response.status(500).send();
			} else {
				response.status(200).send(results[0]);
			}
		});
	});
};