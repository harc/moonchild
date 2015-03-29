'use strict';

var _ = require('underscore'),
    estraverse = require('estraverse'),
    metadata = require('../lib/metadata'),
    test = require('tap').test;

// Returns a list of all the nodes in an AST using pre-order traversal.
function nodes(ast) {
  var result = [];
  estraverse.traverse(ast, {
    enter: function(node, parent) {
      result.push(node);
    }
  });
  return result;
}

function parse(code) {
  return metadata.parse(code);
}

// Returns the first node in an AST that has metadata.
function firstWithMetadata(ast) {
  return _.find(nodes(ast), function(n) {
    return !!n.metadata;
  });
}

test('basic metadata', function (t) {
  var ast = parse('42;\n/*^ {} */\nvar meaning;');
  t.equals(firstWithMetadata(ast).type, 'VariableDeclaration', 'Normal metadata is attached to the next node');

  ast = parse('42; //^ {}');
  t.equals(firstWithMetadata(ast).type, 'ExpressionStatement', 'Inline metadata is attached to the previous node');

  ast = parse('//^ { message: "Behold!" }\n\n42;');
  t.equals(firstWithMetadata(ast).type, 'Program', 'Top-level metadata is attached to the program node');

  ast = parse('//^ { message: "Behold!" }\n42;');
  t.equals(firstWithMetadata(ast).type, 'ExpressionStatement', 'Normal metadata is not mistaken as top-level');

  t.end();
});

test('metadata parsing', function(t) {
  var ast = parse('//^ { message: "Behold!" }\n\n42;');
  var node = firstWithMetadata(ast);
  t.ok(_.isObject(node.metadata), 'Metadata is an object');
  t.deepEquals(node.metadata.value.message, 'Behold!', 'Data is parsed correctly');

  // Test some invalid metadata.
  ast = parse('42; //^ invalid!');
  t.similar(firstWithMetadata(ast).metadata.value, null, 'Metadata value should be null');

  t.end();
});
