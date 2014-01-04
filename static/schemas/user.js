var userSchema = {
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
		}
	}
};
try{
	module.exports = userSchema;
}catch(e){}