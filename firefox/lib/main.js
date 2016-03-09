'use strict';

var system = require('sdk/system');
var ss = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require('sdk/page-mod');
var tabs = require('sdk/tabs');
var unload = require('sdk/system/unload');
var l10nGet = require("sdk/l10n").get;

var ToggleButton = require("sdk/ui/button/toggle").ToggleButton;
var Panel = require('sdk/panel').Panel;

var porto = require('./porto-lib.js').porto;
var model = require('./common/pgpModel');
var keyring = require('./common/keyring');
var controller = require('./common/controller/main.controller');
var subController = require('./common/controller/sub.controller');
var prompts = require('./prompt');

var pageMods = {};
// recipients of encrypted mail
var eRecipientBuffer = {};
var scannedHosts = [];

var portoPanel = null;

unload.when(function(reason) {
  // reason is never 'uninstall' https://bugzilla.mozilla.org/show_bug.cgi?id=571049
  if (reason === 'uninstall' || reason === 'disable') {
    //console.log("Extension disabled or unistalled");
    if (prompts.confirm(l10nGet("clear_localstorage_confirm_title"), l10nGet("clear_localstorage_confirm_message"))) {
      clearStorage();
    }
  }
});

function init() {
  controller.extend({
    initScriptInjection: function() {
      injectMainCS();
    },
    activate: function() {
    },
    deactivate: function() {
    }
  });
  model.init();
  initAddonButton();
  activatePageMods();
  controller.handleMessageEvent({event: 'activate'});
}

init();

function onPanelMessage(msg) {
  switch (msg.event) {
    case 'close-popup':
      portoPanel.hide();
      break;
    case 'browser-action':
    case 'activate':
    case 'deactivate':
      portoPanel.hide();
      controller.handleMessageEvent(msg, null, portoPanel.postMessage.bind(portoPanel));
      break;
    default:
      controller.handleMessageEvent(msg, null, portoPanel.postMessage.bind(portoPanel));
  }
}

function initAddonButton() {
  portoPanel = new Panel({
    width: 202,
    height: 310,
    contentURL: data.url('common/ui/popup.html'),
    onMessage: onPanelMessage,
    onHide: function() {
      if (porto.browserAction.toggleButton) {
        porto.browserAction.toggleButton.state('window', {checked: false});
      }
    },
    onShow: function() {
      this.postMessage({"event": "init"});
    }
  });
  porto.browserAction.toggleButton = new ToggleButton({
    id: 'porto-options',
    label: 'SS E2E Plugin',
    icon: {
      '16': data.url('common/img/icons/ss-icon16x16.png'),
      '48': data.url('common/img/icons/ss-icon48x48.png')
    },
    onChange: function(state) {
      if (state.checked) {
        portoPanel.show({
          position: porto.browserAction.toggleButton
        });
      }
    }
  });
}

function activatePageMods() {
  injectMainCS();
  injectMessageAdapter();
  injectEncryptDialog();
  injectSignDialog();
  injectEmbeddedOptions();
}

function deactivate() {
  for (var mod in pageMods) {
    pageMods[mod].destroy();
  }
}

function clearStorage() {
  for (var obj in ss.storage) {
    delete ss.storage[obj];
  }
}

function injectMainCS() {

  var filterURL = controller.getWatchListFilterURLs();

  var modOptions = {
    include: filterURL,
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/ui/inline/porto-cs.js')
    ],
    contentStyle: getDynamicStyle('common/ui/inline/framestyles.css'),
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    },
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'top', 'frame']
  };

  if (pageMods.mainPageMod !== undefined) {
    try {
      pageMods.mainPageMod.destroy();
    } catch (e) {
      console.log('Destroying active page-mod failed', e);
    }
  }

  //console.log('modOptions.include', modOptions.include);
  pageMods.mainPageMod = pageMod.PageMod(modOptions);

}

function onCsAttach(worker) {
  //console.log("Attaching content scripts", worker.url);
  var pageHidden = false;
  worker.port.on('port-message', subController.handlePortMessage);
  worker.port.on('connect', function(portName) {
    var eventName = 'port-message' + '.' + portName;
    var port = {
      name: portName,
      postMessage: function(message) {
        if (!pageHidden) {
          worker.port.emit(eventName, message);
        }
      },
      disconnect: function() {
        subController.removePort({name: portName});
      },
      ref: worker.port
    };
    subController.addPort(port);
  });
  worker.port.on('disconnect', function(portName) {
    subController.removePort({name: portName});
  });
  worker.on('pagehide', function() {
    pageHidden = true;
  });
  worker.on('detach', function() {
    subController.removePort(worker.port);
  });
  worker.port.on('message-event', function(msg) {
    var that = this;
    switch (msg.event) {
      case 'get-l10n-messages':
        if (!pageHidden) { // otherwise exception
          var result = {};
          msg.ids.forEach(function(id) {
            result[id] = l10nGet(id);
          });
          that.emit(msg.response, result);
        }
        break;
      case 'data-load':
        if (!pageHidden) { // otherwise exception
          var result = data.load(msg.path);
          that.emit(msg.response, result);
        }
        break;
      default:
        controller.handleMessageEvent(msg, null, function(respData) {
          if (!pageHidden) { // otherwise exception
            that.emit(msg.response, respData);
          }
        });
    }
  });
  if (/^resource.*keys\.html/.test(worker.url)) {
    porto.tabs.worker[worker.tab.index] = worker;
  }
}

function getDynamicStyle(path) {
  var css = data.load(path);
  var token = /\.\.\/\.\./g;
  css = css.replace(token, data.url('common'));
  return css;
}

function injectMessageAdapter() {
  pageMods.messageAdapterPageMod = pageMod.PageMod({
    include: [
      data.url('common/ui/modal/_popup-enter-key-password.html*'),
      data.url('common/ui/keys.html*'),
      data.url('common/ui/managements.html*')
    ],
    onAttach: onCsAttach,
    contentScriptFile: data.url('common/ui/porto.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      expose_messaging: true,
      data_path: data.url()
    }
  });
}

function injectEncryptDialog() {
  pageMods.encryptDialogPageMod = pageMod.PageMod({
    include: 'about:blank?porto=encryptDialog*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/ui/porto.js'),
      data.url('common/ui/inline/dialogs/encryptDialog.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/porto.css"),
      data.url("common/ui/inline/dialogs/encryptDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectSignDialog() {
  pageMods.signDialogPageMod = pageMod.PageMod({
    include: 'about:blank?porto=signDialog*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('common/ui/porto.js'),
      data.url('common/ui/inline/dialogs/signDialog.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/porto.css"),
      data.url("common/ui/inline/dialogs/signDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedOptions() {
  pageMods.embeddedOptionsPageMod = pageMod.PageMod({
    include: 'about:blank?porto=options*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('common/dep/bootstrap-sortable/bootstrap-sortable.js'),
      data.url('common/ui/porto.js'),
      data.url('common/scripts/libs/jquery.colorbox-min.js'),
      data.url('common/scripts/libs/sweetalert.min.js'),
      data.url('common/scripts/scripts.js'),
      data.url('common/ui/messageDispatcher.js'),
      data.url('common/ui/keys.js'),
      data.url('common/ui/managements.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/dep//bootstrap-sortable/bootstrap-sortable.css"),
      data.url("common/ui/porto.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}
