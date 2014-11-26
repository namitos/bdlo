define([
	'text!/user/current',
	'models/user'
], function (userJson, User) {
	return new User(JSON.parse(userJson));
});