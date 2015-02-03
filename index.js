var mkdirp = require('mkdirp');
var myWin;
var runtimeId = chrome.runtime.id;
var controller = require('./lib/controller');
var channelId;
var width = screen.availWidth;
var height = screen.availHeight;
var left = 0;
var top = 0;

var ls = chrome.storage.local;
window.localStorage = {
  getItem: ls.get.bind(ls),
  setItem: ls.set.bind(ls),
  removeItem: ls.remove.bind(ls),
  clear: ls.clear.bind(ls)
}

function resize() {
  // width = width === screen.availWidth ? --width : ++width;
  // height = height === screen.availHeight ? --height : ++height;
  myWin.resizeTo(width, height);
  myWin.moveTo(left, top);
}

function pulseResize() {
  // chrome has a weird bug with opacity 0.99999 + transforms, and resizing fixes the stacking contexts once and for all
  console.log('Pulse resizing');
  width--;
  height--;
  resize();
  width++;
  height++;
  resize();
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
  }, function (window) {
    myWin = window;
    resize();
    var pulse = setInterval(pulseResize, 1000);
    setTimeout(function () {
      clearInterval(pulse);
    }, 10000);
  });

  chrome.pushMessaging.getChannelId(true, function (message) {
    channelId = message.channelId;
    var evt = document.createEvent("Event");
    evt.initEvent("gotChannelId", true, true);
    evt.channelId = channelId;
    window.dispatchEvent(evt);
    chrome.pushMessaging.onMessage.addListener(onPushMessage);
    //    setInterval(function() {
    //      onPushMessage({
    //        subchannelId: '0',
    //        payload: '1'
    //      });
    //    }, 10000);
  });
}

chrome.app.runtime.onLaunched.addListener(runApp);
chrome.app.runtime.onRestarted.addListener(runApp);

function onPushMessage(msg) {
  console.debug('got push msg', msg);
  chrome.runtime.sendMessage(runtimeId, {
    type: 'push',
    args: [msg]
  });
}


// This function gets called in the packaged app model on install.
// Typically on install you will get the channelId, and send it to your
// server which will send Push Messages.
// chrome.runtime.onInstalled.addListener(function() {
// firstTimePushSetup();
// console.log("Push Messaging Sample Client installed!");
// });

// When a Push Message arrives, show it as a text notification (toast)
function showPushMessage(payload, subChannel) {
  var notification = window.webkitNotifications.createNotification(
    'icon.png',
    'Push Message',
    "Push message for you! " + payload + " [" + subChannel + "]"
  );
  notification.show();
}
