var staticPath = __dirname + '/static';
var conf = {
	projectPath: __dirname,//папка проекта. абсолютный путь. как правило, не надо его менять.
	staticPath: staticPath,//путь до статики
	viewsPath: staticPath + '/views',//путь до вьюх
	routesPath: __dirname + '/routes',//путь для роутов
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
	roles: {
		admin: ['full access', 'ass'],
		user: ['ass', 'user access']
	},
	editableSchemas: {
		pages: {
			name: 'Pages'
		},
		users: {
			name: 'Users'
		}
	},
	fileUpload: {
		mimes: {
			'image/jpeg': 'jpg',
			'image/png': 'png'
		},
		storages: {
			images: {
				path: 'files/images',
				mimes: ['image/jpeg', 'image/png']
			}
		}
	}
};

module.exports = conf;