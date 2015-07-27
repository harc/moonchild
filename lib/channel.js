var WebSocketLib = require('ws');
var util         = require('./util');

function createChannel(port) {
  // add listener from server
  // channel.on("eventName", callback)
  // send stuff to server
  // channel.send("eventName", data)

  var channel   = Object.create(null);

  var url       = util.formatString("ws://localhost:{port}/editor/", {port: port});
  var ws        = new WebSocketLib(url);
  var listeners = {};

  console.log("Websocket connecting to %s", url);

  ws.onmessage = function (message) {
    // Doesn't handle cyclic values
    var data = JSON.parse(message.data);

    // expects "data" to have .type
    var type = data.type;

    if (type in listeners) {
      listeners[type].forEach(function (listener) {
        listener(data);
      });
    } else {
      console.log(util.formatString("The server is shouting '{type}'! But no-one is there to hear him...", {type: type}));
    }
  };

  ws.onopen = function () {
    console.log("open!");
  };

  // handle ws.on('error') here later..
  // ws.onerror = function (error) {
  //
  // };

  channel.on = function (messageType, callback) {
    if (messageType in listeners) {
      listeners[messageType].push(callback);
    } else {
      listeners[messageType] = [callback];
    }
  };

  channel.send = function (messageType, data) {
    var message;
    data.type = messageType;

    // Doesn't handle cyclic values
    message = JSON.stringify(data);

    ws.send(message);
  };

  return channel;
}

module.exports = {
  createChannel: createChannel
};
