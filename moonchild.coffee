parser = require './metadata'

estraverse = require 'estraverse'
_ = require 'underscore'

globalHooks = {}
globalExtensions = {}

# Encapsulates the extension API that is provided to a single extension.
class ExtensionAPI
  constructor: ->
    @_id = _.uniqueId 'ext-'
    globalExtensions[@_id] = this
    @_hooks = {}

    @on = _.partial(addHook, @_id, globalHooks)

  addWidget: (pos, node, type) ->
    this.addExtras node,
      type: 'DisplayWidget'
      widgetType: type
      widgetPos: pos

  addExtras: (node, data) ->
    # TODO: We should probably store extras in a separate map.
    node._extras ||= {}
    key  = @_id + _.uniqueId '_'
    node._extras[key] = data
    return

  getExtras: (node) ->
    node._extras?[@_id]

  findExtras: (node, cond) ->
    if node._extras
      predicate =
        if _.isFunction(cond)
          cond
        else if _.isObject(cond)
          # TODO: Replace this with _.match after upgrading to Underscore 1.6.
          (node) -> _.findWhere([node], cond)?
      _.find(node._extras, predicate)

  # Constants for the `pos` argument to `addWidget`.
  BEFORE: 'before'
  AFTER: 'after'
  REPLACE: 'replace'

# Allows a client to hook the action named `hookName`. Every time the action
# performed, `visitor` will be called with the hook-specific arguments.
addHook = (id, hookState, hookName, func) ->
  id ?= _.uniqueId 'hook-'
  hooks = hookState[hookName] ?= {}
  hooks[id] ?= []
  hooks[id].push(func)
  return

hooksDo = (hook, iter) ->
  _.each hook, (hookFns, id) ->
    _.each hookFns, (fn) -> iter(fn, id)

registerExtension = -> new ExtensionAPI

parse = (hooks, source) ->
  tree = parser.parse(source)
  hookArgs = getHookArgs(tree)
  hooksDo globalHooks['parse'], (func, id) ->
    applySafely(func, hookArgs)
  tree

createEditor = (el) ->
  editor = CodeMirror.fromTextArea(el)
  editor.on('change', _.debounce(onChange, 250))
  editor.setValue(editor.getValue() + ' ')  # Trigger onChange.
  editor

getHookArgs = (ast) ->
  # For API convenience, the tree is currently passed as an
  # Underscore-wrapped list of nodes, but this should change.
  nodes = []
  estraverse.traverse(ast, { enter: (node) -> nodes.push(node) })
  [_.chain(nodes), _.chain(ast.comments)]

applySafely = (func, args) ->
  try
    func.apply(null, args)
  catch e
    console.log e.stack || e

onChange = (cm, changeObj) ->
  try
    tree = parse(globalHooks, cm.getValue())
  catch e
    console.log e
    return

  # Run the display hooks.
  # TODO: This should be moved into a function that can be invoked by the
  # editor plugin.
  hookArgs = getHookArgs(tree)
  hooksDo globalHooks['display'], (func, id) ->
    applySafely(func, hookArgs)

  # Run the render hooks.
  hooksDo globalHooks['render'], (func, id) ->
    applySafely(func, hookArgs)

module.exports = {
  createEditor,
  on: _.partial(addHook, null, globalHooks)
  onChange,  # TODO: Get rid of this.
  parse,
  registerExtension,
  traverse: estraverse.traverse
}
