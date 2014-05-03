var usersSchema = {
	properties: {
		username:{
			type: 'string',
			required: true
		},
		password:{
			type: 'string',
			required: true
		},
		//@TODO: заменить. потом будет нормальный мультифилд, когда сделаю поддержку у конструктора форм
		roles:{
			type:'array',
			items:{
				type:'string'
			}
		},
		avatar: {
			type: 'any',//для схемы мы указали тип любой, чтобы потом в info его переопределить как file
			info: {
				type: 'file',
				mimes: ['image/jpeg', 'image/png'],//какие mime типы разрешены
				storage: {//инфа о хранилище
					access: 'pub',//доступ публичный
					type: 'filesystem',//в файловой системе
					path: 'avatars'//папка в этом хранилище
				}
			}
		}
	}
};
try{
	module.exports = usersSchema;
}catch(e){}