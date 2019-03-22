module.exports = function apiAw(fn, requireAuth = false) {
  return async (req, res) => {
    try {
      if (!requireAuth || req.user._id) {
        await fn(req, res);
      } else {
        res.status(401).send({});
      }
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  };
};
