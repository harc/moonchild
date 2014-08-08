# Moonchild

Moonchild brings source code to life.

## Basic Setup

```
git clone https://github.com/pdubroy/moonchild.git
cd moonchild
npm install
```

## Running the demo

Run `npm start` to start the server required for the editor demo. To open the editor, open the URL printed in the console (e.g. http://localhost:8080/editor).

## Organization

`metadata.coffee` is the source code for the modified JavaScript parser, which parses metadata embedded in comments and attaches it to the appropriate AST nodes.

`moonchild.coffee` provides the core of the plugin system: plugin registration, and notifying the plugins when a new AST is available.

The code for the editor is in `editor/`. `ui_helpers.js` contains a bunch of stuff that should eventually go into Moonchild proper.

## Writing plugins

The plugins are written in a few different styles, but `markdown-comments.html` is the best example of how I think plugins should be written.

A minimal plugin looks like this:

```js
var moonchild = Moonchild.registerExtension();
moonchild.on('parse', function(ast, comments) {
  // Analyze the AST, potentially extend nodes using `moonchild.addExtras`.
});
```

A plugin that modifies the presentation should also do something like this:
```
moonchild.on('display', function(ast, comments) {
  // Walk the AST, and change the source code presentation by calling
  // `moonchild.addWidget`.
});
```
