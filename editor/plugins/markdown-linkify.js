// An extension which looks for Markdown code sections (anything inside
// backticks), and if it looks like an identifier (e.g. `foo`), tries to link
// that text to the definition.
Moonchild.registerExtension(
    'markdown-linkify',
    ['markdown', 'js-declarations'],
    function(moonchild, markdown, jsDeclarations) {
  moonchild.on('parse', function(ast, comments) {
    if (!options.linkify) return;

    // Build a map of all the declarations in the file.
    var declarations = {};
    ast.each(function(node) {
      var extras = moonchild.getExtras(node, jsDeclarations);
      if (extras) _.extend(declarations, extras);
    });

    comments.each(function(c) {
      // Look for nodes that have Markdown extras.
      // TODO: Add a built-in traversal to do stuff like this.
      var extras = moonchild.getExtras(c, markdown);
      if (!extras)
        return;

      // Walk the tree and look for <code> nodes. If the node refers to a
      // known declaration, replace the node with a link to the declaration.
      markdown.walker.reduce(extras, function(memo, node) {
        if (node.type == 'CODE') {
          var ident = node.children[0].value;
          var identNode = declarations[ident];
          if (identNode) {
            return {
              type: 'A',
              children: [node],
              attrs: {
                href: '#',
                onclick: function() { selectNode(codeMirror, identNode); }
              }
            };
          }
        }
        node.children = memo;
        return node;
      });
    });
  });
});
