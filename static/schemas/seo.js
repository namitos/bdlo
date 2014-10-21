var schema = {
	properties: {
		route: {
			type: 'string',
			required: true
		},
		title: {
			type: 'string',
			required: true
		},
		keywords: {
			type: 'string'
		},
		description: {
			type: 'string'
		},
		h1Title: {
			type: 'string'
		},
		content: {
			type: 'string',
			required: true,
			info: {
				type: 'textarea',
				wysiwyg: true
			}
		}
	},
	titleField: 'route',
	name: 'Seo'
};

if (typeof exports === 'object') {
	module.exports = schema;
}
if (typeof define === 'function') {
	define(function () {
		return schema;
	});
}