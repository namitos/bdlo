'use strict';

var coreStaticPath = '/core';

require.config({
	shim: {
		ckeditor: {
			exports: 'CKEDITOR'
		},
		ace: {
			exports: 'ace'
		}
	},
	paths: {
		text: coreStaticPath + '/vendor/requirejs-text/text',
		fc: coreStaticPath + '/vendor/namitos-fc/fc',
		underscore: coreStaticPath + '/vendor/lodash/dist/lodash.min',
		backboneCore: coreStaticPath + '/vendor/backbone/backbone',
		backbone: coreStaticPath + '/app/backboneSocketSync',
		jquery: coreStaticPath + '/vendor/jquery/dist/jquery',
		twbs: coreStaticPath + '/vendor/bootstrap/dist/js/bootstrap.min',
		jqueryui: coreStaticPath + '/vendor/jquery-ui/jquery-ui.min',
		ckeditor: coreStaticPath + '/vendor/ckeditor/ckeditor',
		ace: 'http://cdnjs.cloudflare.com/ajax/libs/ace/1.1.3/ace',

		io: '/socket.io/socket.io'
	}
});

require([
	'backbone',
	'editor',
	'schemas',
	'io'
], function (Backbone, editor, schemas, io) {
	window.socket = io();

	schemas.load(function (loadedSchemas) {
		var app = new Router({
			schemasView: new schemas.ListView({
				schemas: loadedSchemas,
				$target: $('.list-schemas')
			})
		});
		Backbone.history.start();
	})

	var Router = Backbone.Router.extend({
		initialize: function (args) {
			_.merge(this, args);
		},
		routes: {
			':schemaName': function (schemaName) {
				this.navigate(schemaName + "/new", {trigger: true});
			},
			':schemaName/:id': function (schemaName, id) {
				var router = this;
				router.schemasView.activateLink(schemaName);
				if (router.activeSchema != schemaName) {
					router.activeSchema = schemaName;
					router.listView = new editor.ListView({
						schemaName: schemaName,
						activeId: id,
						$target: $('.list-collection')
					});
				}

				new editor.FormView({
					schemaName: schemaName,
					activeId: id,
					$target: $('.form-schema')
				});
			}
		}
	});
});