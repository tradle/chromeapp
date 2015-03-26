var doc = document;
var bgPage;
var runtimeId;
var channelId;
var tabId;
var Tradle = require('./app');
var tradle;
var connected;
var serverOrigin;
var appHome;
var webviewOrigin;
var notificationInfo = {};
var appMethods = {
  // true if has callback
  sign: true,
  checkStatus: true,
  queueOnChain: false
}

//  visibilityState,

/* START HTML elements / JQuery objects */
var webview;

setupTradle()

chrome.runtime.getBackgroundPage(function(page) {
  bgPage = page;
  channelId = bgPage.channelId;
  runtimeId = bgPage.runtimeId;
  tabId = bgPage.tabId;
});

/* END   HTML elements / JQuery objects */

//  echo,
var objectConstructor = {}.constructor;
var RPC = {
  log: function() {
    var args = [].slice.call(arguments);
    // args.unshift('FROM WEBVIEW:');
    console.log.apply(console, args);
  },
  focus: window.focus.bind(window),
  setAttribute: function(sel, attribute, value) {
    $(sel).setAttribute(attribute, value);
  },
  newWindow: function(url) {
    var w = window.open(url, '_blank');
    w.opener = null;
  },
  tradle: {},
  //      focus: function() {
  //        chrome.tabs.update(tabId, {active: true}); // tabs are not available in packaged apps, only extensions
  //      },
  notifications: {
    /**
     * @param callback - a message type to send back when the notification has been created
     */
    create: function(id, options, callback) {
      return proxyWithCallback(this._path, arguments, 2);
    },
    clear: function(id, callback) {
      return proxyWithCallback(this._path, arguments, 1);
    },
    onButtonClicked: function(callbackEvent) {
      var callback = getCallback(callbackEvent);
      leaf(chrome, this._path).addListener(callback);
    },
    onClicked: function(callbackEvent) {
      var callback = getCallback(callbackEvent);
      leaf(chrome, this._path).addListener(callback);
    },
    onDisplayed: function(callbackEvent) {
      var callback = getCallback(callbackEvent);
      leaf(chrome, this._path).addListener(callback);
    },
    onClosed: function(callbackEvent) {
      var callback = getCallback(callbackEvent);
      leaf(chrome, this._path).addListener(callback);
    }
  }
}

// proxy methods to tradle, callback on promise fulfillment/rejection
Object.keys(appMethods).forEach(function(method) {
  RPC.tradle[method] = function() {
    var args = [].slice.call(arguments);
    var callback = appMethods[method] && getCallback(args.pop());
    var promise = tradle[method].apply(tradle, args);
    if (callback) {
      return promise.then(function(resp) {
          callback(null, resp)
        })
        .catch(function(err) {
          callback({
            message: err.message
          })
        })
    }
  }
});

var $ = function() {
  return document.querySelector.apply(document, arguments);
}

chrome.runtime.onMessage.addListener(
  function(msg, sender, sendResponse) {
    if (sender.id == runtimeId) {
      if (msg.type === 'push')
        postMessage(msg);

      sendResponse({
        "result": "OK"
      });
    } else {
      sendResponse({
        "result": "Sorry, you're not on the whitelist, message ignored"
      });
    }
  }
);

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
setPaths(RPC);

function doNothing() {}

function has(obj, key) {
  return hasOwnProperty.call(obj, key);
}

function setPaths(obj) {
  for (var pkgName in obj) {
    var pkg = obj[pkgName];
    pkg._path = (obj._path ? obj._path + '.' : '') + pkgName;
    switch (typeof pkg) {
      case 'function':
        obj[pkgName] = pkg.bind(pkg);
        break;
      case 'object':
        setPaths(pkg);
        break;
    }
  }
}

function shallowCopy(obj) {
  if (obj === null || typeof obj !== 'object')
    return obj;

  var copy = {};
  for (var prop in obj) {
    if (has(obj, prop)) {
      var val = obj[prop];
      if (val === null)
        continue;
      else if (val instanceof HTMLElement) {
        obj[prop] = {
          id: val.id,
          attributes: val.attributes
        };

        continue;
      } else if (typeof val !== 'object')
        copy[prop] = val;
      else if (val.constructor === objectConstructor) {
        // don't copy "real" objects, only objects that are primitive json
        var canCopy = true;
        for (var subProp in val) {
          if (typeof val[subProp] === 'function') {
            canCopy = false;
            break;
          }
        }

        if (canCopy)
          copy[prop] = shallowCopy(val);
      }
    }
  }

  return copy;
}

function index(obj, i) {
  return obj[i];
}

//  function leaf(obj, path, separator) {
//    if (typeof obj == 'undefined' || !obj)
//      return null;
//
//    return path.split(separator || '.').reduce(index, obj);
//  };
function _leaf(obj, path, separator) {
  return path.split(separator).reduce(index, obj);
}

function leaf(obj, path, separator) {
  if (typeof obj == 'undefined' || !obj)
    return null;

  separator = separator || '.';
  var lastSep = path.lastIndexOf(separator),
    parent,
    child;

  if (lastSep == -1)
    return obj[path] || obj;
  else {
    parent = _leaf(obj, path.slice(0, lastSep), separator);
    child = parent[path.slice(lastSep + separator.length)];
  }

  if (typeof child == 'function')
    return child.bind(parent);
  else
    return child;
}

