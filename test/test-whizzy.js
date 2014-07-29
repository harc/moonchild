function createElement(tagName, props) {
  var el = document.createElement(tagName);
  for (var k in props) {
    if (props.hasOwnProperty(k))
      el[k] = props[k];
  }
  return el;
}

function $(sel) {
  return document.querySelector(sel);
}

// Simulates a keypress for `char` inside the given element.
function simulateKeypress(el, char) {
  var e = document.createEvent('KeyboardEvent');
  var keyCode = e.keyCodeVal = char.charCodeAt(0);

  function getKeyCode() {
    return this.keyCodeVal;
  }

  Object.defineProperty(e, 'keyCode', { get: getKeyCode });
  Object.defineProperty(e, 'which', { get: getKeyCode });
  e.initKeyboardEvent('keypress', true, true, document.defaultView, false, false, false, false, keyCode, keyCode);
  el.dispatchEvent(e);
}

// Simulates individual keypresses for each character in `str`.
function simulate(el, str) {
  for (var i = 0; i < str.length; ++i) {
    simulateKeypress(el, str[i]);
  }
}

function setCursor(el, offset) {
  var range = document.createRange();
  range.setStart(el, offset);
  range.setEnd(el, offset);

  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

QUnit.test('basic insertion', function(t) {
  var m = new whizzy.Model;
  t.equal(0, m.getCursor());

  m.insert('foo');
  t.equal(3, m.getCursor());
  t.equal('foo', m.getValue());

  m.setCursor(1);
  m.insert('l');
  t.equal('floo', m.getValue());
  t.equal(2, m.getCursor());

  m.setCursor(4);
  m.insert('d');
  t.equal('flood', m.getValue());
  t.equal(5, m.getCursor());
});

QUnit.test('deletion', function(t) {
  var m = new whizzy.Model;
  m.insert('hello');
  t.equal(m.getCursor(), 5);
  m.delete();
  t.equal(m.getValue(), 'hello');

  m.deleteBackwards();
  t.equal(m.getValue(), 'hell');

  m.setCursor(0);
  m.deleteBackwards();
  t.equal(m.getValue(), 'hell');

  m.delete();
  t.equal(m.getValue(), 'ell');

  m.setCursor(1);
  m.delete(2);
  t.equal(m.getValue(), 'e');
});

QUnit.asyncTest('view affects model', function(t) {
  var div = $('body').appendChild(createElement('div'));
  var m = new whizzy.Model;
  whizzy.connect(div, m);
  simulate(div, 'hiya');
  t.equal(m.getValue(), 'hiya');
  t.equal(m.getCursor(), 4);

  // Changing the cursor affects the model asynchronously, so use a timeout.
  setCursor(div, 0);
  setTimeout(function() {
    QUnit.start();
    t.equal(m.getCursor(), 0);

    simulate(div, 'blah');
    t.equal(m.getValue(), 'blahhiya');
  }, 1);
});
