'use strict';

var _ = require('lodash');

module.exports = function (app) {
	return class User extends app.models.Model {
		static get schema() {
			return {
				name: 'User',
				safeDelete: true,
				updatePatch: true,
				type: 'object',
				properties: {
					username: {
						label: 'Логин',
						type: 'string',
						required: true
					},
					password: {
						label: 'Пароль',
						type: 'string'
					},
					roles: {
						label: 'Роли',
						type: 'array',
						items: {
							required: true,
							allowEmpty: false,
							type: 'string',
							widget: 'select',
							options: {
								admin: 'Администратор системы',
								contentmanager: 'Контент-менеджер'
							}
						}
					},
					deleted: {
						type: 'boolean',
						label: 'Удалено'
					}
				}
			}
		}

		constructor(properties) {
			super(properties);

			if (!this.hasOwnProperty('roles')) {
				this.roles = [];
			}
			var permissions = [];
			this.roles.forEach(function (roleName) {
				if (app.conf.roles.hasOwnProperty(roleName)) {
					app.conf.roles[roleName].forEach(function (permissionString) {
						permissions.push(permissionString);
					});
				}
			});
			if (this.hasOwnProperty('_id') && app.conf.roles.registered) {
				app.conf.roles.registered.forEach(function (permissionString) {
					permissions.push(permissionString);
				});
			}
			Object.defineProperty(this, 'permissions', {
				value: _.unique(permissions)
			});
		}

		static genPassword() {
			return app.util.passwordHash(Math.random().toString()).substr(0, 6);//откусываем кусок хеша
		}

		permission(permissionString) {
			return _.contains(this.permissions, permissionString) || _.contains(this.permissions, 'full access');
		}

		crudPermission(op, input) {
			var user = this;
			var op2perm = {
				create: 'write',
				read: 'read',
				update: 'write',
				'delete': 'write'
			};
			return this.permission(input.collection + ' ' + op2perm[op]) || this.permission(input.collection + ' ' + op2perm[op] + ' his') && (function () {
					var ModelSchema = app.models[input.collection].schema;
					if (ModelSchema.ownerField) {
						var ownerField = ModelSchema.ownerField;
						if (op == 'create' || op == 'update') {
							input.data = input.data || {};
							input.data[ownerField] = user._id.toString();
						}
						if (op == 'read' || op == 'update' || op == 'delete') {
							input.where = input.where || {};
							input.where[ownerField] = user._id.toString();
						}
						console.log('user.crudPermission patched', op, input);
						return true;
					} else {
						return false;
					}
				})();
		}
	}
};