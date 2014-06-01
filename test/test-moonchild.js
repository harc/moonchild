var test = require('tap').test;
var Moonchild = require('../lib/moonchild');

test('hooks', function(t) {
  var tree;
  Moonchild.on('parse', function(ast) { tree = ast; });
  Moonchild.parse('');
  t.ok(!!tree, 'Parse hook is called');

  var lastTree = tree;
  tree = null;
  Moonchild.parse('');
  t.ok(!!tree, 'Parse hook is called again');
  t.notStrictEquals(tree, lastTree, 'Parse hook is called with a different argument');

  t.end();
});
