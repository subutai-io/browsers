/* jshint strict: false */

var data = require('sdk/self').data;
var tabs = require('sdk/tabs');
var windows = require('sdk/windows').browserWindows;
var addonWindow = require('sdk/addon/window');
//var {open} = require('sdk/window/utils');
var timer = require('sdk/timers');
var ss = require('sdk/simple-storage');
var url = require('sdk/url');
var l10nGet = require('sdk/l10n').get;

var porto = require('./common/porto').porto;
var CWorker = require('./web-worker').Worker;

porto.ffa = true;
porto.crx = false;

porto.data = {};

porto.data.url = function(path) {
  return data.url(path);
};

porto.data.load = function(path) {
  return new Promise(function(resolve, reject) {
    resolve(data.load(path));
  });
};

porto.data.loadDefaults = function() {
  var defaults = data.load('common/res/defaults.json');
  return JSON.parse(defaults);
};

porto.tabs = {};

porto.tabs.worker = {};

porto.tabs.getActive = function(callback) {
  callback(tabs.activeTab);
};

porto.tabs.attach = function(tab, options, callback) {
  var lopt = {};
  if (options) {
    lopt.contentScriptFile =
      options.contentScriptFile && options.contentScriptFile.map(function(file) {
        return data.url(file);
      });
    lopt.contentScript = options.contentScript;
    lopt.contentScriptOptions = options.contentScriptOptions;
  }
  lopt.contentScriptFile = lopt.contentScriptFile || [];
  lopt.contentScriptOptions = lopt.contentScriptOptions || {};
  lopt.contentScriptOptions.expose_messaging = lopt.contentScriptOptions.expose_messaging || true;
  lopt.contentScriptOptions.data_path = data.url();
  var worker = tab.attach(lopt);
  this.worker[tab.index] = worker;
  worker.port.on('message-event', options.onMessage);
  //console.log('attach registers for message-event', Date.now());
  worker.port.once('message-event', function(msg) {
    if (callback) {
      // first event on port will fire callback after 200ms delay
      //console.log('starting attach callback timer', msg.event, Date.now());
      timer.setTimeout(callback.bind(this, tab), 200);
    }
  });
};

porto.tabs.query = function(url, callback) {
  var result = [];
  var tabs = windows.activeWindow.tabs;
  var reUrl = new RegExp(url + '.*');
  for (var i = 0; i < tabs.length; i++) {
    if (reUrl.test(tabs[i].url)) {
      result.push(tabs[i]);
    }
  }
  callback(result);
};

porto.tabs.create = function(url, complete, callback) {
  tabs.open({
    url: url,
    onReady: complete ? callback : undefined,
    onOpen: complete ? undefined : callback
  });
};

porto.tabs.activate = function(tab, options, callback) {
  if (options.url) {
    tab.url = options.url;
  }
  tab.activate();
  if (callback) {
    callback(tab);
  }
};

porto.tabs.eventIndex = 0;

porto.tabs.sendMessage = function(tab, msg, callback) {
  if (callback) {
    msg.response = 'resp' + this.eventIndex++;
    this.worker[tab.index].port.once(msg.response, callback);
  }
  this.worker[tab.index].port.emit('message-event', msg);
};

porto.tabs.loadOptionsTab = function(hash, callback) {
  // check if options tab already exists
  var url = data.url('common/ui/keys.html');
  this.query(url, function(tabs) {
    if (tabs.length === 0) {
      // if not existent, create tab
      if (hash === undefined) {
        hash = '';
      }
      porto.tabs.create(url + hash, true, callback.bind(this, false));
    }
    else {
      // if existent, set as active tab
      porto.tabs.activate(tabs[0], {url: url + hash}, callback.bind(this, true));
    }
  });
};

porto.storage = {};

porto.storage.get = function(id) {
  return ss.storage[id];
};

porto.storage.set = function(id, obj) {
  ss.storage[id] = obj;
};

porto.windows = {};

porto.windows.modalActive = false;

porto.windows.internalURL = new RegExp('^' + data.url(''));

// FIFO list for window options
porto.windows.options = [];

