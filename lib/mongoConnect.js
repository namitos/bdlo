const { MongoClient } = require('mongodb');

module.exports = async ({ mongo, params = {} }) => {
  let connectionString = mongo.connectionString || `mongodb://${mongo.host}:${mongo.port}/${mongo.db}`;
  let client = await MongoClient.connect(connectionString, Object.assign({ useNewUrlParser: true, useUnifiedTopology: true }, params));
  let db = client.db(mongo.db);
  return { client, db };
};
