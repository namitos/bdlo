var schema = {
	properties: {
		title: {
			type: 'string',
			required: true,
			info: {
				label: 'Название блока'
			}
		},
		link: {
			type: 'string',
			info: {
				label: 'Ссылка'
			}
		},
		target: {
			type: 'string',
			required: true,
			info: {
				label: 'Куда вставлять (jQuery селектор)'
			}
		},
		weight: {
			type: 'number',
			required: true,
			info: {
				label: 'Вес (чем тяжелее, тем ниже)'
			}
		},
		content: {
			type: 'string',
			info: {
				type: 'textarea',
				label: 'Контент (не нужен, если используется функция-генератор)',
				wysiwyg: true
			}
		},
		widget: {
			type: 'string',
			label: 'Функция-генератор'
		},
		urls: {
			type: 'array',
			info: {
				label: 'Адреса (если адресов нет, то блок выводится везде)'
			},
			items: {
				type: 'string'
			}
		},
		urlsType: {
			type: 'string',
			info: {
				type: 'select',
				label: 'Исключать вывод блока по этим адресам',
				options: {
					exclude: 'Исключать'
				}
			}
		}
	},
	titleField: 'title',
	name: 'Blocks'
};

if (typeof exports === 'object') {
	module.exports = schema;
}
if (typeof define === 'function') {
	define(function () {
		return schema;
	});
}