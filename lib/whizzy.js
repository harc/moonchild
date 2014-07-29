var whizzy = (function() {
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

  function Model() {
    this._buffer = [];
    this._cursor = this._anchor = 0;
    this._handlers = {};
  };

  Model.prototype.getValue = function() {
    return this._buffer.join('');
  };

  Model.prototype.getCursor = function() {
    return this._cursor;
  };

  Model.prototype.setCursor = function(index) {
    this.setSelection(index, index);
  };

  Model.prototype.getSelection = function() {
    return [this._anchor, this._cursor];
  }

  Model.prototype.setSelection = function(anchorOffset, cursorOffset) {
    // The anchor is always left of the cursor.
    this._anchor = clamp(
        Math.min(anchorOffset, cursorOffset), 0, this._buffer.length);
    this._cursor = clamp(
        Math.max(anchorOffset, cursorOffset), 0, this._buffer.length);
  }

  Model.prototype.hasSelection = function() {
    return this._cursor != this._anchor;
  }

  Model.prototype.insert = function(str) {
    if (this.hasSelection())
      this._deleteInternal();

    var spliceArgs = [this._cursor, 0].concat(str.split(''));
    this._buffer.splice.apply(this._buffer, spliceArgs);
    this.setCursor(this._cursor + str.length);
    this.emit('change');
  };

  Model.prototype.delete = function() {
    this._deleteInternal();
    this.emit('change');
  }

  Model.prototype._deleteInternal = function() {
    var i = Math.min(this._anchor, this._cursor);
    var delCount = Math.max(1, Math.abs(this._anchor - this._cursor));
    this._buffer.splice(i, delCount);
    this.setCursor(i);
  };

  Model.prototype.deleteBackwards = function() {
    if (!this.hasSelection())
      this.setSelection(this._anchor - 1, this._cursor);

    if (this.hasSelection())
      this.delete();
  };

  Model.prototype.on = function(eventType, handler) {
    var arr = this._handlers[eventType] || [];
    this._handlers[eventType] = arr;
    if (arr.indexOf(handler) == -1)
      arr.push(handler);
  };

  Model.prototype.emit = function(eventType, args) {
    var handlers = this._handlers[eventType];
    if (handlers)
      handlers.forEach(function(h) { h.apply(null, args); });
  };

  Model.prototype.off = function(eventType, handler) {
    var arr = this._handlers[eventType];
    if (arr) {
      var i = arr.indexOf(handler);
      if (i >= 0)
        arr.splice(i, 1);
    }
  };

  Model.prototype.restoreSelection = function(el) {
    var sel = this.getSelection();
    setSelection(el.firstChild || el, sel[0], sel[1]);
  };

  // Returns true if `currentNode` is a descendant of `aNode`.
  function isDescendantOf(aNode, currentNode) {
    while (currentNode) {
      if (currentNode === aNode) return true;
      currentNode = currentNode.parentNode;
    }
    return false;
  }

  // Sets the selection inside a DOM node.
  function setSelection(el, anchorOffset, cursorOffset) {
    var range = document.createRange();
    range.setStart(el, anchorOffset);
    range.setEnd(el, cursorOffset);

    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Connects a DOM element to a model, so that key presses and cursor
  // movement in the DOM element are reflected in the model.
  function connect(el, model) {
    el.contentEditable = true;
    el.style.whiteSpace = 'pre-wrap';

    var doc = el.ownerDocument;
    doc.addEventListener('selectionchange', function() {
      var sel = window.getSelection();
      if (!isDescendantOf(el, sel.focusNode)) return;

      // TODO: Figure out how to do this with nested elements.
      model.setSelection(sel.anchorOffset, sel.focusOffset);
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
        console.error('Element content differs from model.');
        console.log(el.textContent);
        console.log(model.getValue());
      }
      model.emit('change');
    });
  }

  return { Model: Model, connect: connect, setSelection: setSelection };
})({});
