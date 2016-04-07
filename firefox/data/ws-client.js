'use strict';

(function() {
  var ws = null;
  var connected = false;

  var serverUrl = null;
  var protocol = null;
  var connectionStatus = '';

  var openWs = function() {
    if (ws) {
      return;
    }

    if (!serverUrl) {
      throw new Error("cannot connect to null url");
    }
    if (protocol) {
      ws = new WebSocket(serverUrl, protocol);
    }
    else {
      ws = new WebSocket(serverUrl);
    }
    ws.onopen = onOpen;
    ws.onclose = onClose;
    ws.onmessage = onMessage;
    ws.onerror = onError;

    connectionStatus = 'OPENING ...';
  };

  var sendWs = function(msg, callback) {
    try {
      console.log('sending message: ' + serverUrl);
      console.log(msg);
      if (!ws) {
        openWs();
      }
      ws.onmessage = callback;
      ws.send(msg.cmd);
    }
    catch (err) {
      callback({error: 'Couldn\'t send command to SubutaiTray'});
    }
  };

  var closeWs = function() {
    if (ws) {
      console.log('CLOSING ...');
      ws.close();
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
    ws = null;
  };

  var onMessage = function(event) {
    var data = event.data;
  };

  var onError = function(event) {
    console.log(event.data);
  };

  self.port.on('open-ws', openWs.bind(this));
  self.port.on('close-ws', closeWs.bind(this));
  self.port.on('send-ws-msg', function(msg) {
    sendWs(msg, function(response) {
      self.port.emit(msg.token, {data: response.data, error: response.error});
    });
  });
  self.port.on('init-ws', function(params) {
    serverUrl = params.url;
    protocol = params.protocol;
  });

})();
