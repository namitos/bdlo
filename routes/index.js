module.exports = (app) => {
  require('./crud')(app);
  require('./user')(app);
};
