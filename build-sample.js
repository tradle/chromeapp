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

    // everything except bundle.js
    // ncp('app', copyPath, /^((?!bundle.js).)*$/, function(err) {
    ncp('app', copyPath, function(err) {
      if (err) return callback(err);

      var togo = 3;

      function finish() {
        if (--togo === 0) callback();
      }

      fs.readFile('app/bundle.js', function(err, buf) {
        var envified = buf.toString().replace(/process\.env\.PUBKEY/ig, pubkey);
        fs.writeFile(toAppPath('app/bundle.js'), envified, finish);
      });

      var htmlPath = path.resolve('app/index.html');
      var html = fs.readFileSync(htmlPath);
      var $ = cheerio.load(html);
      var webview = $('webview');
      var src = webview.attr('src');
      webview.attr('src', src + '&-pubkey=' + pubkey);
      fs.writeFile(toAppPath(htmlPath), $.html(), finish);

      var mPath = path.resolve('app/manifest.json');
      var manifest = JSON.parse(fs.readFileSync(mPath));
      var icon = manifest.icons['128'].replace('Logo', name);
      if (fs.existsSync(path.resolve('app/' + icon))) {
        manifest.icons['128'] = icon;
      }

      manifest.name += ' ' + name;
      fs.writeFile(toAppPath(mPath), JSON.stringify(manifest, null, 2), finish);
    });
  });
}
