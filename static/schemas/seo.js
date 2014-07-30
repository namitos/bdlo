var seoSchema = {
	properties: {
		route: {
			type: 'string',
			required: true
		},
		title: {
			type: 'string',
			required: true
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
	info: {
		titleField: 'route'
	}
};
try {
	module.exports = seoSchema;
} catch (e) {
}