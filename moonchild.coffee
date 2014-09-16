parser = require './metadata'

_ = require 'underscore'
estraverse = require 'estraverse'
expanders = require 'expanders'

globalHooks = {}
globalExtensions = {}

widgetExpander = expanders.createExpander('displayWidget')
exportsExpander = expanders.createExpander('extensionId')

# Encapsulates the extension API that is provided to a single extension.
class Extension
  constructor: (id) ->
    if id of globalExtensions
      throw new Error("An extension named '#{ id }' is already registered")

    @_id = id || _.uniqueId('ext-')
    @_hooks = {}
    @_expander = expanders.createExpander('extras')
    @on = _.partial(addHook, @_id, globalHooks)

  addWidget: (pos, node, type, userData) ->
    # TODO: Figure out how to handle this.
    if widgetExpander.has(node, 'displayWidget')
      throw new Error('Conflicting widgets on node')

    widgetExpander.set node, 'displayWidget',
      type: type
      pos: pos
      data: userData
    return

  getWidget: (node) ->
    # TODO: Should this only be exposed to certain types of extensions?
    widgetExpander.get(node, 'displayWidget')

  setExtras: (node, data) ->
    @_expander.set node, 'extras', data

  getExtras: (node, ext) ->
    # If `ext` is defined, it's the exports from an extension. Use that
    # object to find the actual extension.
    exp = if ext
      id = exportsExpander.get(ext, 'extensionId')
      globalExtensions[id]._expander
    else
      @_expander
    exp.get(node, 'extras')

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

initializeExtension = (ext, deps, initFn) ->
  result = initFn?.apply(null, [ext].concat(deps))
  if result?
    if _.isObject(result) then return result
    throw new TypeError('Invalid export from extension (must be an object)')
  {}

registerExtension = (id, deps, initFn) ->
  # Allow extensions with no explicit dependencies.
  if !_.isArray(deps)
    initFn = deps
    deps = []

  deps = deps.map (name) ->
    if not name of globalExtensions
      throw new Error "Unmet dependency #{name}"
    return globalExtensions[name].exports

  ext = new Extension(id)
  ext.exports = initializeExtension(ext, deps, initFn)
  # Allow the exports object can be traced back to the extension itself.
  exportsExpander.set(ext.exports, 'extensionId', ext._id)

  globalExtensions[ext._id] = ext

parse = (hooks, source) ->
  tree = parser.parse(source)
  hookArgs = getHookArgs(tree)
  hooksDo globalHooks['parse'], (func, id) ->
    applySafely(func, hookArgs)
  tree

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

onChange = (newValue) ->
  try
    tree = parse(globalHooks, newValue)
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
  on: _.partial(addHook, null, globalHooks)
  onChange,  # TODO: Get rid of this.
  parse,
  registerExtension,
  traverse: estraverse.traverse
}
