var whizzy = (function() {
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

  // Returns true if `currentNode` is a descendant of `aNode`.
  function isDescendantOf(aNode, currentNode) {
    while (currentNode) {
      if (currentNode === aNode) return true;
      currentNode = currentNode.parentNode;
    }
    return false;
  }

  // Connects a DOM element to a model, so that key presses and cursor
  // movement in the DOM element are reflected in the model.
  function connect(el, model) {
    el.contentEditable = true;
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
      if (e.which == 8)
        model.deleteBackwards();
      else if (e.which == 46)
        model.delete();
    });
    // Re-render on any input -- this effectively disables most of the
    // command shortcuts, e.g. Ctrl-B for bold.
    el.addEventListener('input', function(e) {
      model.emit('change');
    });
  }

  return { Model: Model, connect: connect };
})({});
