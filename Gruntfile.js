var preprocess = require('preprocess');
var fs = require('fs');
var browserify = require('browserify');
var makeSample = require('./build-sample');
var path = require('path');
var cp = require('child_process');
var CHROME = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var DEBUG = !!grunt.option('debug');
  var pkgJson = grunt.file.readJSON('package.json');
  var appName = pkgJson.name;
  // var appUrl = pkgJson.url + '?-webview=y';

  grunt.registerTask('setup', [
    'githooks'
  ]);

  grunt.registerTask('samples', function() {
    var done = this.async();
    var togo = 2;

    makeSample('Jane', 1, finish);
    makeSample('Kate', 2, finish);

    function finish() {
      if (--togo === 0) done();
    }
  });

  grunt.registerTask('renameCopy', function() {
    var manifest = grunt.file.readJSON('app/manifest.json');
    manifest.name += '2';
    grunt.file.write('appCopy/manifest.json', JSON.stringify(manifest, null, 2));
  });

  grunt.registerTask('browserify', function() {
    var done = this.async();
    browserify()
      .add('./index.js')
      .require('browserify-fs', {
        expose: 'fs'
      })
      .require('chrome-dgram', {
        expose: 'dgram'
      })
      .require('chrome-net', {
        expose: 'net'
      })
      .require('browser-request', {
        expose: 'request'
      })
      .require('dns.js', {
        expose: 'dns'
      })
      // .transform('brfs')
      // .transform(envify(this.data.env || {}))
      .bundle()
      .pipe(fs.createWriteStream('app/bundle.js'))
      .on('close', done);
  });

  grunt.registerTask('preprocess', function() {
    preprocess.preprocessFileSync(
      'index.html',
      'app/index.html', {
        APP_TITLE: appName,
        APP_HOME: 'http://tradle.io/app/KYC/home/?-webview=y' + (DEBUG ? '&-min=n' : ''),
        DEBUG: DEBUG
      }
    );
  });

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    githooks: {
      all: {
        'pre-commit': 'jsbeautifier jshint'
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      css: {
        src: ['css/**'],
        dest: 'app/bundle.css'
      }
    },
    jsbeautifier: {
      options: {
        config: '.jsbeautifyrc'
      },

      default: {
        src: ['Gruntfile.js', 'index.js', 'lib/**/*.js']
      },

      verify: {
        src: ['Gruntfile.js', 'index.js', 'lib/**/*.js'],
        options: {
          mode: 'VERIFY_ONLY'
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },

      gruntfile: {
        src: 'Gruntfile.js'
      },

      default: {
        src: ['Gruntfile.js', 'index.js', 'lib/**/*.js']
      }
    },
    crx: {
      jane: {
        src: 'build/jane',
        dest: 'build/jane.crx',
        privateKey: 'keys/jane.pem'
      },
      kate: {
        src: 'build/kate',
        dest: 'build/kate.crx',
        privateKey: 'keys/kate.pem'
      }
    }
  });

  grunt.registerTask('install', function() {
    // ['Jane', 'Kate'].forEach(function(name) {
    ['Kate'].forEach(function(name) {
      var command = CHROME + ' --load-and-launch-app="' + path.resolve(path.join(__dirname, 'build/' + name.toLowerCase())) + '"';
      var env = {};
      cp.exec(command, env, function() {});
    })
  });

  grunt.registerTask('build', [
    'preprocess',
    'concat',
    'browserify'
  ]);

  var defaultTasks = ['build'];
  if (DEBUG) defaultTasks.push.apply(defaultTasks, ['samples', 'crx', 'install']);

  grunt.registerTask('default', defaultTasks);
}
