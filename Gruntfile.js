var preprocess = require('preprocess');
var fs = require('fs');
var browserify = require('browserify');

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  var DEBUG = !!grunt.option('debug');
  var pkgJson = grunt.file.readJSON('package.json');
  var appName = pkgJson.name;
  var appUrl = pkgJson.url + '?-webview=y';

  grunt.registerTask('setup', [
    'githooks'
  ]);

  grunt.registerTask('default', [
    'preprocess',
    'concat',
    'browserify'
    // ,
    // 'copy:app',
    // 'renameCopy'
  ]);

  grunt.registerTask('renameCopy', function () {
    var manifest = grunt.file.readJSON('app/manifest.json');
    manifest.name += '2';
    grunt.file.write('appCopy/manifest.json', JSON.stringify(manifest, null, 2));
  });

  grunt.registerTask('browserify', function () {
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
      .require('./lib/dns.js', {
        expose: 'dns'
      })
      // .transform('brfs')
      .bundle()
      .pipe(fs.createWriteStream('app/bundle.js'))
      .on('end', done);
  });

  // grunt.registerTask('fixmapping', function() {
  //   var bundle = grunt.file.read('app/bundle.js')
  //         .replace(/require\(\'fs\'\)/g, 'require(\'browserify-fs\')')
  //         .replace(/require\(\'dgram\'\)/g, 'require(\'chrome-dgram\')')
  //         .replace(/require\(\'mime\'\)/g, 'require(\'browserify-mime\')');

  //   grunt.file.write('app/bundle.js', bundle);
  // });

  grunt.registerTask('preprocess', function () {
    preprocess.preprocessFileSync(
      'index.html',
      'app/index.html', {
        APP_TITLE: appName,
        // APP_HOME: appUrl + (DEBUG ? '&amp;-min=n' : ''),
        APP_HOME: 'http://tradle.io/app/Tradle/view/profile?-min=n&-webview=y',
        // APP_HOME: 'http://tradle.io/app/Tradle/list/commerce/trading/Lead?-webview=y&amp;-min=n&submittedBy=_me',
        // APP_HOME: 'http://tradle.io/app/Tradle/chooser/commerce/trading/Feed?-webview=y&-min=n&activated=true&amp;eventClassRangeUri=!%24this.null&amp;-ref=960fab11-d633-4491-86d2-64a61dba728a&amp;$title=Choose+an+indicator&amp;$type=http://www.hudsonfog.com/voc/commerce/trading/TradleFeed&amp;$propB=feed&amp;$propA=tradle&amp;$forResource=http://tradle.io/sql/www.hudsonfog.com/voc/commerce/trading/Tradle%3Fuuid%3D0a745f6b-79a8-49b8-86bf-b04853c4a999',
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
    copy: {
      app: {
        files: [
          // includes files within path
          {
            cwd: 'app',
            expand: true,
            src: ['**/*'],
            dest: 'appCopy/'
          }
        ],
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
    // exec: {
    //   browserify: {
    //     cmd: 'browserify -t brfs ' +
    //             '-r fs:browserify-fs ' +
    //             '-r dgram:chrome-dgram ' + 
    //             '-r mime:browserify-mime ' + 
    //             'index.js > app/bundle.js' + (DEBUG ? ' --debug' : '')
    //   }
    // },
    // watch: {
    //   options: {
    //     livereload: true
    //   },
    //   dist: {
    //     files: ['./**, !app/**', '!Gruntfile.js'],
    //     tasks: ['exec:browserify']
    //   }
    // }
    // ,

    // browserify: {
    //   dist: {
    //     files: {
    //       'app/bundle.js': ['index.js']
    //     },
    //     options: {
    //       transforms: ['browserify-swap', {
    //         '@packages': [
    //           'dgram',
    //           'fs'
    //         ],
    //         all: {
    //           '^fs$': 'browserify-fs',
    //           '^dgram$': 'chrome-dgram'
    //         }
    //       }]
    //     }
    //   }
    // }
  });
}
