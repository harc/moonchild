var fs = require("fs");

function createFileloader (channel) {
  var fileloader = Object.create(null);

  fileloader.sendFile = function sendFile(channel, filePath) {
    fs.readFile(filePath, {encoding: "utf-8"}, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("sending file %s to editor!", filePath);
        channel.sendToAll("fileLoad", {content: data, filePath: filePath});
      }
    });
  }

  channel.onConnection(function () {
    var filename = process.argv[2];

    if (filename) {
      fileloader.sendFile(this, process.argv[2]);
    }
  });

  channel.on("saveFile", function (data) {
    console.log("Writing to file %s", data.filePath);
    fs.writeFile(data.filePath, data.content);
  });

  return fileloader;
}

module.exports = {
  createFileloader: createFileloader
};