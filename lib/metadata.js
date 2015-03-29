'use strict';

var _ = require('underscore'),
    esprima = require('esprima'),
    estraverse = require('estraverse');

var MAGIC_CHAR = '^';

var parseOptions = {
  comment: true,  // Preserve comments.
  loc: true,  // Nodes include line- and column-based location info.
  range: true  // Nodes have an index-based location range (array).
};

function parse(source) {
  var ast = esprima.parse(source, parseOptions);
  var metadata = _.map(_.filter(ast.comments, containsMetadata), parseMetadata);
  attachMetadata(ast, metadata);
  return ast;
}

function parseMetadata(commentNode) {
  var value;
  try {
    // TODO: Don't be evil.
    value = eval('(' + commentNode.value.slice(1) + ')');  // eslint-disable-line no-eval
  } catch (e) {}  // eslint-disable-line no-empty
  commentNode.contents = commentNode.value;
  commentNode.value = _.isObject(value) ? value : void 0;
  return commentNode;
}

// Traverses the AST and attaches the metadata. Uses a pre-order traversal
// so that metadata will be attached to the highest node that it applies to.
function attachMetadata(ast, metadata) {
  // TODO: Handle multiple pieces of metadata per node.
  var prev = null;
  estraverse.traverse(ast, {
    enter: function(node, parent) {
      if (metadata.length === 0) {
        return estraverse.VisitorOption.Break;
      }
      if (node === ast) {
        attachToRootNode(ast, metadata);
      } else {
        if (!attachToPreviousNode(prev, metadata)) {
          attachToFollowingNode(node, metadata);
        }
        prev = node;
      }
    }
  });
  if (metadata.length > 0 && !attachToPreviousNode(prev, metadata)) {
    ast.metadata = metadata[0];
  }
}

// Attach the next piece of metadata to `node` if there is at least one line
// between the end of the metadata and the beginning of the node.
function attachToRootNode(node, metadata) {
  if (node.loc.start.line > metadata[0].loc.end.line + 1) {
    node.metadata = metadata.shift();
    return true;
  }
  return false;
}

// Attach the next piece of metadata to `node` if the metadata begins on the
// same line that `node` ends on.
function attachToPreviousNode(node, metadata) {
  if ((node != null) && followsOnLine(node, metadata[0])) {
    node.metadata = metadata.shift();
    return true;
  }
  return false;
}

// Attach the next piece of metadata to `node` if the node follows the metadata.
function attachToFollowingNode(node, metadata) {
  if (node.range[0] > metadata[0].range[1]) {
    node.metadata = metadata.shift();
    return true;
  }
  return false;
}

// Returns true if `second` comes after `first`, and starts on the same line as
// `first` ends.
function followsOnLine(first, second) {
  return first.range[1] < second.range[0] && first.loc.end.line === second.loc.start.line;
}

// Returns true if the given comment node contains metadata.
function containsMetadata(commentNode) {
  return commentNode.value[0] === MAGIC_CHAR;
}

module.exports = {
  parse: parse
};
