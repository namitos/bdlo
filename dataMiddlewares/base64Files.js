const fs = require('fs');
const crypto = require('crypto');

const _ = require('lodash');

module.exports = (settings) => {
  function _fileName(str) {
    return crypto.createHash('sha512').update(str).digest("hex");
  }

  function _isBase64File(str) {
    if (!str || typeof str != 'string') {
      return false;
    }
    return str.substr(0, 5).indexOf('data:') != -1;
  }

  function _saveFilePromise(schemaPart, input) {
    let promises = [];
    input.forEach((item, i) => {
      if (_isBase64File(item)) {
        let matches = item.split(';base64,');
        let data = matches[1];
        let mime = matches[0].replace('data:', '');
        let storage = settings.storage[schemaPart.storage];
        if (storage.mime.indexOf(mime) != -1) {
          let fileName = _fileName(data) + '.' + settings.mime[mime];
          let filePath = [storage.path, fileName].join('/');
          let filePathWrite = [settings.path, storage.path, fileName].join('/');
          promises.push(new Promise((resolve) => {
            fs.writeFile(filePathWrite, Buffer.from(data, 'base64'), (err) => {
              if (err) {
                console.error(err);
              }
              resolve();
            });
          }));
          input[i] = filePath;
        } else {
          input[i] = null;
        }
      }
    });
    return Promise.all(promises);
  }

  function _properSchema(schema) {
    return schema.storage && ['base64File', 'ui-input-image', 'ui-input-file'].includes(schema.widget);
  }

  function _prepareFilesPromises(schema, obj) {
    let promises = [];
    if (schema.properties) {
      Object.keys(schema.properties).forEach((fieldName) => {
        if (obj[fieldName]) {
          if ( //simple file field
            _properSchema(schema.properties[fieldName])
          ) {

            obj[fieldName] = _.compact(obj[fieldName]);
            promises.push(_saveFilePromise(schema.properties[fieldName], obj[fieldName]));

          } else if ( //array of simple file fields
            schema.properties[fieldName].type == 'array' &&
            _properSchema(schema.properties[fieldName].items)
          ) {

            obj[fieldName].forEach((item, i) => {
              item = _.compact(item);
              obj[fieldName][i] = item.length ? item : false
            });
            obj[fieldName] = _.compact(obj[fieldName]);
            obj[fieldName].forEach((item, i) => {
              promises.push(_saveFilePromise(schema.properties[fieldName].items, item));
            });

          } else if ( //file field is a part of object
            schema.properties[fieldName].type == 'object'
          ) {

            _prepareFilesPromises(schema.properties[fieldName], obj[fieldName]).forEach((promise) => { //recursion for simplify
              promises.push(promise);
            });

          } else if ( //array of object with file fields
            schema.properties[fieldName].type == 'array'
          ) {

            obj[fieldName] = _.compact(obj[fieldName]);
            obj[fieldName].forEach((item, i) => {
              _prepareFilesPromises(schema.properties[fieldName].items, item).forEach((promise) => { //recursion for simplify
                promises.push(promise);
              });
            });

          }
        }
      });
    }
    return promises;
  }

  return (data) => {
    return Promise.all(_prepareFilesPromises(data.item.constructor.schema, data.item)).then(() => data);
  }
};
