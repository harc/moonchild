(function() {

var widgets = [];

function getMetadata(node, property) {
  if (node.metadata && node.metadata.value)
    return node.metadata.value[property];
}

function hasTemplate(node) {
  return getMetadata(node, 'type') == 'template';
}

addStyle({
  '.mc-template-preview': {
    'font-family': 'Helvetica, Arial, sans-serif'
  }
});

Moonchild.on('parse', function(ast) {
  var oldWidgets = widgets;
  widgets = [];

  // Find CSS color values, and show a little color swatch beside them.
  // Clicking on the swatch reveals a color picker.
  ast.filter(hasTemplate).each(function(node) {
    var pos = esLocToCm(node.loc.end);
    var lineInfo = codeMirror.lineInfo(pos.line);

    // Try to reuse an existing bookmark if one exists.
    // TODO: Move this into the parse hook, so that addons get it for free.
    var mark = codeMirror.findMarksAt(pos)[0];
    var previewWidget;
    if (lineInfo.widgets)
      previewWidget = lineInfo.widgets[0];
    if (!mark) {
      var el = createElement('div', { 'class': 'mc-callout' });
      mark = codeMirror.setBookmark(pos, { widget: el });

      // Create the preview widget.
      var previewEl = createElement('div', {
        'class': 'mc-template-preview',
        style: [
          'border-bottom: 1px solid grey',
          'border-top: 1px solid grey',
          'width: 100%',
          'margin-top: 5px',
          'padding-bottom: 5px',
          'padding-top: 5px'
        ].join(';')
      });
      previewEl.hidden = true;
      var line = esLocToCm(node.loc.end).line;
      previewWidget = codeMirror.addLineWidget(line, previewEl);

      // Add a click handler that shows and hides the preview pane.
      el.addEventListener('click', function(e) {
        previewEl.hidden = !previewEl.hidden;
        e.preventDefault();
      });
    }
    // Render the template preview.
    var templateString = node.declarations[0].init.value;
    var templateData = node.metadata.value.sampleData;
    previewWidget.node.innerHTML = template(templateString, templateData);

    widgets.push(mark);
    widgets.push(previewWidget);
  });
  // Clear all the widgets that weren't reused.
  _.invoke(_.difference(oldWidgets, widgets), 'clear');
});

})();  // function
