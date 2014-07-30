var utils = require('./domUtils');

// Map of key names to codes, taken from github.com/madrobby/keymaster/.
var Keys = {
  backspace: 8, tab: 9, clear: 12,
  enter: 13, 'return': 13,
  esc: 27, escape: 27, space: 32,
  left: 37, up: 38,
  right: 39, down: 40,
  del: 46, 'delete': 46,
  home: 36, end: 35,
  pageup: 33, pagedown: 34,
  ',': 188, '.': 190, '/': 191,
  '`': 192, '-': 189, '=': 187,
  ';': 186, '\'': 222,
  '[': 219, ']': 221, '\\': 220
};

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(val, hi));
}

function TextModel() {
  this._buffer = [];
  this._cursor = this._anchor = 0;
  this._handlers = {};
};

TextModel.prototype.getValue = function() {
  return this._buffer.join('');
};

TextModel.prototype.getCursor = function() {
  return this._cursor;
};

TextModel.prototype.setCursor = function(index) {
  this.setSelection(index, index);
};

TextModel.prototype.getSelection = function() {
  return [this._anchor, this._cursor];
}

TextModel.prototype.setSelection = function(anchorOffset, cursorOffset) {
  // The anchor is always left of the cursor.
  this._anchor = clamp(
      Math.min(anchorOffset, cursorOffset), 0, this._buffer.length);
  this._cursor = clamp(
      Math.max(anchorOffset, cursorOffset), 0, this._buffer.length);
}

TextModel.prototype.hasSelection = function() {
  return this._cursor != this._anchor;
}

TextModel.prototype.insert = function(str) {
  if (this.hasSelection())
    this._deleteInternal();

  var spliceArgs = [this._cursor, 0].concat(str.split(''));
  this._buffer.splice.apply(this._buffer, spliceArgs);
  this.setCursor(this._cursor + str.length);
  this.emit('change');
};

TextModel.prototype.delete = function() {
  this._deleteInternal();
  this.emit('change');
}

TextModel.prototype._deleteInternal = function() {
  var i = Math.min(this._anchor, this._cursor);
  var delCount = Math.max(1, Math.abs(this._anchor - this._cursor));
  this._buffer.splice(i, delCount);
  this.setCursor(i);
};

TextModel.prototype.deleteBackwards = function() {
  if (!this.hasSelection())
    this.setSelection(this._anchor - 1, this._cursor);

  if (this.hasSelection())
    this.delete();
};

TextModel.prototype.on = function(eventType, handler) {
  var arr = this._handlers[eventType] || [];
  this._handlers[eventType] = arr;
  if (arr.indexOf(handler) == -1)
    arr.push(handler);
};

TextModel.prototype.emit = function(eventType, args) {
  var handlers = this._handlers[eventType];
  if (handlers)
    handlers.forEach(function(h) { h.apply(null, args); });
};

TextModel.prototype.off = function(eventType, handler) {
  var arr = this._handlers[eventType];
  if (arr) {
    var i = arr.indexOf(handler);
    if (i >= 0)
      arr.splice(i, 1);
  }
};

TextModel.prototype.restoreSelection = function(el) {
  var sel = this.getSelection();
  utils.setSelection(el, sel[0], sel[1]);
};

// Connects a DOM element to a TextModel, so that key presses and cursor
// movement in the DOM element are reflected in the TextModel.
function connect(el, model) {
  el.contentEditable = true;
  el.style.whiteSpace = 'pre-wrap';

  var doc = el.ownerDocument;
  doc.addEventListener('selectionchange', function() {
    var sel = window.getSelection();
    if (!utils.isDescendantOf(el, sel.focusNode)) return;

    model.setSelection(
      utils.getAbsoluteOffset(el, sel.anchorNode, sel.anchorOffset),
      utils.getAbsoluteOffset(el, sel.focusNode, sel.focusOffset));
  });
  el.addEventListener('keypress', function(e) {
    model.insert(String.fromCharCode(e.which));
    e.preventDefault();
  });
  el.addEventListener('keydown', function(e) {
    var handlers = {};
    handlers[Keys.backspace] = model.deleteBackwards.bind(model);
    handlers[Keys.delete] = model.delete.bind(model);
    handlers[Keys.enter] = function() { model.insert('\n'); };

    if (e.which in handlers) {
      handlers[e.which]();
      e.preventDefault();
    }
  });
  // Re-render on any input -- this effectively disables most of the
  // command shortcuts, e.g. Ctrl-B for bold.
  el.addEventListener('input', function(e) {
    if (el.textContent != model.getValue()) {
      console.error('Element content differs from TextModel.');
      console.log(el.textContent);
      console.log(model.getValue());
    }
    model.emit('change');
  });
}

function ViewModel(el) {
  this.textModel = new TextModel;
  this.el = el;
  connect(el, this.textModel);
}

ViewModel.prototype.restoreSelection = function() {
  this.textModel.restoreSelection(this.el);
};

ViewModel.prototype.wrapText = function(start, end, nodeOrDesc) {
  var doc = this.el.ownerDocument;
  var value = this.textModel.getValue();
  var beforeText = value.slice(0, start);
  var afterText = value.slice(end);

  var node = utils.createElement(doc, nodeOrDesc);
  node.textContent = this.textModel.getValue().slice(start, end);

  this.el.textContent = beforeText;
  this.el.appendChild(node);
  this.el.appendChild(doc.createTextNode(afterText));
};

module.exports = { TextModel: TextModel, ViewModel: ViewModel, setSelection: utils.setSelection };
