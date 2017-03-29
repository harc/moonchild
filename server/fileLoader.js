var fs = require("fs");

function sendFile(channel, filePath) {
  fs.readFile(filePath, {encoding: "utf-8"}, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("sending file %s to editor!", filePath);
      channel.send("fileLoad", {content: data, filePath: filePath});
    }
  });
}

function onConnection () {
  var filename = process.argv[2];

  if (filename) {
    sendFile(this, process.argv[2]);
  }
}

module.exports = {
  sendFile: sendFile,
  onConnection: onConnection
};