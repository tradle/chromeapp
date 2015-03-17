#!/bin/node

var ncp = require('ncp');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

['Jane', 'Kate'].forEach(function(name) {
  var lower = name.toLowerCase();
  var copyPath = path.resolve('build/' + lower);

  rimraf(copyPath, function(err) {
    if (err) return console.log(err);

    ncp('app', copyPath, function(err) {
      if (err) return console.log(err);

      var mPath = path.resolve('build/' + lower + '/manifest.json');
      var manifest = require(mPath);
      manifest.name += ' ' + name;
      fs.writeFile(mPath, JSON.stringify(manifest, null, 2));
    });
  });
})
