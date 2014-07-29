var whizzy = (function() {
  function Model() {
    this._buffer = [];
    this._cursor = 0;
    this._handlers = {};
  };

  Model.prototype.getValue = function() {
    return this._buffer.join('');
  };

  Model.prototype.getCursor = function() {
    return this._cursor;
  };

  Model.prototype.setCursor = function(index) {
    this._cursor = index;
  };

  Model.prototype.insert = function(str) {
    var spliceArgs = [this._cursor, 0].concat(str.split(''));
    this._buffer.splice.apply(this._buffer, spliceArgs);
    this._cursor += str.length;
    this.emit('change');
  };

  Model.prototype.delete = function(count) {
    this._buffer.splice(this._cursor, count || 1);
    this.emit('change');
  };

  Model.prototype.deleteBackwards = function(count) {
    count = Math.min(this._cursor, count || 1);
    this._cursor -= count;
    this._buffer.splice(this._cursor, count);
    this.emit('change');
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
      model.setCursor(sel.focusOffset);
    });
    el.addEventListener('keypress', function(e) {
      model.insert(String.fromCharCode(e.which));
      e.preventDefault();
    });
    el.addEventListener('keydown', function(e) {
      if (e.which == 8) {
        model.deleteBackwards();
        e.preventDefault();
      } else if (e.which == 46) {
        model.delete();
        e.preventDefault();
      }
    });
  }

  return { Model: Model, connect: connect };
})({});
