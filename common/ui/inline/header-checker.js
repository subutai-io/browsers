/**
 * Created by talas on 11/19/15.
 */
/* jshint strict: false */
var porto = porto || {};

porto.headerChecker = {};

porto.headerChecker.interval = 2500; // ms
porto.headerChecker.intervalID = 0;
porto.headerChecker.kurjunInterval = 15550;
porto.headerChecker.kurjunIntervalID = 0;

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

  porto.extension.sendMessage({event: "get-version"}, function(version) {
    var input = $('#bp-plugin-version');
    if (input.length > 0) {
      input.val(version);
    }
  });

  var isKurjun = $('head > title').text();
  var $content = $('body > div.b-workspace__content > div > br:nth-child(3)');
  if (isKurjun === 'Kurjun' && $content.length !== 0) {
    console.log('This is kurjun');
    $('body').on('click', '.bp-close-modal', function() {
      swal.closeModal();
    });
    //var $content = $('body > div.b-workspace__content > div.b-workspace-content__row');
    $content.after('<br><br><button class="bp-set-owner b-btn b-btn_blue">' +
                   '<div class="ssh-key-button_block">' +
                   '<svg class="ssh-key-button" version="1.1" id="Layer_1" ' +
                   'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                   'x="0px" y="0px" viewBox="0 0 28 26" enable-background="new 0 0 28 26" xml:space="preserve">' +
                   '<g>' +
                   '<path fill="#FFFFFF" d="M21,23.4H7.4c-1.6,0-3-1.3-3-3v-6.3h2.5v4.4c0,0.3,0.2,0.5,0.5,0.5h1.5c0.3,0,0.5-0.2,0.5-0.5v-4.4h4.4l0.1,0.3c0.7,3.2,3.6,5.4,6.8,5.4c3.9,0,7-3.1,7-7c0-3.9-3.1-7-7-7c-3.2,0-6.1,2.3-6.8,5.4l-0.1,0.3l-12.1,0c-0.6,0-1.1,0.4-1.3,0.9c-0.2,0.8,0.4,1.5,1.2,1.6l0.4,0v6.3c0,3,2.5,5.5,5.5,5.5H21c3,0,5.5-2.5,5.5-5.5v0c0-0.2-0.3-0.4-0.5-0.2c-0.7,0.6-1.5,1-2.3,1.3C23.3,22.7,22.2,23.4,21,23.4z M20.7,8.4c2.5,0,4.5,2,4.5,4.5c0,2.5-2,4.5-4.5,4.5c-2.5,0-4.5-2-4.5-4.5C16.2,10.4,18.2,8.4,20.7,8.4z"/>' +
                   '<path fill="#FFFFFF" d="M26.5,5.6L26.5,5.6c0-3-2.5-5.5-5.5-5.5H7.4c-3,0-5.5,2.5-5.5,5.5V9c0,0.3,0.2,0.5,0.5,0.5h1.5c0.3,0,0.5-0.2,0.5-0.5V5.6c0-1.6,1.3-3,3-3H21c1.2,0,2.2,0.7,2.7,1.8c0,0.1,0.1,0.1,0.1,0.1c0.8,0.3,1.5,0.8,2.2,1.3C26.2,6,26.5,5.8,26.5,5.6z"/>' +
                   '</g>' +
                   '</svg>' +
                   '</div>' +
                   '<div class="ssh-key-button_title">Register</div>' +
                   '</button>');

    var $setOwnerBtn = $('.bp-set-owner');
    console.log($setOwnerBtn);
    console.log('console log for kurjun');

    $setOwnerBtn.on('click', function(e) {
      porto.extension.sendMessage({
        event: 'load-local-content',
        path: 'common/ui/_popup-key-selector.html'
      }, function(content) {
        swal({
          html: content,
          showCancelButton: false,
          animation: false,
          showConfirmButton: false,
          width: 492,
          //buttonsStyling: false,
          closeOnConfirm: false
        }, function() {
          swal.disableButtons();

          var $publicKey = $('#keyContent');
          var stage = $publicKey.data('stage');
          if (stage === 'set-key') {
            porto.extension.sendMessage({
              event: 'porto-send-request',
              params: {
                url: parser.origin + '/kurjun/rest/identity/user/add',
                method: 'POST',
                data: {key: $publicKey.text()}
              }
            }, function(response) {
              $publicKey.removeData(porto.FRAME_STATUS);
              $publicKey.text(response.data);
              $publicKey.val(response.data);
              $publicKey.removeClass('bp-set-pub-key');
              $publicKey.addClass('bp-sign-target');
              $publicKey.data('stage', 'sign-authid');
              $publicKey.on('change', function() {
                swal.enableButtons();
              });
            });
          }
          else if (stage === 'sign-authid') {

            $.ajax({
               url: parser.origin + '/kurjun/rest/identity/user/auth',
               data: {fingerprint: getCookie('su_fingerprint'), message: $publicKey.val()},
               type: 'POST'
             })
             .done(function(data, status, xhr) {
               function setCookie(cname, cvalue, hours) {
                 var d = new Date();
                 d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
                 var expires = "expires=" + d.toUTCString();
                 document.cookie = cname + "=" + cvalue + "; " + expires;
               }

               //setCookie('sptoken', data);
               swal.enableButtons();
               swal({
                 title: "Logged in",
                 showConfirmButton: true,
                 text: "Your identity was successfully verified by Kurjun!",
                 type: "success",
                 timer: 2500,
                 customClass: "b-success"
               }, function() {
                 setTimeout(function() {
                   location.reload();
                 }, 1500);
               });
             })
             .fail(function(xhr, status, errorThrown) {
               swal.enableButtons();
               swal({
                 title: "Oh, snap",
                 text: errorThrown,
                 type: "error",
                 customClass: "b-warning"
               });
             })
             .always(function(xhr, status) {
               console.log("The request is complete!");
             });
          }
        });
      });
    });
  }

  if (cookie) {

    porto.extension.sendMessage({
      event: "associate-peer-key", su_fingerprint: cookie, url: document.location.origin
    });

    porto.headerChecker.signingAgent = function() {
      console.log('signing agent starting...');
      porto.extension.sendMessage(
        {
          event: 'porto-send-request',
          params: {
            url: parser.origin + '/rest/v1/kurjun-manager/authid',
            method: 'GET',
            dataType: 'text'
          }
        },
        function(response) {
          if (response.error) {
            //console.error('error signing kurjun message');
            //console.error(event.error);
          }
          else {
            try {
              window.clearInterval(porto.headerChecker.kurjunIntervalID);
            }
            catch (err) {}

            if ($('textarea.bp-kurjun-signed-message').length === 0 && response.data) {
              var $body = $('body').append(
                '<div style="display: none">'                                                +
                '<textarea class="bp-sign-target bp-kurjun-signed-message">' + response.data +
                '</textarea>'                                                                +
                '</div>');
              var $signedMessage = $body.find('textarea.bp-kurjun-signed-message');
              $signedMessage.on('change', function(e) {
                var signed = $(this).text();
                //signed = encodeURIComponent(signed);
                porto.extension.sendMessage({
                  event: 'porto-send-request',
                  params: {
                    url: parser.origin + '/rest/v1/kurjun-manager/signed-msg',
                    method: 'POST',
                    data: {signedMsg: signed}
                  }
                }, function(ev) {
                  console.log(ev);
                });
              });
            }
          }
        });
    };
    //porto.headerChecker.kurjunIntervalID = window.setInterval(function() {
    //  porto.headerChecker.signingAgent();
    //}, porto.headerChecker.kurjunInterval);
  }

  porto.extension.sendMessage(
    {
      event: 'porto-socket-init',
      url: 'ws://localhost:9998'
    }
  );

  if (parser.origin === "https://hub.subut.ai") {
    porto.headerChecker.intervalID = window.setInterval(function() {
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
