var preprocess = require('preprocess');
var fs = require('fs');
var browserify = require('browserify');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var DEBUG = !!grunt.option('debug');
  var pkgJson = grunt.file.readJSON('package.json');
  var appName = pkgJson.name;
  var appUrl = pkgJson.url + '?-webview=y';

  grunt.registerTask('setup', [
    'githooks'
  ]);

  grunt.registerTask('default', ['build']);

  grunt.registerTask('build', [
    'preprocess',
    'concat',
    'browserify'
  ]);

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
      .bundle()
      .pipe(fs.createWriteStream('app/bundle.js'))
      .on('end', done);
  });

  grunt.registerTask('preprocess', function() {
    preprocess.preprocessFileSync(
      'index.html',
      'app/index.html', {
        APP_TITLE: appName,
        APP_HOME: 'http://tradle.io/app/KYC/home/',
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
    }
  });
}
