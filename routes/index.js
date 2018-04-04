module.exports = function(app) {
  require('./crud')(app);
  require('./user')(app);
};