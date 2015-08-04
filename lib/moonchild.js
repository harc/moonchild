'use strict';

var _ = require('underscore');
var parser = require('./metadata');
var estraverse = require('estraverse');
var expanders = require('../third_party/expanders');
var util = require('./util');
var Channel = require('../common/channel');

var globalHooks = {};
var globalExtensions = {};
var globalEditor = {};

var portParam = parseInt(util.getParameterByName('port'), 10);
// check for invalid ports passed, if an invalid port was passed, use the default port 8080
var port = isNaN(portParam) ? 8080 : portParam;

var channel = new Channel({port: port, type: Channel.client});

var widgetExpander = expanders.createExpander('displayWidget');
var exportsExpander = expanders.createExpander('extensionId');

// Encapsulates the extension API that is provided to a single extension.
function Extension(id) {
  if (id in globalExtensions) {
    throw new Error("An extension named '" + id + "' is already registered");
  }
  this._id = id || _.uniqueId('ext-');
  this._hooks = {};
  this._expander = expanders.createExpander('extras');
  this.on = _.partial(addHook, this._id, globalHooks);
}

Extension.prototype.addWidget = function(pos, node, type, userData) {
  // TODO: Figure out how to handle this.
  if (widgetExpander.has(node, 'displayWidget')) {
    throw new Error('Conflicting widgets on node');
  }
  widgetExpander.set(node, 'displayWidget', {
    type: type,
    pos: pos,
    data: userData
  });
};

Extension.prototype.getWidget = function(node) {
  // TODO: Should this only be exposed to certain types of extensions?
  return widgetExpander.get(node, 'displayWidget');
};

Extension.prototype.setExtras = function(node, data) {
  return this._expander.set(node, 'extras', data);
};

Extension.prototype.getExtras = function(node, ext) {
  // If `ext` is defined, it's the exports from an extension. Use that
  // object to find the actual extension.
  var exp, id;
  exp = ext ? (id = exportsExpander.get(ext, 'extensionId'), globalExtensions[id]._expander) : this._expander;
  return exp.get(node, 'extras');
};

// Constants for the `pos` argument to `addWidget`.
Extension.prototype.BEFORE = 'before';
Extension.prototype.AFTER = 'after';
Extension.prototype.REPLACE = 'replace';

// Allows a client to hook the action named `hookName`. Every time the action
// performed, `visitor` will be called with the hook-specific arguments.
function addHook(id, hookState, hookName, func) {
  var hooks;

  if (!id) {
    id = _.uniqueId('hook-');
  }

  if (hookState[hookName]) {
    hooks = hookState[hookName];
  } else {
    hooks = hookState[hookName] = {};
  }

  if (!hooks[id]) {
    hooks[id] = [];
  }

  hooks[id].push(func);
}

function invokeHook(hook, args) {
  return _.each(globalHooks[hook], function(hookFns, id) {
    return _.each(hookFns, function(fn) {
      return applySafely(fn, args);
    });
  });
}

function initializeExtension(ext, deps, initFn) {
  var result;

  if (initFn) {
    result = initFn.apply(null, [ext].concat(deps));
  }

  if (result) {
    if (_.isObject(result)) {
      return result;
    }
    throw new TypeError('Invalid export from extension (must be an object)');
  }

  return {};
}

function registerExtension(id, deps, initFn) {
  // Allow extensions with no explicit dependencies.
  if (!_.isArray(deps)) {
    initFn = deps;
    deps = [];
  }

  deps = deps.map(function(name) {
    if (!(name in globalExtensions)) {
      throw new Error('Unmet dependency ' + name);
    }

    return globalExtensions[name].exports;
  });

  var ext = new Extension(id);
  ext.exports = initializeExtension(ext, deps, initFn);

  // Allow the exports object can be traced back to the extension itself.
  exportsExpander.set(ext.exports, 'extensionId', ext._id);
  globalExtensions[ext._id] = ext;

  return ext;
}

function parse(hooks, source) {
  var tree = parser.parse(source);
  invokeHook('parse', getHookArgs(tree));
  return tree;
}

function getHookArgs(ast) {
  // For API convenience, the tree is currently passed as an
  // Underscore-wrapped list of nodes, but this should change.
  var nodes = [];

  estraverse.traverse(ast, {
    enter: function(node) {
      return nodes.push(node);
    }
  });

  return [_.chain(nodes), _.chain(ast.comments)];
}

function applySafely(func, args) {
  try {
    return func.apply(null, args);
  } catch (e) {
    return console.log(e.stack || e);  // eslint-disable-line no-console
  }
}

function onChange(newValue) {
  var tree;

  try {
    tree = parse(globalHooks, newValue);
  } catch (e) {
    console.log(e);  // eslint-disable-line no-console
    return;
  }

  var hookArgs = getHookArgs(tree);
  invokeHook('display', hookArgs);

  // Run the render hooks.
  invokeHook('render', hookArgs);
}

function setEditor(editor) {
  globalEditor = editor;
  return editor;
}

function getEditor() {
  return globalEditor;
}

function getChannel() {
  return channel;
}

module.exports = {
  on: _.partial(addHook, null, globalHooks),
  onChange: onChange,  // TODO: Get rid of this.
  parse: parse,
  registerExtension: registerExtension,
  traverse: estraverse.traverse,
  setEditor: setEditor,
  getEditor: getEditor,
  getChannel: getChannel
};
