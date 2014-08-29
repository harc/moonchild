function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

var nodes = {};
var codeMirror = Moonchild.createEditor($('textarea'));

var moonchild = Moonchild.registerExtension();
var options = {};

function render(node) {
  var widget = moonchild.getWidget(node);
  if (widget)
    renderWidget(codeMirror, node, widget.pos, widget.type);
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
