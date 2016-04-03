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
      $.ajax({
         url: parser.origin + '/rest/ui/identity/set-public-key',
         type: 'POST',
         data: {publicKey: $publicKey.text()}
       })
       .done(function(data, status, xhr) {
         $publicKey.removeData(porto.FRAME_STATUS);
         issueDelegateDocument();
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
  }

  function issueDelegateDocument() {
    console.log('create delegate document');
    $.ajax({
       url: parser.origin + '/rest/ui/identity/delegate-identity',
       type: 'POST'
     })
     .done(function(data, status, xhr) {
       getDelegateDocument();
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

  function getDelegateDocument() {
    console.log('get delegate document');
    var $publicKey = $('#keyContent');
    $.ajax({
       url: parser.origin + '/rest/ui/identity/delegate-identity',
       type: 'GET'
     })
     .done(function(data, status, xhr) {
       $publicKey.text(data);
       $publicKey.val(data);
       $publicKey.removeClass('bp-set-pub-key');
       $publicKey.addClass('bp-sign-target');
       $publicKey.data('stage', 'sign-authid');
       $publicKey.on('change', function() {
         delegateUserPermissions();
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
          width: 540,
          showCancelButton: true,
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
