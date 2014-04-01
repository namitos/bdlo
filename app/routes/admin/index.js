module.exports = function (app) {
	require('./users')(app);
	require('./schemas')(app);
	require('./rest')(app);
};