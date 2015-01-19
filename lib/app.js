var Q = require('q');
var Keeper = require('bitkeeper-js');
var Bitjoe = require('bitjoe-js');
var DHT = require('bittorrent-dht/client');
var querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

inherits(App, EventEmitter);

function App() {
  var self = this;

  var deferred = Q.defer();
  var keeperConf = require('bitkeeper-js/conf/config');
  var bitjoeConf = require('bitjoe-js/conf/config');

  keeperConf.dht = new DHT({
    bootstrap: false
  });

  this.keeper = new Keeper(keeperConf);

  bitjoeConf.keeper = this.keeper;
  this.bitjoe = new Bitjoe(bitjoeConf);

  this.keeper.on('ready', function () {
    console.log('keeper ready');
    checkReady();
  });

  this.bitjoe.on('ready', function () {
    console.log('bitjoe ready');
    checkReady();
  });

  this.ready = deferred.promise;
  this.ready.done(function () {
    self.ready = true;
  });

  function checkReady() {
    if (self.keeper.ready() && self.bitjoe.ready()) deferred.resolve();
  }
}

App.prototype.ajax = function (options) {
  var self = this;

  if (this.ready !== true) return this.ready.then(function () {
    return self.ajax(options);
  });

  var url = options.url;
  url = url.slice(url.indexOf('/api/') + 5); // cut off /api/
  url = url.slice(url.indexOf('/') + 1); // cut off version
  var isEdit = url.charAt(0) === 'e';
  var isMake = url.charAt(0) === 'm';
  var query;
  var type;
  if (isEdit || isMake) {
    type = url.slice(2);
    query = options.data;
  } else {
    var parts = url.split('?');
    query = parts.length > 1 ? querystring.parse(parts[1]) : {};
    type = parts[0];
  }

  type = decodeURIComponent(type);
  var props = {};
  for (var p in query) {
    if (query.hasOwnProperty(p)) {
      if (/^[a-zA-Z_]/.test(p)) {
        props[p] = query[p];
      }
    }
  }

  props._type = type;
  if ((props.id || props.uuid) && !props._uri) {
    var uriProps = {};
    if (props.id) uriProps.id = props.id;
    if (props.uuid) uriProps.uuid = props.uuid;

    props._uri = 'http://tradle.io/sql/' + type.slice(7) + '?' + querystring.stringify(uriProps);
  }

  if (isEdit || isMake) {
    return this.bitjoe
      .transaction()
      .data(props)
      .setPublic()
      // .recipients()
      .execute()
      .then(function (resp) {
        props._fileKey = resp.fileKey;
        self.emit(isEdit ? 'edited' : 'created', props, resp);
        return props;
      });
  }

  return this.bitjoe.loadData(this.bitjoe.getDataTransactions())
    .then(function (files) {
      files = (files || []).filter(function (f) {
        return !!f
      });

      if (props._uri) {
        var resp;
        files.some(function (f) {
          if (f._uri === props._uri) {
            resp = f;
            return true;
          }
        });

        return resp;
      }

      return files.filter(function (f) {
        return f._type === type;
      })
    })
}

module.exports = App;
