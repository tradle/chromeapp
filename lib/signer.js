var Q = require('q');
var blacklistedIds = [];

// chrome.runtime.onMessageExternal.addListener(function(request, sender, respond) {
//   if (blacklistedIds.indexOf(sender.id)) {
//     respond({
//       error: {
//         code: 401
//       }
//     });

//     return; // don't allow this extension access
//   } else if (request.document) {
//     // appendLog('from ' + sender.id + ': ' + request.myCustomMessage);
//     respond({
//       result: 'Ok, got your message'
//     });
//   } else {
//     respond({
//       result: 'Oops, I don\'t understand this message'
//     });
//   }
// });

function sign(data) {
  var deferred = Q.defer();

  chrome.runtime.sendMessage(
    'odgpijpflbniikemofmhimchpaaghbba', // signing app
    {
      type: 'sign',
      forApp: 'paranoid',
      data: {
        doc: data
      }
    },
    function (response) {
      if (response.error) deferred.reject(response.error);
      else deferred.resolve(response);
    }
  )

  return deferred.promise;
}


module.exports = {
  sign: sign
}
