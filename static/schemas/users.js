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
		/*roles:{
			type:'array',
			items:{
				type:'string'
			}
		}*/
		roles:{
			type: 'string',
			required: true
		},
		avatar: {
			type: 'any',
			info: {
				type: 'file',
				mimes: ['image/jpeg', 'image/png'],
				storage: {
					access: 'pub',
					type: 'filesystem',
					path: 'avatars'
				}
			}
		},
	}
};
try{
	module.exports = usersSchema;
}catch(e){}