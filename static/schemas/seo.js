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
		keywords: {
			type: 'string',
			label: 'Meta keywords'
		},
		description: {
			type: 'string',
			label: 'Meta description'
		},
		h1Title: {
			type: 'string',
			label: 'H1 title'
		},
		content: {
			type: 'string',
			label: 'Additional text',
			widget: 'textarea'
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