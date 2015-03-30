var preprocess = require('preprocess');
var fs = require('fs');
var browserify = require('browserify');
var makeSample = require('./build-sample');
var path = require('path');
var cp = require('child_process');
var CHROME = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
var WEB_STORE_CREDENTIALS;
try {
  WEB_STORE_CREDENTIALS = require('./webstore-credentials.json');
} catch (err) {
  WEB_STORE_CREDENTIALS = {};
}

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

  grunt.registerTask('browserify', function() {
    var done = this.async();
    browserify()
      .add('./background.js')
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
        APP_HOME: 'http://tradle.io/app/KYC/view/profile?-webview=y' + (DEBUG ? '&-min=n' : ''),
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
    },
    compress: {
      jane: {
        options: {
          archive: 'build/jane.zip'
        },
        files: [{
          expand: true,
          cwd: 'build/jane/',
          src: ['./**'],
          dest: '.',
          filter: 'isFile'
        }]
      },
      kate: {
        options: {
          archive: 'build/kate.zip'
        },
        files: [{
          expand: true,
          cwd: 'build/kate/',
          src: ['./**'],
          dest: '.',
          filter: 'isFile'
        }]
      }
    },
    webstore_upload: {
      accounts: {
        default: {
          // publish item right after uploading. default false
          publish: true,
          client_id: WEB_STORE_CREDENTIALS.client_id,
          client_secret: WEB_STORE_CREDENTIALS.client_secret
        }
      },
      extensions: {
        jane: {
          publish: true,
          //required
          appID: 'mdemnfamnpjacheflfpbeoegofpkbmjo',
          //required, we can use dir name and upload most recent zip file
          zip: 'build/jane.zip'
        },
        kate: {
          publish: true,
          //required
          appID: 'mcbgabjhbndmpnbcjkdclmejbapadaim',
          //required, we can use dir name and upload most recent zip file
          zip: 'build/kate.zip'
        }
      }
    }
  });

  grunt.registerTask('manifest', function() {
    var manifest = grunt.file.readJSON('app/manifest.json');
    var parts = manifest.version.split('.');
    parts[parts.length - 1]++;
    manifest.version = parts.join('.');
    grunt.file.write('app/manifest.json', JSON.stringify(manifest, null, 2));
  });

  grunt.registerTask('install', function() {
    ['Jane', 'Kate'].forEach(function(name) {
      var command = CHROME + ' --load-and-launch-app="' + path.resolve(path.join(__dirname, 'build/' + name.toLowerCase())) + '"';
      var env = {};
      cp.exec(command, env, function() {});
    })
  });

  grunt.registerTask('build', [
    'preprocess',
    'concat',
    'browserify'
    // ,
    // 'manifest'
  ]);

  var defaultTasks = ['build'];
  if (DEBUG) defaultTasks.push.apply(defaultTasks, [
    'samples',
    'crx',
    'compress:jane',
    'compress:kate',
    'install'
  ]);

  grunt.registerTask('publish', [
    'manifest',
    'samples',
    'compress:jane',
    'compress:kate',
    'webstore_upload'
  ]);

  grunt.registerTask('default', defaultTasks);
}
