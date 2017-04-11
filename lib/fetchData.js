const http = require('http');
const https = require('https');
const url = require('url');
const parseXml = require('xml2json').toJson;

module.exports = (urlFull, headers, body, method = "GET") => {
  let urlParsed = url.parse(urlFull);
  let httpLib = urlParsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    let parts = Buffer.from('');
    let req = httpLib.request({
      method: method,
      rejectUnauthorized: false,
      hostname: urlParsed.hostname,
      port: urlParsed.port ? urlParsed.port : urlParsed.protocol === 'https:' ? 443 : 80,
      path: urlParsed.path,
      headers: headers
    }, (res) => {
      if ([200].indexOf(res.statusCode) === -1) {
        console.log(res.statusCode, res.headers);
        reject(`unexpected status code ${res.statusCode}`);
      } else {
        res.on('data', (data) => {
          parts = Buffer.concat([parts, data]);
        });
        res.on('end', () => {
          try {
            if (res.headers['content-type'] && (res.headers['content-type'].indexOf('application/xml') !== -1 || res.headers['content-type'].indexOf('text/xml') !== -1)) {
              resolve(parseXml(parts, {object: true}));
            } else if (res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') !== -1) {
              resolve(JSON.parse(parts.toString()));
            } else {
              resolve(parts);
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    });
    if (body) {
      req.write(body);
    }
    req.end();
    req.on('error', (err) => {
      reject(err);
    });
  });
};