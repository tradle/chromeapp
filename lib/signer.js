var Q = require('q');
var SIGNING_APP_ID = require('../conf/signing-app').id;
var blacklistedIds = [];

function sign(msg) {
  var deferred = Q.defer();
  msg = clone(msg);
  msg.type = 'sign';
  msg.forApp = {
    name: 'paranoid'
  };
    
  msg.fromApp = {
    name: msg.appName || 'Tradle'
  };

  chrome.runtime.sendMessage(
    SIGNING_APP_ID, // signing app
    msg,
    function (response) {
      if (response.error) deferred.reject(response.error);
      else deferred.resolve(response);
    }
  )

  return deferred.promise;
}

function clone(obj) {
  var copy = {};
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) copy[p] = obj[p];
  }

  return copy;
}

module.exports = {
  sign: sign
}