function proxyWithCallback(path, args, callbackIdx) {
  var callback = args[callbackIdx],
    last = path.lastIndexOf('.'),
    context = last == -1 ? chrome : leaf(chrome, path.slice(0, last));

  if (callback)
    args[callbackIdx] = getCallback(callback);
  else
    [].push.call(args, doNothing);

  leaf(chrome, path).apply(context, args);
}

function getCallback(eventName) {
  return function() {
    var args = [].slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
      args[i] = shallowCopy(args[i]);
    }

    postMessage({
      type: eventName,
      args: args
    });
  }
}

window.addEventListener('load', function onload() {
  webview = $('webview');
  if (!webview) return;

  appHome = webview.src;
  serverOrigin = appHome.slice(0, appHome.indexOf('/', 8)); // cut off http(s)://
  webviewOrigin = serverOrigin + "/*";

  // send channelId on every loadstop, as we have a one page app and it needs channelId every time the page is reloaded
  webview.addEventListener('loadstart', function() {
    connected = false;
  });

  webview.addEventListener('loadstop', function() {
    var pingInterval = setInterval(function() {
      if (connected) {
        clearInterval(pingInterval);
        return;
      }

      postMessage({
        type: 'ping'
      });
    }, 1000);

    sendChannelId();
  });

  // webview.addEventListener('permissionrequest', handlePermissionRequest);
  // window.addEventListener('focus', changeVisibility); // maybe use focusin/focusout?
  // window.addEventListener('blur', changeVisibility);

  chrome.notifications.onClicked.addListener(function(id) {
    var info = notificationInfo[id];
    if (!info) return;

    delete notificationInfo[id];
    postMessage({
      type: 'navigate',
      args: ['view/' + info.resource._uri]
    });

    // if (info.txInfo.public) {
    //   window.open(info.txInfo.txUrl);
    // }
  });
});

window.addEventListener('message', function(e) {
  if (e.origin !== serverOrigin) return;

  //      if (!connected) {
  //        connected = true;
  //        console.log('connected');
  //        sendChannelId();
  //      }

  connected = true;
  var data = e.data,
    type = data.type,
    rpc = /^rpc:/.test(type) ? type.slice(4) : null;

  if (type === 'ping:response') return;

  if (rpc) {
    var dotIdx = rpc.lastIndexOf('.');
    var parent = dotIdx == -1 ? RPC : leaf(RPC, rpc.slice(0, dotIdx));
    var fn = parent[rpc.slice(dotIdx + 1)];
    fn.apply(parent, data.args || []);
    return;
  }
});


// var changeVisibility = _.debounce(function(e) {
function changeVisibility(e) {
    //    var newState = e.type === 'blur' ? 'hidden' : 'visible',
    //        prev = visibilityState;
    //
    //    if (newState === visibilityState)
    //      return;
    //
    //    visibilityState = newState;
    var visible = e.type != 'blur';
    postMessage({
      type: 'visibility',
      visible: visible
    });

    console.log("page has become", visible ? 'visible' : 'hidden');
  }
  // }, 2000, true);

function sendChannelId() {
  if (channelId)
    _sendChannelId(channelId);
  else {
    bgPage.addEventListener('gotChannelId', function(e) {
      channelId = e.channelId;
      _sendChannelId(channelId);
    });
  }
}

//  function sendEcho() {
//    postMessage('echo');
//  };

// function handlePermissionRequest(e) {
//   if (e.url.indexOf(serverOrigin) !== 0) {
//     e.request.deny();
//     return;
//   }

//   var allowed = false;
//   if (e.permission === 'pointerLock' || e.permission === 'media' || e.permission === 'geolocation') {
//     allowed = true;
//     e.request.allow();
//   } else {
//     e.request.deny();
//   }

//   console.log("[" + e.target.id + "] permissionrequest: permission=" + e.permission + " " + (allowed ? "allowed" : "DENIED"));
// }

function _sendChannelId(channelId) {
  //    connected = false;
  postMessage({
    type: 'channelId',
    channelId: channelId
  });
}

function postMessage(msg) {
  webview.contentWindow.postMessage(msg, webviewOrigin);
}

function setupTradle() {
  if (tradle) return;

  tradle = new Tradle();

  tradle.on('onchain:failed', function() {
    postMessage({
      type: 'onchain:failed',
      args: [].slice.call(arguments)
    });
  });

  tradle.on('onchain:success', function(item, txInfo) {
    postMessage({
      type: 'onchain:success',
      args: [].slice.call(arguments)
    });

    var opt = {
      type: 'basic',
      title: 'Sync complete',
      message: 'synced resource via the blockchain',
      iconUrl: 'Logo-64.png'
    };

    var id = '' + Math.floor(Math.random() * 64000);
    notificationInfo[id] = {
      resource: item,
      txInfo: txInfo
    };

    chrome.notifications.create(id, opt, function(id) {});
  });
}

chrome.runtime.onSuspend.addListener(function() {
  console.log("Shutting down");
});
