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

  rimraf(copyPath, function(err) {
    if (err) return console.log(err);

    ncp('app', copyPath, function(err) {
      if (err) return console.log(err);

      var htmlPath = path.resolve('build/' + lower + '/index.html');
      var html = fs.readFileSync(htmlPath);
      var $ = cheerio.load(html);
      var webview = $('webview');
      var src = webview.attr('src');
      webview.attr('src', src + '&-pubkey=' + pubkey);
      fs.writeFileSync(htmlPath, $.html());

      var mPath = path.resolve('build/' + lower + '/manifest.json');
      var manifest = require(mPath);
      var icon = manifest.icons['128'].replace('Logo', name);
      if (fs.existsSync(path.resolve('build/' + icon))) {
        manifest.icons['128'] = icon;
      }

      manifest.name += ' ' + name;
      fs.writeFile(mPath, JSON.stringify(manifest, null, 2));
      callback();
    });
  });
}
