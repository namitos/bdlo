var conf = {
	viewsDir: __dirname + '/../static/views',
	viewCache: false,
	port: 8000,
	mongoConnect: 'mongodb://127.0.0.1:27017/bydlocms',
	session: {
		secret: "Fj549t=_s-4g-dfh34uyHdfy54&3450hfgjslfsgfgnpsggpoag0JFj54834thK)=",
		redis: {
			host: "localhost",
			port: 6379
		}
	},
	ioStore: {
		redisPub: {
			host: "localhost",
			port: 6379
		},
		redisSub: {
			host: "localhost",
			port: 6379
		},
		redisClient: {
			host: "localhost",
			port: 6379
		}
	},
	roles:{
		admin:['full access', 'ass'],
		user:['ass', 'user access']
	}
};

module.exports = conf;