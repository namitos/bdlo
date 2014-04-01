var staticPath = __dirname+'/static';
var conf = {
	staticPath: staticPath,
	viewsDir: staticPath + '/views',
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
	},
	fileUpload: {
		mimes: {
			'image/jpeg': 'jpg',
			'image/png': 'png'
		},
		storages: {
			filesystem: {
				pub: 'files',
				pri: 'files_private'
			}
		}

	}
};

module.exports = conf;