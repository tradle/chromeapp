var Q = require('q');
var SIGNING_APP_ID = require('../conf/signing-app').id;
var blacklistedIds = [];

function sign(data, appName) {
  var deferred = Q.defer();
  var msg = clone(data);
  msg.type = 'sign';
  msg.forApp = {
    name: 'paranoid'
  };

  msg.fromApp = {
    name: appName || 'Tradle'
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
