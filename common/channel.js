var webSocket = require("ws");

// A simple websocket abstraction using a emitter/observer pattern
// The api is the same on both the server and the client, but differs in functionality
//
// On the server, channel.send sends the object to all connected clients, while on the client,
// it of course only sends the object to the server
//
// channel.send("type", dataObject);
// channel.  on("type", function (receivedDataObject) {...});
//
// on the client, pass a port (integer, not string)
// on the server, pass an HttpServer
// var channel = new Channel(port || HttpServer);
//
// // client
// channel.on("ping", function (data) {
//     data.content === "hi there";
//     channel.send("pong", {content: "hello", ...});
// });
//
// // server
// channel.on("pong", function (data) {
//     data.content === "hello";
//     channel.send("ping", {content: "hi there", ...});
// });
//
// Additionally, you can listen to the websocket's onConnection event
// inside the callback, this refers to the channel.
// channel.onConnection(callback);
function Channel (config) {
    var that                 = this;
    this.listeners           = Object.create(null);
    this.connectionListeners = [];

    function onMessage (message) {
        var data = JSON.parse(message.data);
        var type = data.type;

        if (type in that.listeners) {
            that.listeners[type].forEach(function (listener) {
                listener(data);
            });
        } else {
            console.log("Received a message with type '" + type + "' that's not being listened for.");
        }
    }

    function onNewConnection(connection) {
        console.log("New websocket connection");
        that.connectionListeners.forEach(function (connectionListener) {
            connectionListener.call(that, connection);
        });

        // the client is already listening for messages,
        if (that.type === "server") {
            connection.on("message", onMessage);
        } else {
            console.log(connection);
        }
    }

    // on the server side, a channel gets passed an HttpServer, while on the client side it gets passed a port.
    // there are small distinctions to make between the server and the client
    // the server requires a different websocket constructor, and it talks to multiple clients instead of one.
    if (typeof config === "object") {
        this.websocket = new webSocket.Server({server: config});
        this.type = "server";
    } else if (typeof config === "number") {
        this.websocket = new webSocket("ws://localhost:" + config + "/editor/");
        this.type = "client";
    }

    // for some reason, the websocket api differs on the client from the server
    if (this.type === "server") {
        this.websocket.on("connection", onNewConnection);
    } else {
        this.websocket.open = onNewConnection;
    }

    this.websocket.onmessage = onMessage;
}

Channel.prototype.on = function (messageType, callback) {
    if (messageType in this.listeners) {
        this.listeners[messageType].push(callback);
    } else {
        this.listeners[messageType] = [callback];
    }
};

Channel.prototype.send = function (messageType, data) {
    var message;

    data.type = messageType;
    message   = JSON.stringify(data);

    // on the server, send to all clients
    // on the client, send to the server
    if (this.type === "server") {
        this.websocket.clients.forEach(function (client) {
            client.send(message);
        });
    } else {
        this.websocket.send(message);
    }
};

Channel.prototype.onConnection = function(listener) {
    this.connectionListeners.push(listener);
};

module.exports = Channel;