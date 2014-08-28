// An extension that walks JavaScript ASTs, and for all nodes that
// introduce a new lexical scope, annotates the node with information about
// all declarations in that scope.
Moonchild.registerExtension('js-declarations', function(moonchild) {
  // TODO: Make this extension depend on 'javascript'.
  moonchild.on('parse', function(ast) {
    var scopes = [];
    Moonchild.traverse(ast.value()[0], {
      enter: function(node) {
        if (isScopeNode(node)) {
          var decl = {};
          moonchild.setExtras(node, decl);
          scopes.push(decl);
        }
        if (node.id)
          scopes[scopes.length - 1][node.id.name] = node.id;
      },
      leave: function(node) {
        if (isScopeNode(node))
          scopes.pop();
      }
    });
  });

  // Returns true if the given node introduces a new scope.
  function isScopeNode(n) {
    return n.type == 'FunctionDeclaration' ||
           n.type == 'FunctionExpression' ||
           n.type == 'Program';
  }
});
