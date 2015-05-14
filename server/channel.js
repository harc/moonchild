var WebSocketServer = require("ws").Server;
var fs              = require("fs");

function createChannel(config) {
	// expecting
	// config = {
	//   server: serverobject
	// }
	var channel = Object.create(null);
	var listeners = {};

	channel.bla = "13";

	channel.ws = new WebSocketServer({
		server: config.server
	});

	channel.sendToAll = function (messageType, data) {
		var message;

		data.type = messageType;
		message = JSON.stringify(data);

		channel.ws.clients.forEach(function(client) {
			console.log('sending message');
			client.send(message);
		});
	};

	channel.on = function (messageType, callback) {
		if (messageType in listeners) {
			listeners[messageType].push(callback);
		} else {
			listeners[messageType] = [callback];
		}
	};

	channel.ws.on('connection', function (client) {
		console.log("opened ws");
		config.onConnection.call(channel, client);

		client.on('message', function (message) {
			var data = JSON.parse(message.data);

			var type = data.type;

			if (type in listeners) {
				listeners[type].foreach(function (listener) {
					listener(data);
				});
			} else {
				console.log("A client is is trying to talk to you...");
			}
		});

	});

	channel.ws.on('error', function(error) {
		console.log(error);
	});

	return channel;
}

module.exports = {
	createChannel: createChannel
};