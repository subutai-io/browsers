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

  if (cookie) {
    porto.extension.sendMessage({event: "get-version"}, function(version) {
      var input = $('#bp-plugin-version');
      if (input) {
        input.val(version);
      }
    });

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
        function(event) {
          if (event.error) {
            //console.error('error signing kurjun message');
            //console.error(event.error);
          }
          else {
            try {
              window.clearInterval(porto.headerChecker.kurjunIntervalID);
            }
            catch (err) {}

            if ($('textarea.bp-kurjun-signed-message').length === 0) {
              var response = event.response;
              var $body = $('body').append(
                '<div style="display: none">'                                                +
                '<textarea class="bp-sign-target bp-kurjun-signed-message">' + response.data +
                '</textarea>'                                                                +
                '</div>');
              var $signedMessage = $body.find('textarea.bp-kurjun-signed-message');
              $signedMessage.on('change', function(e) {
                var signed = $(this).text();
                signed = encodeURIComponent(signed);
                porto.extension.sendMessage({
                  event: 'porto-send-request',
                  params: {
                    url: parser.origin + '/rest/v1/kurjun-manager/signed-msg',
                    method: 'POST',
                    data: 'signedMsg=' + signed
                  }
                }, function(ev) {
                  console.log(ev);
                });
              });
            }
          }
        });
    };
    porto.headerChecker.kurjunIntervalID = window.setInterval(function() {
      porto.headerChecker.signingAgent();
    }, porto.headerChecker.kurjunInterval);
  }

  porto.extension.sendMessage(
    {
      event: 'porto-socket-init',
      url: 'ws://localhost:9998'
    }
  );

  //var triggerAction = function(e) {
  //  var that = e.target;
  //  console.log(that);
  //  porto.extension.sendMessage({
  //    event: "porto-socket-send",
  //    msg: {
  //      type: 'env-cr-info',
  //      cmd: $(that).val() || $(that).text()
  //    }
  //  }, function(response) {
  //    console.log('header-checker:received response:');
  //    console.log(response);
  //  });
  //};
  //$('input[type="text"], textarea').bind('keypress', triggerAction);

  if (parser.origin === "https://hub.subut.ai") {
    porto.headerChecker.intervalID = window.setInterval(function() {
      porto.headerChecker.scanLoop();
    }, porto.headerChecker.interval);
  }

  porto.headerChecker.scanLoop = function() {
    var containers = $('.bp-env-cntr-ssh tbody tr');
    for (var i = 0; i < containers.length; i++) {
      var $container = $(containers[i]);
      if ($container.attr('data-dirty') !== 'true') {
        // 1: name, 2: template, 3: size, 4: status, 5: ip
        var $ip = $container.find('td:nth-child(5)')
                            .append('<button class="b-btn b-btn_blue">SSH</button>');
        var $btn = $ip.find('button');
        $btn.on('click', function() {
          var that = this;
          var username = $(
            'body > div.b-content.b-content_minus-header.g-full-height > div.b-sidebar.b-sidebar_border-right.g-left.g-full-height > div > div > div.b-sidebar-profile__header.g-padding > div > div.b-sidebar-profile-header__info.g-margin-bottom > div > div.b-sidebar-profile-header-info__location > ul > li > a').text().trim();
          porto.extension.sendMessage({
            event: "porto-socket-send",
            msg: {
              cmd: 'cmd:curent_user'
            }
          }, function(response) {
            console.log(response);
            if (username === response) {
              var row = $(that.closest('tr'));
              var cmd = 'cmd:ssh%%%' +
                        $('.b-sidebar-profile-header-name').text().trim() +
                        '%%%' +
                        row.find('td:nth-child(1)').text().trim();
              porto.extension.sendMessage({
                event: "porto-socket-send",
                msg: {
                  cmd: cmd
                }
              }, function(response) {
                console.log(response);
              });
            }
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
