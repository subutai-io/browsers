'use strict';

define(function(require, exports, module) {

  var porto = require('porto');

  porto.crx = false;
  porto.ffa = false;
  porto.sfx = true;

  var dompurify = require('dompurify');

  porto.data = {};

  porto.data.url = function(path) {
    return safari.extension.baseURI + path;
  };

  porto.data.load = function(path) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', safari.extension.baseURI + path);
      req.responseType = 'text';
      req.onload = function() {
        if (req.status === 200 || req.status === 0) {
          resolve(req.response);
        }
        else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = function() {
        console.log('request failed');
        reject(new Error('Network Error'));
      };
      req.send();
    });
  };

  porto.request = {};
  porto.request.send = function(params) {
    return new Promise(function(resolve, reject) {
      $.ajax({
         // The URL for the request
         url: params.url,

         // The data to send (will be converted to a query string)
         data: params.data,

         // Whether this is a POST or GET request
         type: params.method,

         // The type of data we expect back
         dataType: params.dataType
       })
       // Code to run if the request succeeds (is done);
       // The response is passed to the function
       .done(function(data, status, xhr) {
         console.log(data);
         resolve({data: data, status: xhr.status, statusText: xhr.statusText});
       })
       // Code to run if the request fails; the raw request and
       // status codes are passed to the function
       .fail(function(xhr, status, errorThrown) {
         reject({responseText: xhr.responseText, status: xhr.status, statusText: xhr.statusText});
       })
       // Code to run regardless of success or failure;
       .always(function(xhr, status) {
         console.log("The request is complete!");
       });
    });
  };

  var that = this;
  that.ws = null;
  var connected = false;

  var serverUrl = null;
  var protocol = null;
  var connectionStatus = '';

  var openWs = function() {
    if (that.ws) {
      return;
    }

    if (!serverUrl) {
      throw new Error("cannot connect to null url");
    }
    if (protocol) {
      that.ws = new WebSocket(serverUrl, protocol);
    }
    else {
      that.ws = new WebSocket(serverUrl);
    }
    that.ws.onopen = onOpen;
    that.ws.onclose = onClose;
    that.ws.onmessage = onMessage;
    that.ws.onerror = onError;

    connectionStatus = 'OPENING ...';
  };

  var sendWs = function(msg, callback) {
    try {
      console.log('sending message: ' + serverUrl);
      console.log(msg);
      if (!that.ws) {
        openWs();
      }
      that.ws.onmessage = function(event) {
        callback({data: event.data});
      };
      that.ws.send(msg.cmd);
    }
    catch (err) {
      callback({error: 'Couldn\'t send command to SubutaiTray'});
    }
  };

  var closeWs = function() {
    if (that.ws) {
      console.log('CLOSING ...');
      that.ws.close();
    }
    connected = false;
    connectionStatus = 'CLOSED';
  };

  var onOpen = function() {
    console.log('OPENED: ' + serverUrl + ':' + protocol);
    connected = true;
    connectionStatus = 'OPENED';
  };

  var onClose = function() {
    console.log('CLOSED: ' + serverUrl + ':' + protocol);
    that.ws = null;
  };

  var onMessage = function(event) {
    var data = event.data;
    console.log('message received: ' + data);
  };

  var onError = function(event) {
    console.log(event.data);
  };

  porto.request.ws = {
    init: function(url, options) {
      serverUrl = url;
      protocol = options;
    },
    connect: function() {
      openWs();
    },
    disconnect: function() {
      closeWs();
    },
    send: function(msg, callback) {
      console.log(msg);
      sendWs(msg, callback);
    }
  };

  porto.data.loadDefaults = function() {
    return require('../lib/json-loader!common/res/defaults.json');
  };

  porto.tabs = {};

  porto.tabs.getActive = function(callback) {
    // get selected tab, "*://*/*" filters out non-http(s)
    callback(safari.application.activeBrowserWindow.activeTab);
  };

  porto.tabs.attach = function(tab, options, callback) {
    function executeScript(file, callback) {
      if (file) {
        safari.extension.addContentScriptFromURL(file, [tab.url], [], false);
        executeScript(options.contentScriptFile.shift(), callback);
      }
      else {
        callback(tab);
      }
    }

    executeScript(options.contentScriptFile.shift(), function() {
      if (options.contentScript) {
        safari.extension.addContentScript(options.contentScript, [tab.url], [], false);
      }
      callback(tab);
    });
  };

  porto.tabs.query = function(url, callback) {
    var result = [];
    var tabs = safari.application.activeBrowserWindow.tabs;
    //if (!/\*$/.test(url)) {
    //  url += '*';
    //}
    var reUrl = new RegExp(url + '.*');
    for (var i = 0; i < tabs.length; i++) {
      if (reUrl.test(tabs[i].url)) {
        result.push(tabs[i]);
      }
    }
    callback(result);
  };

  porto.tabs.create = function(url, complete, callback) {
    var createProperties = {url: url};
    var tab = safari.application.activeBrowserWindow.openTab(
      createProperties.visibility || 'foreground',
      createProperties.index || safari.application.activeBrowserWindow.tabs.length);
    tab.url = createProperties.url;
    callback && callback(tab);
  };

  porto.tabs.activate = function(tab, options, callback) {
    if (options.url) {
      var tabs = safari.application.activeBrowserWindow.tabs;
      tabs.forEach(function(item) {
        if (item.url === options.url) {
          tab = item;
        }
      });
    }
    tab.activate();
  };

  porto.tabs.sendMessage = function(tab, msg, callback) {
    console.log('sending message to tab');
    chrome.tabs.sendMessage(tab.id, msg, null, callback);
    //tab.page.dispatchMessage("message-event", msg);
  };

  porto.tabs.loadOptionsTab = function(hash, callback) {
    // check if options tab already exists
    var url = safari.extension.baseURI + 'common/ui/keys.html';
    this.query(url, function(tabs) {
      if (tabs.length === 0) {
        // if not existent, create tab
        if (hash === undefined) {
          hash = '';
        }
        porto.tabs.create(url + hash, callback !== undefined, callback.bind(this, false));
      }
      else {
        // if existent, set as active tab
        if (hash === undefined) {
          hash = '';
        }
        porto.tabs.activate(tabs[0], {url: url + hash}, callback.bind(this, true));
      }
    });
  };

  porto.storage = {};

  porto.storage.get = function(id) {
    return JSON.parse(window.localStorage.getItem(id));
  };

  porto.storage.set = function(id, obj) {
    window.localStorage.setItem(id, JSON.stringify(obj));
  };

  porto.windows = {};

  porto.windows.modalActive = false;

  function setPopover(popover) {
    for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
      safari.extension.toolbarItems[i].popover = popover;
    }
  }

  porto.windows.openPopup = function(url, options, callback) {
    try {
      var activeWindow = safari.application.openBrowserWindow();
      var tab = activeWindow.activeTab;//openTab("foreground", -1);
      tab.url = safari.extension.baseURI + url;

      if (callback) {
        callback(new porto.windows.BrowserWindow(tab));
      }
    }
    catch (err) {
      console.error(err);
    }
  };

  porto.windows.BrowserWindow = function(tab) {
    this._tab = tab;
  };

  porto.windows.BrowserWindow.prototype.activate = function() {
    this._tab.activate();
  };

  porto.windows.BrowserWindow.prototype.close = function() {
    this._tab.close();
  };

  porto.util = porto.util || {};

  // Add a hook to make all links open a new window
  // attribution: https://github.com/cure53/DOMPurify/blob/master/demos/hooks-target-blank-demo.html
  dompurify.addHook('afterSanitizeAttributes', function(node) {
    // set all elements owning target to target=_blank
    if ('target' in node) {
      node.setAttribute('target', '_blank');
    }
    // set MathML links to xlink:show=new
    if (!node.hasAttribute('target') &&
        (node.hasAttribute('xlink:href') || node.hasAttribute('href'))) {
      node.setAttribute('xlink:show', 'new');
    }
  });

  porto.util.parseHTML = function(html, callback) {
    callback(dompurify.sanitize(html, {SAFE_FOR_JQUERY: true}));
  };

  // must be bound to window, otherwise illegal invocation
  porto.util.setTimeout = window.setTimeout.bind(window);
  porto.util.clearTimeout = window.clearTimeout.bind(window);

  porto.util.getHostname = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.hostname;
  };

  porto.util.getHost = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.host;
  };

  porto.util.getDOMWindow = function() {
    return window;
  };

  porto.browserAction = {};

  porto.browserAction.state = function(options) {
    if (typeof options.badge !== 'undefined') {
      if (safari.extension.toolbarItems[0]) {
        safari.extension.toolbarItems[0].badge = options.badge;
      }
    }
    if (typeof options.badgeColor !== 'undefined') {
      //no op
    }
  };

  exports.porto = porto;

});
