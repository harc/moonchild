function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

var nodes = {};
var codeMirror = Moonchild.createEditor($('textarea'));
var markers = [];

var moonchild = Moonchild.registerExtension();
var options = {};

// Add a parse listener that attaches a unique ID to each node, and then marks
// the text of each comment with its associated AST node.
moonchild.on('parse', function(ast) {
  _.invoke(markers, 'clear');

  ast.filter(hasMetadata).each(function(node) {
    // Use a unique ID to associate a node and its metadata.
    var id = _.uniqueId('mc-node-');
    nodes[id] = node;

    var options = { className: 'mc-metadata ' + id };
    var ellipsis;
    if (node.metadata.value && !containsCursor(codeMirror, node.metadata)) {
      ellipsis = createElement('span', { 'class': 'mc-ellipsis' });
      ellipsis.innerHTML = '&#8943;';
      options.replacedWith = ellipsis;
    }
    var marker = markNodeText(codeMirror, node.metadata, options);
    markers.push(marker);

    // Clear the marker (show the text) when the ellipsis is clicked.
    if (ellipsis) {
      ellipsis.addEventListener('click', function(e) {
        marker.clear();
        setCursorBeforeNode(codeMirror, node.metadata);
      });
    }
  });
});

function render(node) {
  var extras = moonchild.findExtras(node, { type: 'DisplayWidget' });
  if (extras)
    renderWidget(codeMirror, node, extras.widgetPos, extras.widgetType);
  else
    clearWidgets(codeMirror, node);
}

moonchild.on('render', function(ast, comments) {
  ast.each(render);
  comments.each(render);
});

// Highlights the text of the given AST node in the editor.
function highlightNode(node) {
  var marker = markNodeText(codeMirror, node, { className: 'highlight' });
  setTimeout(function() {
    marker.clear();
  }, 1000);
}

codeMirror.on('mousedown', function(cm, e) {
  var classList = e.target.classList;
  if (classList.contains('mc-metadata')) {
    var id = _.find(classList, function(className) {
      return className.indexOf('mc-node-') == 0;
    });
    highlightNode(nodes[id]);
  }
});

function toggle(el, value) {
  if (value !== undefined)
    el.classList.toggle('on', value);
  else
    el.classList.toggle('on')
  options[el.id] = el.classList.contains('on');
}

var controls = $$('#controls > div');
for (var i = 0; i < controls.length; i++) {
  controls[i].addEventListener('click', function(e) {
    toggle(this);
    e.preventDefault();
    if (this.id == 'all') {
      for (var j = 0; j < controls.length; j++)
        toggle(controls[j], this.classList.contains('on'));
    }
    Moonchild.onChange(codeMirror);
  });
}
