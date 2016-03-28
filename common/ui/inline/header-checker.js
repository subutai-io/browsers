/**
 * Created by talas on 11/19/15.
 */
/* jshint strict: false */
var porto = porto || {};

porto.headerChecker = {};

porto.headerChecker.interval = 2500; // ms
porto.headerChecker.intervalHubID = 0;
porto.headerChecker.intervalSSID = 0;

(function(window, document, undefined) {

  var parser = document.createElement('a');
  parser.href = "document.location";
  //parser.protocol; // => "http:"
  //parser.hostname; // => "example.com"
  //parser.port;     // => "3000"
  //parser.pathname; // => "/pathname/"
  //parser.search;   // => "?search=test"
  //parser.hash;     // => "#hash"
  //parser.host;     // => "example.com:3000"

  var cookie = getCookie('su_fingerprint');
  var isSubutaiSocial = $('head > title').text();

  if (cookie && isSubutaiSocial === 'Subutai Social') {

    porto.extension.sendMessage({
      event: "associate-peer-key", su_fingerprint: cookie, url: document.location.origin
    });

    $('body').on('click', '.bp-close-modal', function() {
      swal2.closeModal();
    });

    porto.headerChecker.subutaiSocial = {};

    porto.headerChecker.subutaiSocial.scanAgent = function() {
      injectSetPublicKeyButton();
    };

    porto.headerChecker.subutaiSocial.scanAgent();

    porto.headerChecker.subutaiSocial.intervalSSID = window.setInterval(function() {
      porto.headerChecker.subutaiSocial.scanAgent();
    }, porto.headerChecker.interval);

  }

  porto.extension.sendMessage({event: "get-version"}, function(version) {
    var input = $('#bp-plugin-version');
    if (input.length > 0) {
      input.val(version);
    }
  });

  function registerPublicKey() {
    console.log('register public key');
    var $publicKey = $('#keyContent');
    var stage = $publicKey.data('stage');
    if (stage === 'set-key') {
      porto.extension.sendMessage({
        event: 'porto-send-request',
        params: {
          url: parser.origin + '/rest/ui/identity/set-public-key',
          method: 'POST',
          data: {publicKey: $publicKey.text()}
        }
      }, function(response) {
        $publicKey.removeData(porto.FRAME_STATUS);
        issueDelegateDocument();
      });
    }
  }

  function issueDelegateDocument() {
    console.log('create delegate document');
    porto.extension.sendMessage({
      event: 'porto-send-request',
      params: {
        url: parser.origin + '/rest/ui/identity/delegate-identity',
        method: 'POST'
      }
    }, function(response) {
      getDelegateDocument();
    });
  }

  function getDelegateDocument() {
    console.log('get delegate document');
    var $publicKey = $('#keyContent');
    porto.extension.sendMessage({
      event: 'porto-send-request',
      params: {
        url: parser.origin + '/rest/ui/identity/delegate-identity',
        method: 'GET'
      }
    }, function(response) {
      $publicKey.text(response.data);
      $publicKey.val(response.data);
      $publicKey.removeClass('bp-set-pub-key');
      $publicKey.addClass('bp-sign-target');
      $publicKey.data('stage', 'sign-authid');
      $publicKey.on('change', function() {
        delegateUserPermissions();
      });
    });
  }

  function delegateUserPermissions() {
    console.log('delegate permissions');
    var $publicKey = $('#keyContent');
    $.ajax({
       url: parser.origin + '/rest/ui/identity/approve-delegate', type: 'POST',
       data: {signedDocument: $publicKey.val()}
     })
     .done(function(data, status, xhr) {
       swal2.enableButtons();
       swal2({
         title: "Success!",
         showConfirmButton: true,
         text: "System permissions were successfully delegated!",
         type: "success",
         timer: 2500,
         customClass: "b-success"
       }, function() {
       });
     })
     .fail(function(xhr, status, errorThrown) {
       swal2.enableButtons();
       swal2({
         title: "Oh, snap",
         text: errorThrown,
         type: "error",
         customClass: "b-warning"
       });
     })
     .always(function(xhr, status) {
     });
  }

  function registerClickListener($element) {
    console.log('register click listener');
    $element.on('click', function(e) {
      porto.extension.sendMessage({
        event: 'load-local-content',
        path: 'common/ui/_popup-key-selector.html'
      }, function(content) {
        swal2({
          html: content,
          showCancelButton: false,
          animation: false,
          showConfirmButton: false,
          width: 520,
          //buttonsStyling: false,
          closeOnConfirm: false
        }, function() {
          swal2.disableButtons();

          var $publicKey = $('#keyContent');
          var stage = $publicKey.data('stage');
          if (stage === 'set-key') {
            registerPublicKey();
          }
        });
      });
    });
  }

  function injectSetPublicKeyButton() {
    var e2eButtons = $('.e2e-plugin-btn');

    if (e2eButtons.length === 0) {
      var $content = $('.e2e-plugin_action_set-pub-key');
      if ($content.length === 1) {
        console.log('inject set public key button');
        porto.extension.sendMessage({
          event: 'load-local-content',
          path: 'common/ui/inline/_e2e-button-template.html'
        }, function(content) {
          $content.append(content);
          var $e2eBtn = $('.e2e-plugin-btn');
          $e2eBtn.find('.ssh-key-button_title').text('Set Public Key');
          registerClickListener($e2eBtn);
        });
      }
    }
  }

  porto.extension.sendMessage(
    {
      event: 'porto-socket-init',
      url: 'ws://localhost:9998'
    }
  );

  if (parser.origin === "https://hub.subut.ai") {
    porto.headerChecker.intervalHubID = window.setInterval(function() {
      porto.headerChecker.scanLoop();
    }, porto.headerChecker.interval);
  }

  porto.headerChecker.scanLoop = function() {
    var containers = $('.bp-env-cntr-ssh tbody tr');

    var performCheck = function(that, response) {
      console.log(response);
      var pathParams = parser.pathname;
      var userId = pathParams.split('/');
      var email = $(
        'body > div.b-content.b-content_minus-header.g-full-height > div.b-sidebar.b-sidebar_border-right.g-left.g-full-height > div > div > div.b-sidebar-profile__header.g-padding > div > div.b-sidebar-profile-header__info.g-margin-bottom > div > div.b-sidebar-profile-header-info__location > ul > li > a');
      email = $(email).attr('data-email');
      if (email) {
        console.log('email: ' + email);
        if (email === response) {
          var row = $(that.closest('tr'));
          var envName = $('.b-sidebar-profile-header-name').text().trim();

          if (userId[3] === 'environments') {
            envName = userId[4];
          }
          var cmd = 'cmd:ssh%%%' + envName + '%%%' + row.attr('data-container-id');
          porto.extension.sendMessage({
            event: "porto-socket-send",
            msg: {
              cmd: cmd
            }
          }, function(response) {
            console.log(response);
          });
        }
      }
    };

    for (var i = 0; i < containers.length; i++) {
      var $container = $(containers[i]);
      if ($container.attr('data-dirty') !== 'true') {
        // 1: name, 2: template, 3: size, 4: status, 5: ip
        var $action = $container.find('td:nth-child(6)');
        var $btn = $action.find('button');
        $btn.attr('disabled', false);
        $btn.on('click', function() {
          var that = this;
          porto.extension.sendMessage({
            event: "porto-socket-send",
            msg: {
              cmd: 'cmd:current_user'
            }
          }, function(response) {
            performCheck(that, response);
          });
        });
        $container.attr('data-dirty', 'true');
      }
    }

  };

  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

})(window, document);
