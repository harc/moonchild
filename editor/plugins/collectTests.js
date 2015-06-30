var lineWidgets = [];

Moonchild.on('parse', function(ast) {
  var tests = {};

  // Tell codemirror to clear all widgets, and remove all widget references.
  // At every edit, all widgets are removed and then rerendered.
  _.invoke(lineWidgets, 'clear');
  lineWidgets = [];

  if (!options.collectTests) return;

  // Collect all test functions found in the code.
  ast.filter(hasMetadata).each(function(node) {
    var data = node.metadata.value;
    if (data && 'testFor' in data) {
      tests[data.testFor] = node;
    }
  });

  // Find functions that have tests, and run the tests.
  ast.where({ 'type': 'FunctionDeclaration' }).each(function(node) {
    if (node.id.name in tests) {
      var loc = esLocToCm(node.loc.start);
      var el = createElement('div', { 'class': 'test-result' }, 'Tests');
      var widget = codeMirror.addLineWidget(loc.line, el, { above: true });
      lineWidgets.push(widget);

      test = tests[node.id.name];
      var code = '(function() { ' + codeMirror.getValue() + '; return ' + test.id.name + '()}())';
      var result;
      try {
        eval(code);
        result = true;
      } catch(e) {}
      el.classList.toggle('ok', !!result);
    }
  });
});
