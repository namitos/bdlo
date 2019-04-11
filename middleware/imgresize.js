//Example

// {
//   fsPath: 'data/files', //fs files source path
//   redirPath: '/files', //start url part for redirect
//   tmp: '/tmp', //tmp path - redirecting to /files/tmp/[image_path]
//   profile: {
//     thumb: {
//       w: 75,
//       h: 75
//     },
//     micro: {
//       w: 160,
//       h: 80
//     },
//     galleryPrev: {
//       w: 320,
//       h: 320
//     },
//     galleryBig: {
//       w: 1400,
//       h: 900
//     }
//   }
// }

const path = require('path');
const fs = require('fs');
const gm = require('gm');
const mkdirp = require('mkdirp');
const util = require('util');

module.exports = (settings) => {
  settings.quality = settings.quality || 80;
  return async (req, res, next) => {
    try {
      let file = req.url.replace(/\?.*/, '');
      file = decodeURIComponent(file);
      let origin = path.join(settings.fsPath, file);
      let profileName = req.query.profile || 'thumb';
      //console.log('resizing', settings.fsPath, file, origin, profileName);
      if (settings.profile[profileName]) {
        let profile = settings.profile[profileName];
        try {
          await util.promisify(fs.stat)(origin);
        } catch (err) {
          return res.status(404).send();
        }
        let resizedFilePath = path.join(settings.fsPath, settings.tmp, profileName, file);
        try {
          await util.promisify(fs.stat)(resizedFilePath);
          return res.redirect(path.join(settings.redirPath, settings.tmp, profileName, file));
        } catch (err) {
          await util.promisify(mkdirp)(path.dirname(resizedFilePath));
          let image = gm(origin).quality(settings.quality);
          let size = await util.promisify(image.size).bind(image)();
          if (size.width > profile.w || size.height > profile.h) {
            await util.promisify(image.resize(profile.w, profile.h).write).bind(image)(resizedFilePath);
            return res.redirect(path.join(settings.redirPath, settings.tmp, profileName, file));
          } else {
            await util.promisify(image.resize(size.width, size.height).write).bind(image)(resizedFilePath);
            return res.redirect(path.join(settings.redirPath, settings.tmp, profileName, file));
          }
        }
      } else {
        res.status(404).send();
      }
    } catch (err) {
      console.error(err)
      res.status(503).send();
    }
  }
};
