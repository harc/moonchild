var Server = require('node-static').Server,
    http = require('http'),
    util = require('util');

var port = 8080;
var fileServer = new(Server)('.');
var server = http.createServer(handleRequest);

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
  if (err.code == 'EADDRINUSE' || err.code == 'EACCES')
    server.listen(++port);
}

server.on('error', tryNextPort);
server.on('listening', function() {
  server.removeListener('error', tryNextPort);
  console.log('Moonchild is running at http://localhost:' + port + '/editor/');
});
server.listen(8080);
