'use strict';

var porto = porto || null;

requirejs.config({
  baseUrl: 'lib', paths: {
    jquery: '../common/dep/jquery.min',
    openpgp: '../dep/openpgp',
    porto: '../common/ui/porto',
    parser_rules: '../common/dep/wysihtml5/js/advanced_parser_rules',
    dompurify: '../common/dep/purify'
  }, shim: {
    'porto': {
      exports: 'porto'
    }, 'parser_rules': {
      exports: 'wysihtml5ParserRules'
    }
  }
});

define([
    "common/controller/main.controller", "common/controller/sub.controller", "common/pgpModel",
    "common/keyring", "openpgp", "jquery"
  ],
  function(controller, subController, model, keyring, openpgp, $) {
    // inject content script only once per time slot
    var injectTimeSlot = 600;
    // injection time slot currently open
    var injectOpen = true;
    // optimized cs injection variant, bootstrap code injected that loads cs
    var injectOptimized = true;
    // keep reloaded iframes
    var frameHosts = [];
    // content script coding as string
    var csCode = '';

    var portCs = '';

    // framestyles as string
    var framestyles = '';

    function init() {
      controller.extend({
        initScriptInjection: initScriptInjection, activate: function() {
        }, deactivate: function() {
        }
      });
      model.init();
      migrate();
      initConnectionManager();
      //initContextMenu();
      initScriptInjection();
      initMessageListener();
      controller.handleMessageEvent({event: 'activate'});
      initPopover();
    }

    function initPopover() {
      var e2eToolbar = safari.extension.createPopover("universal",
        safari.extension.baseURI + "common/ui/popup.html", 202, 310);

      function setPopover(popover) {
        for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
          safari.extension.toolbarItems[i].popover = popover;
        }
      }

      setPopover(e2eToolbar);
      function onOpen(event) {
        if (event.target instanceof SafariBrowserWindow) {
          setPopover(e2eToolbar);
        }
      }

      function onCommand(event) {
        console.log(event);
        switch (event.command) {
          case 'e2e-toolbar':
            if (!event.target.popover) {
              setPopover(e2eToolbar);
            }
            event.target.showPopover();
            break;
        }
      }

      safari.application.addEventListener("open", onOpen, true);
      safari.application.addEventListener("command", onCommand, false);
      window.addEventListener("message", function(msg) {
        var msgEvent = msg.data;
        switch (msgEvent.event) {
          case 'close-popup':
            e2eToolbar.hide();
            break;
          case 'browser-action':
          case 'activate':
          case 'deactivate':
            e2eToolbar.hide();
            controller.handleMessageEvent(msgEvent, null, messageHandler);
            break;
          default:
            controller.handleMessageEvent(msgEvent, null, messageHandler);
        }
      });
      function messageHandler(response) {
        e2eToolbar.contentWindow.postMessage(response, window.location.origin);
      }
    }

    function initConnectionManager() {
      // store incoming connections by name and id
      porto.extension.onConnect.addListener(function(port, sender, sendResponse) {
        //console.log('ConnectionManager: onConnect:', port);
        subController.addPort(port);
        port.onMessage.addListener(subController.handlePortMessage);
        // update active ports on disconnect
        port.onDisconnect.addListener(subController.removePort);
      });
    }

    function initMessageListener() {
      porto.extension.onRequest.addListener(function(request, sender, sendResponse) {
        switch (request.event) {
          // for content scripts requesting code
          case 'get-cs':
            sendResponse({code: csCode});
            break;
          default:
            return controller.handleMessageEvent(request, sender, sendResponse);
        }
      });
    }

    function loadContentCode() {
      if (injectOptimized && csCode === '') {
        return porto.data.load('common/ui/porto.js').then(function(portoCs) {
          portCs = portoCs;
          return porto.data.load('common/ui/inline/porto-cs.js').then(function(csmSrc) {
            return porto.data.load('common/dep/jquery.min.js').then(function(jquerySrc) {
              return porto.data.load('common/scripts/libs/sweetalert2.js').then(
                function(sweetalert2Src) {
                  csCode = jquerySrc + '\n' + sweetalert2Src + '\n' + csmSrc;
                  console.log('content scripts loaded');
                });
            });
          });
        });
      }
      return Promise.resolve();
    }

    function loadFramestyles() {
      // load framestyles and replace path
      if (framestyles === '') {
        return porto.data.load('common/ui/inline/framestyles.css').then(function(data) {
          return porto.data.load('common/css/libs/sweetalert2.css').then(function(sweetalert2css) {
            framestyles = sweetalert2css + '\n' + data;
            var token = /\.\.\/\.\./g;
            framestyles = framestyles.replace(token, porto.extension.getURL('common'));
            console.log('content styles loaded');
          });
        });
      }
      return Promise.resolve();
    }

    function initScriptInjection() {
      loadContentCode()
        .then(loadFramestyles)
        .then(function() {
          console.log('injecting to tabs');
          var filterURL = controller.getWatchListFilterURLs();

          filterURL = filterURL.map(function(host) {
            return '*://' + host + '/*';
          });

          injectOpenTabs(filterURL)
            .then(function() {
            })
            .catch(function(err) {
              console.error(err);
            });
        })
        .catch(function(err) {
          console.error("Error occurred");
          console.error(err);
        });
    }

    function injectOpenTabs(filterURL) {
      console.log('injecting to open tabs...');
      return new Promise(function(resolve, reject) {
        // query open tabs
        var status = safari.extension.addContentScript(csBootstrap(), [], [], true);
        console.log('Bootstrap injection status: ' + status);
        status = safari.extension.addContentStyleSheet(framestyles, [], []);
        console.log('Style injection status: ' + status);
        resolve();
      });
    }

    function csBootstrap() {
      var bootstrapSrc = "\n \
        if (!window.portoBootstrap) { \n\
          try {\n\
          porto.extension.sendMessage({event: 'get-cs'}, function(response) { \n\
            eval(response.code); \n\
          }); \n\
          }\n\
          catch (err) {\n\
          console.log(err);\n\
          }\n\
          window.portoBootstrap = true; \n\
      } \n\
    ";
      //return bootstrapSrc;
      return portCs + bootstrapSrc;
    }

    function migrate() {
      model.migrate08();
    }

    init();

  });
