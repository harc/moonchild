function createFileLoader (moonchild, channel) {
  var fileLoader = Object.create(null);

  // assuming that the editor doesn't get changed
  // weird stuff will happen if the editor -does- get changed
  var editor = moonchild.getEditor()._codeMirror;
  var filePath;

  channel.on("fileLoad", function (messageData) {
    // assuming JSON structure of form
    // {
    //   ...
    //   content: "",
    //   filePath: "bla.js"
    //   ...
    // }

    var text = messageData.content;
    filePath = messageData.filePath;

    editor.setValue(text);

    // let the editor know that a change happened
    moonchild.poke();
  });
}

function loadText(editor, text) {
  console.log("Loading in some text");
  console.log(globalEditor);
  globalEditor._codeMirror.setValue(text);

  onChange(text);
}
