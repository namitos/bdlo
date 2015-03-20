var schema = {
	type: 'object',
	titleField: 'route',
	name: 'Pages',
	properties: {
		route: {
			type: 'string',
			required: true,
			label: 'Route'
		},
		title: {
			type: 'string',
			required: true,
			label: 'Title'
		},
		parent: {
			type: 'string',
			widget: 'select',
			label: 'Parent page',
			schema: 'pages'
		},
		content: {
			type: 'string',
			required: true,
			label: 'Content',
			widget: 'wysiwyg'
		}
	}
};

if (typeof exports === 'object') {
	module.exports = schema;
}
if (typeof define === 'function') {
	define(function () {
		return schema;
	});
}
