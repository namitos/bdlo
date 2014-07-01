var blocksSchema = {
	properties: {
		title: {
			type: 'string',
			required: true,
			info:{
				label:'Название блока'
			}
		},
		link: {
			type: 'string',
			info:{
				label:'Ссылка'
			}
		},
		target: {
			type: 'string',
			required: true,
			info:{
				label:'Куда вставлять (jQuery селектор)'
			}
		},
		weight: {
			type: 'number',
			required: true,
			info:{
				label:'Вес (чем тяжелее, тем ниже)'
			}
		},
		content: {
			type: 'string',
			info: {
				type: 'textarea',
				label:'Контент (не нужен, если используется функция-генератор)'
			}
		},
		widget: {
			type: 'string',
			label:'Функция-генератор'
		},
		urls: {
			type: 'array',
			info: {
				label:'Адреса (если адресов нет, то блок выводится везде)'
			},
			items:{
				type:'string'
			}
		},
		urlsType:{
			type:'string',
			info:{
				type:'select',
				label:'Исключать вывод блока по этим адресам',
				options:{
					exclude:'Исключать'
				}
			}
		}
	}
};
try {
	module.exports = blocksSchema;
} catch (e) {
}