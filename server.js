var Server = require('node-static').Server,
    http = require('http'),
    util = require('util'),
    WebSocketServer = require('ws').Server,
    fs = require('fs');

var httpPort = 8080;
var wsPort = 8081;
var fileServer = new(Server)('.');
var server = http.createServer(handleRequest);

var channel = new WebSocketServer({port: wsPort});

function handleRequest(req, res) {
  req.addListener('end', function() {
    fileServer.serve(req, res, function(err, result) {
      if (err) {
        console.error('Error serving %s - %s', req.url, err.message);
        res.statusCode = err.status;
        res.end(String(err.status));
        return;
      }
      console.log('%s - %s', req.url, res.message);
    });
  }).resume();
}

function tryNextPort(err) {
  if (err.code == 'EADDRINUSE' || err.code == 'EACCES') {
    httpPort += 1;
    server.listen(httpPort);
    // channel = ws.WebSocket("ws://localhost:" + port);
  }
}

function sendData(messageType, data) {
  var message;

  data.type = messageType;
  message   = JSON.stringify(data);

  channel.clients.forEach(function (client) {
    console.log('sending message');
    client.send(message);
  });
}

function sendFile(filePath) {
  fs.readFile(filePath, {encoding: "utf-8"}, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("sending file %s to editor!", filePath);
      sendData("fileLoad", {content: data, filePath: filePath});
    }
  });
}

server.on('error', tryNextPort);
channel.on('error', function (error) {
  // try next port for wss
  console.log(error);
});

server.on('listening', function() {
  server.removeListener('error', tryNextPort);
  console.log('Moonchild is running at http://localhost:' + httpPort + '/editor/');
  console.log("Its websocket is listening at ws://localhost:8080");
});

channel.on('connection', function (client) {
  console.log('opened ws');
  if (process.argv[2]) {
    sendFile(process.argv[2]);
  }

  client.on("message", function (message) {
    var data = JSON.parse(message);

    if (data.type === "saveFile") {
      fs.writeFile(data.filePath, data.content);
    }
  });
});

channel.on('message', function () {
  console.log('received message');
});

server.listen(8080);
