var schema = {
	type: 'object',
	properties: {
		username: {
			type: 'string',
			required: true
		},
		password: {
			type: 'string',
			required: true
		},
		roles: {
			type: 'array',
			items: {
				type: 'string'
			}
		}
	},
	ownerField: '_id',
	titleField: 'username',
	name: 'Users'
};

if (typeof exports === 'object') {
	module.exports = schema;
}
if (typeof define === 'function') {
	define(function () {
		return schema;
	});
}
