'use strict';

var porto = porto || null;

(function() {
  var crx = typeof chrome !== 'undefined';
  var sfx = typeof safari !== 'undefined' && safari !== null;

  if (sfx) {
    crx = false;
  }

  var activeState;
  var sendMessage;
  var logEntryTmpl;
  var logEmptyTmpl;

  if (sfx) {
    sendMessage = function(msg) {
      safari.extension.globalPage.contentWindow.postMessage(msg, window.location.origin);
    };
    window.addEventListener("message", function(message) {
      messageListener(message.data);
    });
  }
  else if (!crx) {
    // Firefox
    sendMessage = function(msg) {
      addon.postMessage(msg);
    };
    addon.on('message', messageListener);
  }
  else {
    // Chrome
    sendMessage = function(msg) {
      chrome.runtime.sendMessage(msg, messageListener);
    };
  }

  function init() {
    $('#showlog').hide();
    $('.popup')
      .off()
      .on('click', 'a', function(event) {
        if (porto.crx) {
          hide();
        }
        else {
          sendMessage({event: 'close-popup'});
        }
      })
      .on('click', 'button', function(event) {
        // id of dropdown entry = action
        if (this.id === 'state' || this.id === '') {
          return;
        }
        var message = {
          event: 'browser-action',
          action: this.id
        };
        sendMessage(message);
        hide();
      });

    if (porto.crx || porto.sfx) {
      porto.l10n.localizeHTML();
    }

    if (logEntryTmpl === undefined) {
      logEntryTmpl = $('#activityLog .logEntry').parent().html();
    }

    if (logEmptyTmpl === undefined) {
      logEmptyTmpl = $('#emptySecurityLog').parent().html();
    }

    sendMessage({event: 'get-prefs'});
    sendMessage({event: 'get-ui-log'});

    $('#state')
      .off()
      .on('click', function() {
        var msg;
        if (activeState) {
          msg = {event: 'deactivate'};
        }
        else {
          msg = {event: 'activate'};
        }
        activeState = !activeState;
        handleAppActivation();
        sendMessage(msg);
        hide();
      });

    $('[data-toggle="tooltip"]').tooltip();

    sendMessage({event: "get-version"});
  }

  function hide() {
    if (crx) {
      $(document.body).fadeOut(function() {
        window.close();
      });
    }
  }

  function handleAppActivation() {
    if (activeState) {
      $('#state .glyphicon').removeClass('glyphicon-unchecked').addClass('glyphicon-check');
      $('#add').removeClass('disabled').css('pointer-events', 'auto');
      $('#reload').removeClass('disabled').css('pointer-events', 'auto');
    }
    else {
      $('#state .glyphicon').removeClass('glyphicon-check').addClass('glyphicon-unchecked');
      $('#add').addClass('disabled').css('pointer-events', 'none');
      $('#reload').addClass('disabled').css('pointer-events', 'none');
    }
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'init':
        init();
        break;
      case 'get-prefs':
        activeState = msg.prefs.main_active;
        handleAppActivation();
        break;
      case 'get-ui-log':
        var logEntry;
        var cnt = 0;
        $('#activityLog').empty();
        if (!msg.secLog || msg.secLog.length === 0) {
          $('#activityLog').append(logEmptyTmpl);
        }
        msg.secLog.reverse().forEach(function(entry) {
          $('#showlog').show();
          if (cnt < 3) {
            logEntry = $.parseHTML(logEntryTmpl);
            $(logEntry).find('.timestamp').text((new Date(entry.timestamp)).toLocaleTimeString());
            $(logEntry).find('.logDescription').text(entry.typei18n);
            $('#activityLog').append(logEntry);
          }
          cnt++;
        });
        break;
      default:
        var input = $('#version');
        if (input) {
          input.text(msg);
        }
        console.log(msg);
        break;
    }
  }

  $(document).ready(init);

}());
