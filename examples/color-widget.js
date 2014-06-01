var bookmarks = [];

function getMetadata(node, property) {
  if (node.metadata && node.metadata.value)
    return node.metadata.value[property];
}

function hasColorLiteral(node) {
  return getMetadata(node, 'type') == 'color' ||
      (_.isString(node.value) && node.value.indexOf('#') == 0);
}

addStyle({
  '.mc-color-block': {
    'box-sizing': 'border-box',
    cursor: 'pointer',
    display: 'inline-block',
    height: '11px',
    'margin-left': '2px',
    position: 'relative',
    top: '1px',
    width: '11px',
  },
  '.mc-color-block:hover': {
    'border': '1px solid #999'
  },
  '.mc-color-picker': {
    padding: '1px'
  },
});

Moonchild.on('parse', function(ast) {
  _.invoke(bookmarks, 'clear');  // Clear widgets from the last parse.

  if (!options.colors) return;

  // Find CSS color values, and show a little color swatch beside them.
  // Clicking on the swatch reveals a color picker.
  ast.filter(hasColorLiteral).each(function(node) {
    var color = node.value;
    // TODO: Eliminate this hack.
    if (node.type == 'VariableDeclarator')
      color = node.init.value;

    var el = createElement('div', {
      'class': 'mc-color-block',
      'style': 'background-color: ' + color
    });
    var bookmark = codeMirror.setBookmark(esLocToCm(node.loc.end), { widget: el });
    bookmarks.push(bookmark);
  });

  var body = $('body');

  // Add a click handler to each color element that brings up the color picker.
  _.invoke($$('.mc-color-block'), 'addEventListener', 'click', function(e) {

    var pickerEl = createElement('div', {
      'class': 'arrow_box mc-color-picker',
      'display': 'inline-block'
    });
    pickerEl.appendChild(createElement('img', { 'src': 'images/palette.png' }));
    body.appendChild(pickerEl);

    // TODO: Remove hardcoded heights here.
    pickerEl.setAttribute('style', template(
        'position: absolute; height: 45px; left: {{ x }}px; top: {{ y }}px',
        {
          x: e.pageX + 6,
          y: e.pageY - 26
        }));

    // Hide the picker as soon as there is a click outside it.
    body.addEventListener('click', function onClick(e) {
      if (e.target != pickerEl)
        body.removeChild(pickerEl);
        body.removeEventListener('click', onClick);
    });
    e.stopPropagation();
  });
});