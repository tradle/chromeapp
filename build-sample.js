var ncp = require('ncp');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var cheerio = require('cheerio');
var noop = function() {};

module.exports = function(name, pubkey, callback) {
  callback = callback || noop;
  var lower = name.toLowerCase();
  var copyPath = path.resolve('build/' + lower);

  function toAppPath(p) {
    return p.replace('app', 'build/' + lower);
  }

  rimraf(copyPath, function(err) {
    if (err) return callback(err);

    ncp('app', copyPath, function(err) {
      if (err) return callback(err);

      var htmlPath = path.resolve('app/index.html');
      var html = fs.readFileSync(htmlPath);
      var $ = cheerio.load(html);
      var webview = $('webview');
      var src = webview.attr('src');
      webview.attr('src', src + '&-pubkey=' + pubkey);
      fs.writeFileSync(toAppPath(htmlPath), $.html());

      var mPath = path.resolve('app/manifest.json');
      var manifest = JSON.parse(fs.readFileSync(mPath));
      var icon = manifest.icons['128'].replace('Logo', name);
      if (fs.existsSync(path.resolve('app/' + icon))) {
        manifest.icons['128'] = icon;
      }

      manifest.name += ' ' + name;
      fs.writeFileSync(toAppPath(mPath), JSON.stringify(manifest, null, 2));
      callback();
    });
  });
}
