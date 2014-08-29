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
      var markdownAst = moonchild.getExtras(c, markdown);
      if (!markdownAst)
        return;

      // Unfortunately, there's no good way to attach an event listener
      // to the rendered output of a Markdown AST node. Instead, attach a
      // listener on the top-level element produced by the Markdown.
      // TODO: Find a better way to do this.
      markdownAst.eventListeners.click.push(function(e) {
        var el = e.target;
        if (el.tagName.toLowerCase() == 'code') {
          var identNode = declarations[el.textContent];
          if (identNode) {
            selectNode(codeMirror, identNode);
            e.preventDefault();
          }
        }
      });

      // Walk the tree and look for <code> nodes. If the node refers to a
      // known declaration, replace the node with a link to the declaration.
      markdown.walker.reduce(markdownAst, function(memo, node) {
        if (node.type == 'codespan') {
          var identNode = declarations[node.text];
          if (identNode) {
            return {
              type: 'link',
              text: [node],
              href: '#',
            };
          }
        }
        return _.extend(node, memo);
      });
    });
  });
});
