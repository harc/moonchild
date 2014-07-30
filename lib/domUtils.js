module.exports = {
  // Returns true if `currentNode` is a descendant of `aNode`.
  isDescendantOf: function(aNode, currentNode) {
    while (currentNode) {
      if (currentNode === aNode) return true;
      currentNode = currentNode.parentNode;
    }
    return false;
  },

  nodeForOffset: function nodeForOffset(startNode, offset) {
    if (offset <= startNode.textContent.length) {
      console.log('offset', offset);
      console.log("yep, it's in ", startNode.textContent);
      if (startNode.nodeType == Node.TEXT_NODE)
        return startNode;

      var children = startNode.childNodes;
      for (var i = 0; i < children.length; ++i) {
        var n = nodeForOffset(children[i], offset);
        if (n) return n;
        offset -= children[i].textContent.length;
      }
    }
    if (offset == 0)
      return startNode;

    return null;
  },

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
  }
};
