MAGIC_CHAR = '^'

# Esprima parse options.
parseOptions =
  comment: true  # Preserve comments.
  loc: true  # Nodes include line- and column-based location info.
  range: true  # Nodes have an index-based location range (array).

parse = (source) ->
  ast = esprima.parse(source, parseOptions)
  metadata = _.map(_.filter(ast.comments, containsMetadata), parseMetadata)
  attachMetadata(ast, metadata)
  return ast

parseMetadata = (commentNode) ->
  try
    value = eval '(' + commentNode.value[1..] + ')'  # TODO: Don't be evil.
  catch
  commentNode.contents = commentNode.value
  commentNode.value = if _.isObject(value) then value else undefined
  commentNode

# Traverses the AST and attaches the metadata. Uses a pre-order traversal
# so that metadata will be attached to the highest node that it applies to.
attachMetadata = (ast, metadata) ->
  # TODO: Handle multiple pieces of metadata per node.

  prev = null
  estraverse.traverse ast,
    enter: (node, parent) ->
      if metadata.length == 0
        return estraverse.VisitorOption.Break

      if node == ast
        attachToRootNode(ast, metadata)
      else
        attachToPreviousNode(prev, metadata) or
        attachToFollowingNode(node, metadata)
        prev = node

  if metadata.length > 0 and not attachToPreviousNode(prev, metadata)
    ast.metadata = metadata[0]  # Attach to root node.

# Attach the next piece of metadata to `node` if there is at least one line
# between the end of the metadata and the beginning of the node.
attachToRootNode = (node, metadata) ->
  if node.loc.start.line > metadata[0].loc.end.line + 1
    node.metadata = metadata.shift()

# Attach the next piece of metadata to `node` if the metadata begins on the
# same line that `node` ends on.
attachToPreviousNode = (node, metadata) ->
  if node? and followsOnLine(node, metadata[0])
    node.metadata = metadata.shift()

# Attach the next piece of metadata to `node` if the node follows the metadata.
attachToFollowingNode = (node, metadata) ->
  if node.range[0] > metadata[0].range[1]
    node.metadata = metadata.shift()

# Returns true if `second` comes after `first`, and starts on the same line as
# `first` ends.
followsOnLine = (first, second) ->
  first.range[1] < second.range[0] and
      first.loc.end.line == second.loc.start.line

# Returns true if the given comment node contains metadata.
containsMetadata = (commentNode) -> commentNode.value[0] == MAGIC_CHAR

_ = require 'underscore'
esprima = require 'esprima'
estraverse = require 'estraverse'

module.exports = { parse }

if require?.main == module
  parse require('fs').readFileSync(process.argv[2])
