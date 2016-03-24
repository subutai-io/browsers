'use strict';

(function() {
  var ws = null;
  var connected = false;

  var serverUrl = null;
  var protocol = null;
  var connectionStatus = '';

  var openWs = function() {
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
    console.log('sending message: ' + serverUrl);
    console.log(msg);
    if (!ws) {
      openWs();
    }
    ws.onmessage = callback;
    ws.send(msg.cmd);
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
    console.error('page-worker:message-received');
    console.error(event);
    console.error(data);
  };

  var onError = function(event) {
    console.error(event.data);
  };

  self.port.on('open-ws', openWs.bind(this));
  self.port.on('close-ws', closeWs.bind(this));
  self.port.on('send-ws-msg', function(msg) {
    console.log('page-worker: ');
    console.log(msg);
    sendWs(msg, function(response) {
      console.log('page-worker:received message');
      console.log(response);
      console.log(response.data);
      self.port.emit(msg.token, {data: response.data});
    });
  });
  self.port.on('init-ws', function(params) {
    console.error('page-worker initialized');
    console.log(params);
    serverUrl = params.url;
    protocol = params.protocol;
  });

  console.error('page-worker alive');
})();
