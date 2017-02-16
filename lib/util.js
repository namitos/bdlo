const _ = require('lodash');
const mongodb = require('mongodb');

function prepareId(id) {
  console.log('util.prepareId deprecated!');
  var newId;
  try {
    if (id instanceof Array) {
      newId = [];
      id.forEach(function (item, i) {
        newId.push(prepareId(item));
      });
    } else if (id instanceof Object && id.hasOwnProperty('$in')) {
      newId = {
        $in: prepareId(id.$in)
      };
    } else {
      newId = new mongodb.ObjectID(id.toString());
    }
  } catch (err) {
    console.error(id, err);
  }
  return newId;
}

function passwordHash(password) {
  console.log('util.passwordHash deprecated!');
  return require('crypto').createHash('sha512').update(password).digest("hex");
}

module.exports = {
  prepareId: prepareId,
  passwordHash: passwordHash
};
