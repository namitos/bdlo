exports.init=function(app){
	require('./users').init(app);
	require('./schemas').init(app);
	require('./rest').init(app);
};