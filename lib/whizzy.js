var whizzy = (function() {
  function Model() {
    this._buffer = [];
    this._cursor = 0;
  };

  Model.prototype.getValue = function() {
    return this._buffer.join('');
  }

  Model.prototype.getCursor = function() {
    return this._cursor;
  }

  Model.prototype.setCursor = function(index) {
    this._cursor = index;
  }

  Model.prototype.insert = function(str) {
    var spliceArgs = [this._cursor, 0].concat(str.split(''));
    this._buffer.splice.apply(this._buffer, spliceArgs);
    this._cursor += str.length;
  }

  Model.prototype.delete = function(count) {
    this._buffer.splice(this._cursor, count || 1);
  }

  Model.prototype.deleteBackwards = function(count) {
    count = Math.min(this._cursor, count || 1);
    this._cursor -= count;
    this._buffer.splice(this._cursor, count);
  }

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
  }

  return { Model: Model, connect: connect };
})({});
