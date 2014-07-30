// For a given offset into the textContent of a DOM node, find the the most
// specific descendent node that contains that offset.
// Returns an object { node, offset } which gives the node and the relative
// offset in that node.
function findNestedOffset(startNode, offset) {
  if (offset <= startNode.textContent.length) {
    if (startNode.nodeType == Node.TEXT_NODE)
      return { node: startNode, offset: offset };

    var children = startNode.childNodes;
    for (var i = 0; i < children.length; ++i) {
      var n = findNestedOffset(children[i], offset);
      if (n) return n;
      offset -= children[i].textContent.length;
    }
  }
  if (offset == 0)
    return { node: startNode, offset: 0 };

  return null;
}

module.exports = {
  // Returns true if `currentNode` is a descendant of `aNode`.
  isDescendantOf: function(aNode, currentNode) {
    while (currentNode) {
      if (currentNode === aNode) return true;
      currentNode = currentNode.parentNode;
    }
    return false;
  },

  findNestedOffset: findNestedOffset,

  createElement: function(document, desc) {
    var parts = desc.split('#');
    if (parts.length > 2) throw 'Too many IDs specified';

    var id = parts[1];
    var classList = (id || parts[0]).split('.');
    var tagName = classList.shift();

    var node = document.createElement(tagName);
    if (id) node.id = id;
    if (classList.length > 0) node.class = classList.join(' ');

    return node;
  },

  // Sets the selection inside a DOM node.
  setSelection: function(el, anchorOffset, cursorOffset) {
    var range = document.createRange();
    var startNode = findNestedOffset(el, anchorOffset);
    range.setStart(startNode.node, startNode.offset);

    var endNode = findNestedOffset(el, cursorOffset);
    range.setEnd(endNode.node, endNode.offset);

    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  },

  getAbsoluteOffset: function(baseNode, relNode, offset) {
    var range = document.createRange();
    range.setStart(baseNode, 0);
    range.setEnd(relNode, offset);
    return range.toString().length;
  }
};
