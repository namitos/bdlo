var schema = {
	type: 'object',
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
		/*parent: {
		 type: 'string',
		 info: {
		 type: 'select',
		 schema: 'pages'
		 }
		 },*/
		content: {
			type: 'string',
			required: true,
			label: 'Content',
			info: {
				type: 'textarea',
				wysiwyg: true
			}
		}
	},
	info: {
		titleField: 'title'
	},
	name: 'Pages'
};

if (typeof exports === 'object') {
	module.exports = schema;
}
if (typeof define === 'function') {
	define(function () {
		return schema;
	});
}