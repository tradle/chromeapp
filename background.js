var mkdirp = require('mkdirp');
var controller = require('./lib/controller');
var myWin;
var channelId;
var width = screen.availWidth;
var height = screen.availHeight;
var left = 0;
var top = 0;
var pubkey = process.env.PUBKEY;

var ls = chrome.storage.local;
window.localStorage = {
  getItem: ls.get.bind(ls),
  setItem: ls.set.bind(ls),
  removeItem: ls.remove.bind(ls),
  clear: ls.clear.bind(ls)
}

function init() {
  chrome.app.runtime.onLaunched.addListener(runApp);
  chrome.app.runtime.onRestarted.addListener(runApp);
}

function setChild(window) {
  myWin = window;
  myWin.contentWindow.addEventListener('load', function() {
    var webview = myWin.contentWindow.document.querySelector('webview');
    var ua = webview.getUserAgent() + ';in a webview';
    // hack for testing auto-logged in users
    if (pubkey) ua += ';pubkey:' + pubkey;

    webview.setUserAgentOverride(ua);

    if (pubkey) {
      var urls = [ '*://tradle.io/*' ];
      webview.request.onBeforeRequest.addListener(
        function(info) {
          console.log(info.url);
          if (info.url.indexOf('boot.js?app=') !== -1 &&
              info.url.indexOf('-pubkey') === -1) {
            console.log('Adding pubkey param');
            return {
              redirectUrl: info.url + '&-pubkey=' + pubkey
            }
          }
        },
        // filters
        {
          urls: urls,
          types: ['script']
        },
        // extraInfoSpec
        ['blocking']
      );

      var requestFilter = {
        urls: ['<all_urls>']
      };

      var extraInfoSpec = ['requestHeaders', 'blocking'];
      webview.request.onBeforeSendHeaders.addListener(function(details) {
        console.log('adding pubkey header');
        var headers = details.requestHeaders.slice();
        headers.push({
          name: 'x-tradle-pubkey',
          value: pubkey
        });

        return {
          requestHeaders: headers
        }
      }, requestFilter, extraInfoSpec);
    }
  });
}

function runApp() {
  // Do the normal setup steps every time the app starts, listen for events.
  // setupPush();
  chrome.app.window.create('index.html', {
    outerBounds: {
      width: width,
      height: height,
      top: top,
      left: left
    }
  }, setChild);

  // chrome.pushMessaging.getChannelId(true, function(message) {
  //   channelId = message.channelId;
  //   var evt = document.createEvent("Event");
  //   evt.initEvent("gotChannelId", true, true);
  //   evt.channelId = channelId;
  //   window.dispatchEvent(evt);
  //   chrome.pushMessaging.onMessage.addListener(onPushMessage);
  //   //    setInterval(function() {
  //   //      onPushMessage({
  //   //        subchannelId: '0',
  //   //        payload: '1'
  //   //      });
  //   //    }, 10000);
  // });
}

// function onPushMessage(msg) {
//   console.debug('got push msg', msg);
//   chrome.runtime.sendMessage(chrome.runtime.id, {
//     type: 'push',
//     args: [msg]
//   });
// }


// // This function gets called in the packaged app model on install.
// // Typically on install you will get the channelId, and send it to your
// // server which will send Push Messages.
// // chrome.runtime.onInstalled.addListener(function() {
// // firstTimePushSetup();
// // console.log("Push Messaging Sample Client installed!");
// // });

// // When a Push Message arrives, show it as a text notification (toast)
// function showPushMessage(payload, subChannel) {
//   var notification = window.webkitNotifications.createNotification(
//     'icon.png',
//     'Push Message',
//     "Push message for you! " + payload + " [" + subChannel + "]"
//   );
//   notification.show();
// }

init();
