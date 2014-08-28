var Widget = Moonchild.Widget = function() {
};

// Helper function to correctly set up the prototype chain for subclasses.
// Based on Backbone: https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js
Widget.extend = function(protoProps, staticProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  _.extend(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype;

  // Assign a unique ID to each type of widget.
  var typeId = _.uniqueId('widget-');

  // A static method to check if a given Element appears to be created by
  // this type of Widget.
  child.created = function(el) {
    return el._moonchildWidgetId == typeId;
  };

  // Wrap the `create` method and ensure that the wiget ID is stored as an
  // expando property on the DOM node.
  var originalCreate = child.prototype.create;
  child.prototype.create = function() {
    var el = originalCreate.call(this);
    el._moonchildWidgetId = typeId;
    return el;
  };

  return child;
};

// Helper for creating a new DOM element.
function createElement(tagName, attrs, textContent) {
  var el = document.createElement(tagName);
  if (textContent)
    el.textContent = textContent;
  for (var key in attrs) {
    if (attrs.hasOwnProperty(key))
      el.setAttribute(key, attrs[key]);
  }
  return el;
}

// Shortcut for calling `CodeMirror.markText()` for the full text of a given
// AST node. `options` is passed directly to `markText`.
function markNodeText(cm, node, options) {
  return cm.markText(
    esLocToCm(node.loc.start),
    esLocToCm(node.loc.end),
    options);
}

// Renders a widget corresponding to `node` in CodeMirror.
// `widgetClass` is a constructor which delegates to Moonchild.Widget.
// `pos` indicates where the widget should appear relative to `node` --
// it can be one of ['before', 'after', 'replace'].
function renderWidget(cm, node, pos, widgetClass) {
  // Find all markers at the same location.
  var marks = cm.findMarks(esLocToCm(node.loc.start), esLocToCm(node.loc.end));

  // Extract the associated DOM nodes from the markers.
  var markEls = _.map(marks, function(m) {
    return m.replacedWith && m.replacedWith.childNodes[0];
  });

  var el, mark;
  // Find the first mark whose element was created by `widgetClass`.
  for (var i = 0; i < marks.length; ++i) {
    if (widgetClass.created(markEls[i])) {
      el = markEls[i];
      mark = marks[i];
      break;
    }
  }

  // Instantiate a new widget, and either create a new DOM node for it, or
  // render it using the previously existing node.
  var widget = new widgetClass();
  if (!el) {
    el = widget.create();
    if (pos == 'replace') {
      mark = markNodeText(cm, node, { replacedWith: el });
    } else if (pos == 'before' || pos == 'after') {
      var loc = esLocToCm(pos == 'before' ? node.loc.start : node.loc.end);
      mark = cm.setBookmark(loc, { widget: el, insertLeft: true });
    } else {
      throw new Error('Not handled!')
    }
    marks.push(mark);
  }
  widget.changed = function() { mark.changed(); }
  widget.render(el, node);
  _.invoke(marks, 'changed');
}

// Clear all widgets associated with node.
function clearWidgets(cm, node) {
  var marks = cm.findMarks(esLocToCm(node.loc.start), esLocToCm(node.loc.end));
  _.each(marks, function(m) {
    if (!m.replacedWith) return;
    var el = m.replacedWith.childNodes[0];
    if (el._moonchildWidgetId)
      m.clear();
  });
}

// Returns a CodeMirror location object that is equivalent to the given
// Esprima location object.
function esLocToCm(loc) {
  return { line: loc.line - 1, ch: loc.column };
}

// Dynamically adds a <style> tag to the document. `styleObj` is a dictionary
// of styles, where the keys are selectors, and the values are objects of
// property/value mappings.
// e.g. { '#myHeadline': { 'text-weight': 'bold', 'font-size': '32px' } }
function addStyle(styleObj) {
  var rules = _.map(styleObj, function(style, selector) {
    return selector + '{ ' + styleToString(style) + ' }';
  });
  var el = createElement('style', { type: 'text/css' }, rules.join(' '));
  document.getElementsByTagName('head')[0].appendChild(el);
}

function styleToString(obj) {
  return _.map(obj, function(value, key) {
    return key + ': ' + value;
  }).join('; ');
}

function template(templateString, data) {
  return _.template(templateString, data, {
    interpolate: /\{\{(.+?)\}\}/g
  });
}

function containsCursor(cm, node) {
  var cursorIndex = cm.indexFromPos(cm.getCursor());
  return node.range[0] < cursorIndex && cursorIndex <= node.range[1];
}

function setCursorBeforeNode(cm, node) {
  cm.setCursor(esLocToCm(node.loc.start));
  cm.focus();
}

function selectNode(cm, node) {
  highlightLocation(
      cm, esLocToCm(node.loc.start), esLocToCm(node.loc.end));
}

function highlightLocation(cm, startLoc, endLoc) {
  cm.setSelection(startLoc, endLoc);
  cm.scrollIntoView();
  cm.focus();
}

function hasMetadata(node) {
  return !!node.metadata;
}

function isMetadata(node) {
  return !!node.contents && (node.type == 'Block' || node.type == 'Line');
}
