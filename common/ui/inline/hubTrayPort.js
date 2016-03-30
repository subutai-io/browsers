/**
 * Created by ape-craft on 3/30/16.
 */
/**
 * Created by talas on 11/19/15.
 */
/* jshint strict: false */
var porto = porto || {};

porto.trayPort = {};

porto.trayPort.interval = 2500; // ms
porto.trayPort.intervalHubID = 0;
porto.trayPort.intervalSSID = 0;

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

  porto.extension.sendMessage({event: "get-version"}, function(version) {
    var input = $('#bp-plugin-version');
    if (input.length > 0) {
      input.val(version);
    }
  });

  porto.extension.sendMessage(
    {
      event: 'porto-socket-init',
      url: 'ws://localhost:9998'
    }
  );

  if (parser.origin === "https://hub.subut.ai") {
    porto.trayPort.intervalHubID = window.setInterval(function() {
      porto.trayPort.scanLoop();
    }, porto.trayPort.interval);
  }

  porto.trayPort.scanLoop = function() {
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
            // code:code%%%error==error_message%%%success==success_message
            var parseStep1 = response.split('%%%');
            if (parseStep1.length === 3) {
              var parseError = parseStep1[1].split('==');
              if (parseError[1]) {
                swal2({
                  title: "Oh, snap error " + parseStep1[0],
                  text: parseError[1],
                  type: "error",
                  customClass: "b-warning"
                });
              }
              else {
                swal2({
                  title: "Success",
                  text: parseStep1[2].split('==')[1],
                  type: "success",
                  customClass: "b-success"
                });
              }
            }
            console.log(response);
          });
        }
        else {
          swal2({
            title: "Oh, snap error ",
            text: "TrayApp and Hub user didn't match!?!?",
            type: "error",
            customClass: "b-warning"
          });
        }
      }
    };

    for (var i = 0; i < containers.length; i++) {
      var $container = $(containers[i]);
      if ($container.attr('data-dirty') !== 'true') {
        // 1: name, 2: template, 3: size, 4: status, 5: ip
        var $action = $container.find('td:nth-child(7)');
        var $btn = $action.find('button:nth-child(2)');
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

})(window, document);
