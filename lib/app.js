var Q = require('q');
var Keeper = require('bitkeeper-js');
var Bitjoe = require('bitjoe-js');
var Queue = require('qtask');
var DHT = require('bittorrent-dht/client');
var querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var signer = require('./signer');
var QUEUE_EVENTS = ['status:success', 'status:struckout'];
var TESTING = true;

inherits(App, EventEmitter);

function App() {
  var self = this;

  var deferred = Q.defer();
  var keeperConf = require('../conf/bitkeeper');
  var bitjoeConf = require('../conf/bitjoe');

  // hack for testing
  keeperConf.dht = new DHT({
    bootstrap: keeperConf.bootstrap || false,
    nodeId: keeperConf.nodeId
  });
  // end hack for testing

  this.keeper = new Keeper(keeperConf);

  this.keeper.once('ready', function() {
    console.log('keeper ready, torrent port: ' + keeperConf.torrentPort);
    // self.keeper.promise('e9fb06e1a3b1682509767b5b4c0390b8cbc4d199'); // infoHash for 'blah0'
    checkReady();
  });

  bitjoeConf.keeper = this.keeper;

  this.bitjoe = new Bitjoe(bitjoeConf);
  this.bitjoe.once('ready', function() {
    charge();
    checkReady();
  });

  this.bitjoe.on('tx', charge);

  this.queue = new Queue({
    path: 'db/queue.db',
    autostart: false,
    throttle: 10000,
    blockOnFail: false, // continue with the next request
    strikes: false, // never give up on a request
    process: function(data) {
      return self.bitjoe.create()
        .data(data.data)
        .recipients(data.recipients || [])
        .cleartext(!!(data.public || data.cleartext))
        .setPublic(!!data.public)
        .execute();
    }
  });

  this.queue.on('status:struckout', function(resp) {
    var props = resp.input.data;
    delete props._type;

    self.emit('onchain:failed', props, resp);
  });

  this.queue.on('status:success', function(resp) {
    var props = resp.input.data;
    delete props._type;

    var result = resp.result;
    var pub = result.public;
    if (pub) {
      var pubKey = firstProp(pub);
      var shareInfo = pub[pubKey];
      props.blockchainTransactionUrl = shareInfo.txUrl;
      props.transactionHash = shareInfo.txId;
      self.emit('onchain:success', props, result);
    }
    // else {
    //   // TODO
    // }
  });

  function checkReady() {
    if (self.keeper.ready() && self.bitjoe.ready()) self.queue.start();
  }

  function charge() {
    if (self.bitjoe.getUnspents(0).length < 10) self.bitjoe.charge(3, 1e4);
  }
}

App.prototype.checkStatus = function(status) {
  return this.queue.query({
    status: status
  });
}

App.prototype.queueOnChain = function(options) {
  console.log('queue blockchain transaction');

  this.queue.push({
    cleartext: !!options.cleartext,
    public: !!options.public || TESTING,
    data: options.data,
    recipients: options.recipients || []
  });
}

// var cleartext = !!options.cleartext;
// var isPublic = !!options.public || TESTING;
// var req = this.bitjoe
//   .transaction()
//   .data(props)
//   .cleartext(cleartext)
//   .setPublic(isPublic);

// if (options.recipients) req.recipients(options.recipients);

// return req.execute()
//   .then(function(resp) {
//     // props._fileKey = resp.fileKey;
//     if (resp.public) {
//       for (var pubKey in resp.public) {
//         // only one prop here
//         if (resp.public.hasOwnProperty(pubKey)) {
//           var shareInfo = resp.public[pubKey];
//           props.blockchainTransactionUrl = shareInfo.txUrl;
//           props.transactionHash = shareInfo.txId;
//           break;
//         }
//       }
//     }
//     // else {
//     //   // TODO
//     // }

//     self.emit(isEdit ? 'edited' : 'created', props, resp);
//     delete props._type;
//     delete props._uri;
//     return props;
//   });

// return this.bitjoe.loadData(this.bitjoe.getDataTransactions())
//   .then(function(files) {
//     files = (files || []).filter(function(f) {
//       return !!f
//     });

//     if (props._uri) {
//       var resp;
//       files.some(function(f) {
//         if (f._uri === props._uri) {
//           resp = f;
//           return true;
//         }
//       });

//       return resp;
//     }

//     return files.filter(function(f) {
//       return f._type === type;
//     })
//   })
// }

App.prototype.sign = function(data) {
  return signer.sign(data);
  // .then(function(signed) {
  //   var doc = signed.doc;
  //   var sig = signed.sig;
  //   return
  // });
}

function firstProp(obj) {
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) return p;
  }
}

module.exports = App;
