var staticPath = __dirname + '/static';
var conf = {
	projectPath: __dirname,//папка проекта. абсолютный путь. как правило, не надо его менять.
	staticPath: staticPath,//путь до статики
	viewsPath: staticPath + '/views',//путь до вьюх
	routesPath: __dirname + '/routes',//путь дл роутов
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
	roles: {
		admin: ['full access', 'ass'],
		user: ['ass', 'user access']
	},
	fileUpload: {//настройки файл аплоада для реста.
		mimes: {//какие mime типы вообще поддерживаются для загрузки
			'image/jpeg': 'jpg',
			'image/png': 'png'
		},
		storages: {//хранилища
			filesystem: {//сейчас пока поддерживается только хранилище в файловой системе
				pub: 'files',//название папки с публичными файлами (настраивается в конкретном поле в схеме как access)
				pri: 'files_private'//название папки с приватными файлами (настраивается в конкретном поле в схеме как access)
			}
		}
	},
	editableSchemas: {
		pages: {
			name: 'Pages',
			titleField: 'title'
		},
		users: {
			name: 'Users',
			titleField: 'username'//,
			//path: '/static/schemas/users.js'
		}/*,
		 assssd: {
		 name: 'Test',
		 titleField: 'asdasd',
		 path:'/schemas/users.js'
		 }*/
	}
};

module.exports = conf;