const fs = require('fs');
const crypto = require('crypto');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

module.exports = (settings) => {
  function _fileName(str) {
    return crypto
      .createHash('sha256')
      .update(str)
      .digest('hex');
  }

  function _isBase64File(str) {
    if (!str || typeof str !== 'string') {
      return false;
    }
    return str.substr(0, 5).indexOf('data:') === 0;
  }

  async function _saveFile(schemaPart, obj, key) {
    let item = obj[key];
    if (_isBase64File(item)) {
      let matches = item.split(';base64,');
      let data = matches[1];
      let mime = matches[0].replace('data:', '');
      let storage = settings.storage[schemaPart.storage];
      if (storage.mime.includes(mime)) {
        let fileName = _fileName(data) + '.' + settings.mime[mime];
        let filePath = [storage.path, fileName].join('/');
        let filePathWrite = [settings.path, storage.path, fileName].join('/');
        let buf = Buffer.from(data, 'base64');
        if (schemaPart.processFile instanceof Function) {
          await schemaPart.processFile({ filePathWrite, buf, writeFile });
        } else {
          await writeFile(filePathWrite, buf);
        }
        obj[key] = filePath;
      } else {
        obj[key] = null;
      }
    }
  }

  function _properSchema(schema) {
    return schema.storage && ['base64File', 'ui-input-image', 'ui-input-file', 'input-file'].includes(schema.widget);
  }

  function _prepareFilesPromises(schema, obj) {
    let promises = [];
    if (schema.properties) {
      Object.keys(schema.properties).forEach((fieldName) => {
        if (obj[fieldName]) {
          let fieldSchema = schema.properties[fieldName];
          if (
            //primitive file field
            _properSchema(fieldSchema) &&
            fieldSchema.type === 'string'
          ) {
            promises.push(_saveFile(fieldSchema, obj, fieldName));
          } else if (
            //array of primitives
            fieldSchema.type === 'array' &&
            fieldSchema.items.type === 'string' &&
            _properSchema(fieldSchema)
          ) {
            obj[fieldName] = obj[fieldName].filter((v) => v);
            obj[fieldName].forEach((item, i) => {
              promises.push(_saveFile(fieldSchema, obj[fieldName], i));
            });
          } else if (
            //file field is a part of object
            fieldSchema.type === 'object'
          ) {
            let r = _prepareFilesPromises(fieldSchema, obj[fieldName]);
            promises.push(...r);
          } else if (
            //array of objects
            fieldSchema.type === 'array'
          ) {
            obj[fieldName] = obj[fieldName].filter((v) => v);
            obj[fieldName].forEach((item) => {
              let r = _prepareFilesPromises(fieldSchema.items, item);
              promises.push(...r);
            });
          }
        }
      });
    }
    return promises;
  }

  return async (data) => {
    await Promise.all(_prepareFilesPromises(data.item.constructor.schema, data.item));
    return data;
  };
};
