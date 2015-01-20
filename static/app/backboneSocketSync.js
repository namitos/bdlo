'use strict'

define(['backboneCore'], function (Backbone) {
	Backbone.sync = function (method, model, options) {
		options.parse = false;
		var promise = new Promise(function (resolve, reject) {
			var toSend = {};
			if (method == 'create') {
				toSend.collection = model.collection.schemaName;
				toSend.data = model.toJSON();

			} else if (method == 'read') {
				toSend.collection = model.schemaName;
				toSend.data = options.data;

			} else if (method == 'update') {
				toSend.collection = model.collection.schemaName;
				toSend.id = model.id;
				toSend.data = model.toJSON();

			} else if (method == 'delete') {
				toSend.collection = model.collection.schemaName;
				toSend.id = model.id;

			}

			var socket = window.socket;
			socket.emit(method, toSend, function (data) {
				if (data.hasOwnProperty('error')) {
					console.log(data.error);
				} else {
					if (options.success) {
						options.success(data);
					}
				}
				resolve();
			});
		});

		model.trigger('request', model, promise, options);
		return promise;
	};
	return Backbone;
});