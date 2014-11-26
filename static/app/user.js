define([
	'text!/user/current',
	'models/User'
], function (userJson, User) {
	return new User(JSON.parse(userJson));
});