porto.windows.openPopup = function(url, options, callback) {
  var winOpts = {};
  winOpts.url = data.url(url);
  if (porto.windows.internalURL.test(winOpts.url)) {
    this.options.push(options);
  }
  winOpts.onDeactivate = function() {
    if (options && options.modal) {
      this.activate();
    }
  };
  if (callback) {
    winOpts.onOpen = callback;
  }
  windows.open(winOpts);
};

var delegate = {
  onTrack: function(window) {
    // check for porto popup
    if (window.arguments && porto.windows.internalURL.test(window.arguments[0])) {
      window.locationbar.visible = false;
      window.menubar.visible = false;
      window.personalbar.visible = false;
      window.toolbar.visible = false;
      var options = porto.windows.options.shift();
      if (options) {
        window.innerWidth = options.width;
        window.innerHeight = options.height;
        for (var main in winUtils.windowIterator()) {
          var y = parseInt(main.screenY + (main.outerHeight - options.height) / 2);
          var x = parseInt(main.screenX + (main.outerWidth - options.width) / 2);
          window.moveTo(x, y);
          break;
        }
      }
    }
  }
};

var winUtils = require('sdk/deprecated/window-utils');
var tracker = new winUtils.WindowTracker(delegate);

porto.windows.BrowserWindow = function(id) {
  this._id = id;
};

porto.windows.BrowserWindow.prototype.activate = function() {
  chrome.windows.update(this._id, {focused: true});
};

porto.util = porto.util || {};

var dompurifyWorker = require('sdk/page-worker').Page({
  contentScriptFile: [
    data.url('common/dep/purify.js'),
    data.url('dep/purifyAdapter.js')
  ]
});

porto.util.parseHTML = function(html, callback) {
  var message = {
    data: html,
    response: porto.util.getHash()
  };
  dompurifyWorker.port.once(message.response, callback);
  dompurifyWorker.port.emit('parse', message);
};

// must be bound to window, otherwise illegal invocation
porto.util.setTimeout = timer.setTimeout;
porto.util.clearTimeout = timer.clearTimeout;

porto.util.getHostname = function(source) {
  return url.URL(source).host.split(':')[0];
};

porto.util.getHost = function(source) {
  return url.URL(source).host;
};

porto.util.getDOMWindow = function() {
  return addonWindow.window;
};

porto.util.getWorker = function() {
  return CWorker;
};

porto.l10n = porto.l10n || {};

porto.l10n.get = function(id, substitutions) {
  if (substitutions) {
    return l10nGet.apply(null, [id].concat(substitutions));
  }
  else {
    return l10nGet(id);
  }
};

porto.browserAction = {};

porto.browserAction.toggleButton = null;

porto.browserAction.state = function(options) {
  this.toggleButton.state('window', options);
};

porto.request = {};

var request = require('sdk/request').Request;
porto.request.send = function(params) {
  return new Promise(function(resolve, reject) {
    var callback = function(response) {
      console.log('request completed.');
      resolve({data: response.text, status: response.status, statusText: response.statusText});
    };

    var options = {
      url: params.url,
      content: params.data,
      contentType: params.dataType,
      onComplete: callback
    };

    switch (params.method) {
      case "GET":
        this.request(options).get();
        break;
      case "HEAD":
        this.request(options).head();
        break;
      case "POST":
        this.request(options).post();
        break;
      case "PUT":
        this.request(options).put();
        break;
      case "DELETE":
        this.request(options).delete();
        break;
      default:
        throw "Invalid method invocation";
    }
  });
};

var pageWorker = require("sdk/page-worker").Page({
  contentScriptFile: data.url('ws-client.js'),
  contentURL: data.url('ws-client.html')
});

porto.request.ws = {
  init: function(url, options) {
    console.log(url);
    pageWorker.port.emit('init-ws', {
      url: url,
      protocol: options
    });
  },
  connect: function() {
    pageWorker.port.emit('close-ws');
    pageWorker.port.emit('open-ws');
  },
  disconnect: function() {
    pageWorker.port.emit('close-ws');
  },
  send: function(msg, callback) {
    console.log(msg);

    var token = porto.util.getHash();
    pageWorker.port.once(token, function(data) {
      callback(data);
    });

    msg.token = token;
    pageWorker.port.emit('send-ws-msg', msg);
  }
};

exports.porto = porto;
