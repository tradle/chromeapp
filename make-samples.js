#!/usr/bin/env node

var ncp = require('ncp');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var cheerio = require('cheerio');

['Jane', 'Kate'].forEach(function(name, nameIdx) {
  var lower = name.toLowerCase();
  var copyPath = path.resolve('build/' + lower);

  rimraf(copyPath, function(err) {
    if (err) return console.log(err);

    ncp('app', copyPath, function(err) {
      if (err) return console.log(err);

      var htmlPath = path.resolve('build/' + lower + '/index.html');
      fs.readFile(htmlPath, function(err, html) {
        if (err) return console.log(err);

        var $ = cheerio.load(html);
        var webview = $('webview');
        var src = webview.attr('src');
        webview.attr('src', src + '&-pubkey=' + (nameIdx + 1));
        fs.writeFile(htmlPath, $.html());
      });

      var mPath = path.resolve('build/' + lower + '/manifest.json');
      var manifest = require(mPath);
      manifest.icons['128'] = manifest.icons['128'].replace('Logo', name);
      manifest.name += ' ' + name;
      fs.writeFile(mPath, JSON.stringify(manifest, null, 2));
    });
  });
})
