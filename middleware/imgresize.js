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

let path = require('path');
let fs = require('fs');

let gm = require('gm');
let mkdirp = require('mkdirp');

module.exports = (settings) => {
  settings.quality = settings.quality || 80;

  return (req, res, next) => {
    let file = req.url.replace(/\?.*/, '');
    let origin = path.join(settings.path, file);
    let profileName = req.query.profile || 'thumb';
    console.log('resizing', settings.path, file, origin, profileName);

    if (settings.profile[profileName]) {
      let profile = settings.profile[profileName];
      fs.stat(origin, (err, result) => {
        if (err) {
          res.status(404).send();
        } else {
          let resizedFilePath = path.join(settings.path, settings.tmp, profileName, file);
          fs.stat(resizedFilePath, (err, result) => {
            if (err) {
              mkdirp(path.dirname(resizedFilePath), (err) => {
                let image = gm(origin).quality(settings.quality);
                image.size(function(err, size) {
                  if (err) {
                    res.status(503).send();
                  } else {
                    if (size.width > profile.w || size.height > profile.h) {
                      image.resize(profile.w, profile.h).write(resizedFilePath, (err) => {
                        if (err) {
                          res.status(503).send();
                        } else {
                          res.redirect(path.join(settings.tmp, profileName, file));
                        }
                      });
                    } else {
                      image.resize(size.width, size.height).write(resizedFilePath, (err) => {
                        if (err) {
                          res.status(503).send();
                        } else {
                          res.redirect(path.join(settings.tmp, profileName, file));
                        }
                      });
                    }
                  }
                });
              });
            } else {
              res.redirect(path.join(settings.tmp, profileName, file));
            }
          });
        }
      });
    } else {
      res.status(404).send();
    }
  };
};
