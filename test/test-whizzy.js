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
function simulateKeyEvent(el, keyCode, type) {
  var e = document.createEvent('KeyboardEvent');
  e.keyCodeVal = keyCode;

  function getKeyCode() {
    return this.keyCodeVal;
  }

  Object.defineProperty(e, 'keyCode', { get: getKeyCode });
  Object.defineProperty(e, 'which', { get: getKeyCode });
  e.initKeyboardEvent(type, true, true, document.defaultView, false, false, false, false, keyCode, keyCode);
  el.dispatchEvent(e);
}

// Simulates individual keypresses for each character in `str`.
function simulate(el, str) {
  for (var i = 0; i < str.length; ++i) {
    simulateKeyEvent(el, str.charCodeAt(i), 'keypress');
  }
}

var setSelection = whizzy.setSelection;

function setCursor(el, offset, callback) {
  setSelection(el, offset, offset);

  // Cursor changes affect the model asynchronously. If a callback is passed,
  // invoke it after a timeout.
  if (callback) {
    setTimeout(function() {
      QUnit.start();
      callback();
    }, 1);
  }
}

QUnit.test('basic insertion', function(t) {
  var m = new whizzy.TextModel;
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
  var m = new whizzy.TextModel;
  m.insert('hello');
  m.setCursor(5);
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
  m.delete();
  t.equal(m.getValue(), 'el');
});

QUnit.test('delection with selections', function(t) {
  var m = new whizzy.TextModel;
  m.insert('e');

  m.setSelection(0, 0);
  m.deleteBackwards();
  t.equal(m.getValue(), 'e');

  m.insert('whee');
  t.equal(m.getValue(), 'wheee');

  m.setSelection(5, 5);
  m.delete();
  t.equal(m.getValue(), 'wheee');

  m.setSelection(1, 4);
  m.deleteBackwards();
  t.equal(m.getValue(), 'we');
});

QUnit.test('insertion with selections', function(t) {
  var m = new whizzy.TextModel;
  m.insert('foo');

  m.setSelection(1, 3);
  m.insert('oob');
  t.equal(m.getValue(), 'foob');

  m.insert('ar')
  t.equal(m.getValue(), 'foobar');

  // Insertion with a selection should only trigger one change event.
  var count = 0;
  m.on('change', function() { ++count; });
  m.setSelection(0, 6);
  m.insert('blah');
  t.equal(count, 1);
});

QUnit.test('model changes', function(t) {
  var m = new whizzy.TextModel;

  var count = 0;
  function incCount() { ++count; };

  m.on('change', incCount);
  m.insert('hi');
  t.equal(count, 1);

  m.on('change', incCount);
  m.insert('ho');
  t.equal(count, 2);

  var count2 = 0;
  m.on('change', function() { ++count2; });
  m.insert('hi');
  t.equal(count, 3)
  t.equal(count2, 1);

  m.off('change', incCount);
  m.insert('hi');
  t.equal(count, 3);
  t.equal(count2, 2);
});

QUnit.module("DOM Tests", {
  setup: function() {
    var el = $('body').appendChild(createElement('div'));
    el.id = 'testEl';
  },
  teardown: function() {
//    $('#testEl').parentNode.removeChild($('#testEl'));
  }
});
QUnit.asyncTest('view affects model', function(t) {
  var el = $('#testEl');
  var m = new whizzy.TextModel;
  whizzy.connect(el, m);
  simulate(el, 'hiya');
  t.equal(m.getValue(), 'hiya');
  t.equal(m.getCursor(), 4);

  // Changing the cursor affects the model asynchronously, so use a timeout.
  setCursor(el, 0, function() {
    t.equal(m.getCursor(), 0);

    simulate(el, 'blah');
    t.equal(m.getValue(), 'blahhiya');

    simulateKeyEvent(el, 13, 'keydown');
    t.equal(m.getValue(), 'blah\nhiya');
  });
});

QUnit.test('model affects view', function(t) {
  var el = $('#testEl');
  var m = new whizzy.TextModel;
  whizzy.connect(el, m);

  m.on('change', function() {
    el.textContent = m.getValue();
    m.restoreSelection(el);
  });
  m.insert('yippee')
  t.equal(el.textContent, m.getValue());

  m.deleteBackwards();
  t.equal(el.textContent, m.getValue());
});
