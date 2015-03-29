!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.expanders=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/* global -Symbol, -WeakMap */
/* jshint -W053 */

'use strict';

var Symbol = _dereq_('es6-symbol'),
    WeakMap = _dereq_('es6-weak-map');

var slice = Array.prototype.slice;
var hasOwnProp = Object.prototype.hasOwnProperty;

var NOT_SET = {};  // Sentinel value representing unset expander properties.

// Any object can be the target of a `use` statement if it implements the
// expander protocol. An object `obj` implements the protocol if
// `obj[protocolSymbol]` is a function which, when invoked with no arguments,
// returns an expander.
var protocolSymbol = Symbol('expander');  // jshint ignore:line

// Helpers
// -------

// Makes a copy of `obj`, omitting properties given by `keys` (an Array).
function omit(obj, keys) {
  var copy = Object.create(null);
  for (var key in obj) {
    if (keys.indexOf(key) == -1)
      copy[key] = obj[key];
  }
  return copy;
}

// Like Object.getPrototypeOf, but returns undefined for primitive values,
// instead of throwing an exception.
function getPrototypeOf(obj) {
  if (obj !== null && typeof obj === 'object')
    return Object.getPrototypeOf(obj);
  return null;
}

function objectFor(objOrPrimitive) {
  switch (typeof objOrPrimitive) {
    case 'number':  return new Number(objOrPrimitive);
    case 'boolean': return new Boolean(objOrPrimitive);
    case 'string':  return new String(objOrPrimitive);
  }
  return objOrPrimitive;
}

// Expander
// --------

function Expander(props) {
  this._props = Object.seal(props);
}

Expander.withKeys = function() {
  var props = Object.create(null);
  for (var i = 0; i < arguments.length; ++i) {
    props[arguments[i]] = new WeakMap();
  }
  return new Expander(props);
};

// Implement the expander protocol (see `protocolSymbol` above).
Expander.prototype[protocolSymbol] = function() {
  return this;
};

// Returns an Array of property names defined by this Expander.
// If `optionalObj` is specified, returns only the names of properties which
// exist in the given object. If `includeProto` is true, returns the names of
// properties which exist in the object or any of its prototypes.
Expander.prototype.keys = function(optionalObj, includeProto) {
  var keys = Object.keys(this._props);
  if (optionalObj) {
    var self = this;
    var predicate = includeProto ?
        function(k) { return self.has(optionalObj, k); } :
        function(k) { return self.hasOwn(optionalObj, k); };
    return keys.filter(predicate);
  }
  return keys;
};

Expander.prototype.checkKeys = function(/* arguments */) {
  for (var i = 0; i < arguments.length; ++i) {
    var name = arguments[i];
    if (!(name in this._props))
      throw new ReferenceError(name + ' is not defined in expander');
  }
};

// Sets an expander property of an object to the given value.
// Throws an exception if `name` is not defined in this Expander.
Expander.prototype.set = function(obj, name, value) {
  if (typeof name == 'string') {
    obj = objectFor(obj);
    this.checkKeys(name);
    this._props[name].set(obj, value);
    return value;
  }
  // Support the shorthand for setting multiple properties.
  for (var k in name) {
    if (hasOwnProp.call(name, k))
      this.set(obj, k, name[k]);
  }
};

Expander.prototype._renameAll = function(obj) {
  var keys = Object.keys(obj);
  this.checkKeys.apply(this, keys);

  var props = omit(this._props, keys);
  for (var i = 0; i < keys.length; ++i) {
    var k = keys[i], newName = obj[k];
    if (newName in props)
      throw new Error("Can't rename '" + k + "' to existing key '" + newName + "'");
    props[newName] = this._props[k];
  }
  return new Expander(props);
};

// Returns a new Expander that is a copy of this one, except the `name`
// property is renamed to `newName`. To rename multiple properties, it can be
// called with a single argument: an Object<String, String> which maps from
// old names to new names.
Expander.prototype.rename = function(name, newName) {
  if (!newName && name instanceof Object) {
    return this._renameAll(name);
  }
  var o = {};
  o[name] = newName;
  return this._renameAll(o);
};

// Returns a new Expander that is a copy of this one, except without the
// properties specified in the arguments list.
Expander.prototype.hide = function() {
  var keys = slice.call(arguments);
  this.checkKeys.apply(this, keys);
  return new Expander(omit(this._props, keys));
};

// Returns a new Expander that is a copy of this one, with only the properies
// specified in the arguments list.
Expander.prototype.only = function() {
  var keys = slice.call(arguments);
  this.checkKeys.apply(this, keys);
  var hiddenKeys = this.keys().filter(function(k) {
    return keys.indexOf(k) < 0;
  });
  return this.hide.apply(this, hiddenKeys);
};

// Gets an object property, using the properties defined by this
// Expander (if applicable). Otherwise, acts like regular property access.
Expander.prototype.get = function(obj, propName) {
  return this._getImpl(obj, propName, true);
};

Expander.prototype._getImpl = function(obj, propName, includeProto, defaultVal) {
  var map;
  if (obj !== null && (map = this._props[propName])) {
    obj = objectFor(obj);
    do {
      if (map.has(obj))
        return map.get(obj);
      obj = getPrototypeOf(obj);
    } while (obj && includeProto);
  }
  return defaultVal;
};

// Returns true if this Expander has an applicable property for the given
// object and property name, searching the object and the prototype chain.
Expander.prototype.has = function(obj, propName) {
  // Strings don't support 'in' in JavaScript, and string instances can't be
  // expanded, so the only way to expand strings is via the prototype.
  if (typeof obj == 'string')
    return this.has(String.prototype, propName);
  return this._getImpl(obj, propName, true, NOT_SET) !== NOT_SET;
};

// Returns true if this Expander has an applicable property for the given
// object and property name, searcing only the object and NOT its prototype.
Expander.prototype.hasOwn = function(obj, propName) {
  return this._getImpl(obj, propName, false, NOT_SET) !== NOT_SET;
};

// Gets an object property using `get`, and calls it as a function, passing
// on all the arguments after `propName`.
Expander.prototype.send = function(obj, propName) {
  obj = objectFor(obj);
  var fn = this.get(obj, propName);
  if (!fn)
    throw new TypeError("No expander method '" + propName + "' in " + obj);
  return fn.apply(obj, slice.call(arguments, 2));
};

// Creates a new Expander which is the union of all the arguments (which are
// Expanders). Throws an Error if any duplicate keys exist.
function compose() {
  var props = Object.create(null);
  for (var i = 0; i < arguments.length; ++i) {
    var exp = arguments[i];
    for (var key in exp._props) {
      if (key in props)
        throw new Error("Can't compose expanders with duplicate key " + key);
      props[key] = exp._props[key];
    }
  }
  return new Expander(props);
}

// Exports
// -------

module.exports = {
  createExpander: Expander.withKeys,
  compose: compose,
  protocolSymbol: protocolSymbol
};

},{"es6-symbol":2,"es6-weak-map":18}],2:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')() ? Symbol : _dereq_('./polyfill');

},{"./is-implemented":3,"./polyfill":17}],3:[function(_dereq_,module,exports){
'use strict';

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }
	if (typeof Symbol.iterator === 'symbol') return true;

	// Return 'true' for polyfills
	if (typeof Symbol.isConcatSpreadable !== 'object') return false;
	if (typeof Symbol.isRegExp !== 'object') return false;
	if (typeof Symbol.iterator !== 'object') return false;
	if (typeof Symbol.toPrimitive !== 'object') return false;
	if (typeof Symbol.toStringTag !== 'object') return false;
	if (typeof Symbol.unscopables !== 'object') return false;

	return true;
};

},{}],4:[function(_dereq_,module,exports){
'use strict';

var assign        = _dereq_('es5-ext/object/assign')
  , normalizeOpts = _dereq_('es5-ext/object/normalize-options')
  , isCallable    = _dereq_('es5-ext/object/is-callable')
  , contains      = _dereq_('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":5,"es5-ext/object/is-callable":8,"es5-ext/object/normalize-options":12,"es5-ext/string/#/contains":14}],5:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')()
	? Object.assign
	: _dereq_('./shim');

},{"./is-implemented":6,"./shim":7}],6:[function(_dereq_,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],7:[function(_dereq_,module,exports){
'use strict';

var keys  = _dereq_('../keys')
  , value = _dereq_('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":9,"../valid-value":13}],8:[function(_dereq_,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],9:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')()
	? Object.keys
	: _dereq_('./shim');

},{"./is-implemented":10,"./shim":11}],10:[function(_dereq_,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],11:[function(_dereq_,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],12:[function(_dereq_,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],13:[function(_dereq_,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],14:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')()
	? String.prototype.contains
	: _dereq_('./shim');

},{"./is-implemented":15,"./shim":16}],15:[function(_dereq_,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],16:[function(_dereq_,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],17:[function(_dereq_,module,exports){
'use strict';

var d = _dereq_('d')

  , create = Object.create, defineProperties = Object.defineProperties
  , generateName, Symbol;

generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		return '@@' + desc;
	};
}());

module.exports = Symbol = function (description) {
	var symbol;
	if (this instanceof Symbol) {
		throw new TypeError('TypeError: Symbol is not a constructor');
	}
	symbol = create(Symbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};

Object.defineProperties(Symbol, {
	create: d('', Symbol('create')),
	hasInstance: d('', Symbol('hasInstance')),
	isConcatSpreadable: d('', Symbol('isConcatSpreadable')),
	isRegExp: d('', Symbol('isRegExp')),
	iterator: d('', Symbol('iterator')),
	toPrimitive: d('', Symbol('toPrimitive')),
	toStringTag: d('', Symbol('toStringTag')),
	unscopables: d('', Symbol('unscopables'))
});

defineProperties(Symbol.prototype, {
	properToString: d(function () {
		return 'Symbol (' + this.__description__ + ')';
	}),
	toString: d('', function () { return this.__name__; })
});
Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, d('',
	function (hint) {
		throw new TypeError("Conversion of symbol objects is not allowed");
	}));
Object.defineProperty(Symbol.prototype, Symbol.toStringTag, d('c', 'Symbol'));

},{"d":4}],18:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')() ?
		WeakMap : _dereq_('./polyfill');

},{"./is-implemented":19,"./polyfill":58}],19:[function(_dereq_,module,exports){
'use strict';

module.exports = function () {
	var map;
	if (typeof WeakMap !== 'function') return false;
	map = new WeakMap();
	if (typeof map.set !== 'function') return false;
	if (map.set({}, 1) !== map) return false;
	if (typeof map.clear !== 'function') return false;
	if (typeof map.delete !== 'function') return false;
	if (typeof map.has !== 'function') return false;

	return true;
};

},{}],20:[function(_dereq_,module,exports){
// Exports true if environment provides native `WeakMap` implementation,
// whatever that is.

'use strict';

module.exports = (function () {
	if (typeof WeakMap === 'undefined') return false;
	return (Object.prototype.toString.call(WeakMap.prototype) ===
			'[object WeakMap]');
}());

},{}],21:[function(_dereq_,module,exports){
'use strict';

var copy       = _dereq_('es5-ext/object/copy')
  , map        = _dereq_('es5-ext/object/map')
  , callable   = _dereq_('es5-ext/object/valid-callable')
  , validValue = _dereq_('es5-ext/object/valid-value')

  , bind = Function.prototype.bind, defineProperty = Object.defineProperty
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , define;

define = function (name, desc, bindTo) {
	var value = validValue(desc) && callable(desc.value), dgs;
	dgs = copy(desc);
	delete dgs.writable;
	delete dgs.value;
	dgs.get = function () {
		if (hasOwnProperty.call(this, name)) return value;
		desc.value = bind.call(value, (bindTo == null) ? this : this[bindTo]);
		defineProperty(this, name, desc);
		return this[name];
	};
	return dgs;
};

module.exports = function (props/*, bindTo*/) {
	var bindTo = arguments[1];
	return map(props, function (desc, name) {
		return define(name, desc, bindTo);
	});
};

},{"es5-ext/object/copy":28,"es5-ext/object/map":36,"es5-ext/object/valid-callable":41,"es5-ext/object/valid-value":43}],22:[function(_dereq_,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/d/index.js":4,"es5-ext/object/assign":25,"es5-ext/object/is-callable":31,"es5-ext/object/normalize-options":37,"es5-ext/string/#/contains":44}],23:[function(_dereq_,module,exports){
// Inspired by Google Closure:
// http://closure-library.googlecode.com/svn/docs/
// closure_goog_array_array.js.html#goog.array.clear

'use strict';

var value = _dereq_('../../object/valid-value');

module.exports = function () {
	value(this).length = 0;
	return this;
};

},{"../../object/valid-value":43}],24:[function(_dereq_,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

'use strict';

var isCallable = _dereq_('./is-callable')
  , callable   = _dereq_('./valid-callable')
  , value      = _dereq_('./valid-value')

  , call = Function.prototype.call, keys = Object.keys
  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (method, defVal) {
	return function (obj, cb/*, thisArg, compareFn*/) {
		var list, thisArg = arguments[2], compareFn = arguments[3];
		obj = Object(value(obj));
		callable(cb);

		list = keys(obj);
		if (compareFn) {
			list.sort(isCallable(compareFn) ? compareFn.bind(obj) : undefined);
		}
		return list[method](function (key, index) {
			if (!propertyIsEnumerable.call(obj, key)) return defVal;
			return call.call(cb, thisArg, obj[key], key, obj, index);
		});
	};
};

},{"./is-callable":31,"./valid-callable":41,"./valid-value":43}],25:[function(_dereq_,module,exports){
module.exports=_dereq_(5)
},{"./is-implemented":26,"./shim":27,"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/assign/index.js":5}],26:[function(_dereq_,module,exports){
module.exports=_dereq_(6)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/assign/is-implemented.js":6}],27:[function(_dereq_,module,exports){
module.exports=_dereq_(7)
},{"../keys":33,"../valid-value":43,"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/assign/shim.js":7}],28:[function(_dereq_,module,exports){
'use strict';

var assign = _dereq_('./assign')
  , value  = _dereq_('./valid-value');

module.exports = function (obj) {
	var copy = Object(value(obj));
	if (copy !== obj) return copy;
	return assign({}, obj);
};

},{"./assign":25,"./valid-value":43}],29:[function(_dereq_,module,exports){
// Workaround for http://code.google.com/p/v8/issues/detail?id=2804

'use strict';

var create = Object.create, shim;

if (!_dereq_('./set-prototype-of/is-implemented')()) {
	shim = _dereq_('./set-prototype-of/shim');
}

module.exports = (function () {
	var nullObject, props, desc;
	if (!shim) return create;
	if (shim.level !== 1) return create;

	nullObject = {};
	props = {};
	desc = { configurable: false, enumerable: false, writable: true,
		value: undefined };
	Object.getOwnPropertyNames(Object.prototype).forEach(function (name) {
		if (name === '__proto__') {
			props[name] = { configurable: true, enumerable: false, writable: true,
				value: undefined };
			return;
		}
		props[name] = desc;
	});
	Object.defineProperties(nullObject, props);

	Object.defineProperty(shim, 'nullPolyfill', { configurable: false,
		enumerable: false, writable: false, value: nullObject });

	return function (prototype, props) {
		return create((prototype === null) ? nullObject : prototype, props);
	};
}());

},{"./set-prototype-of/is-implemented":39,"./set-prototype-of/shim":40}],30:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./_iterate')('forEach');

},{"./_iterate":24}],31:[function(_dereq_,module,exports){
module.exports=_dereq_(8)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/is-callable.js":8}],32:[function(_dereq_,module,exports){
'use strict';

var map = { 'function': true, 'object': true };

module.exports = function (x) {
	return ((x != null) && map[typeof x]) || false;
};

},{}],33:[function(_dereq_,module,exports){
module.exports=_dereq_(9)
},{"./is-implemented":34,"./shim":35,"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/keys/index.js":9}],34:[function(_dereq_,module,exports){
module.exports=_dereq_(10)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/keys/is-implemented.js":10}],35:[function(_dereq_,module,exports){
module.exports=_dereq_(11)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/keys/shim.js":11}],36:[function(_dereq_,module,exports){
'use strict';

var callable = _dereq_('./valid-callable')
  , forEach  = _dereq_('./for-each')

  , call = Function.prototype.call;

module.exports = function (obj, cb/*, thisArg*/) {
	var o = {}, thisArg = arguments[2];
	callable(cb);
	forEach(obj, function (value, key, obj, index) {
		o[key] = call.call(cb, thisArg, value, key, obj, index);
	});
	return o;
};

},{"./for-each":30,"./valid-callable":41}],37:[function(_dereq_,module,exports){
'use strict';

var assign = _dereq_('./assign')

  , forEach = Array.prototype.forEach
  , create = Object.create, getPrototypeOf = Object.getPrototypeOf

  , process;

process = function (src, obj) {
	var proto = getPrototypeOf(src);
	return assign(proto ? process(proto, obj) : obj, src);
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{"./assign":25}],38:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./is-implemented')()
	? Object.setPrototypeOf
	: _dereq_('./shim');

},{"./is-implemented":39,"./shim":40}],39:[function(_dereq_,module,exports){
'use strict';

var create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , x = {};

module.exports = function (/*customCreate*/) {
	var setPrototypeOf = Object.setPrototypeOf
	  , customCreate = arguments[0] || create;
	if (typeof setPrototypeOf !== 'function') return false;
	return getPrototypeOf(setPrototypeOf(customCreate(null), x)) === x;
};

},{}],40:[function(_dereq_,module,exports){
// Big thanks to @WebReflection for sorting this out
// https://gist.github.com/WebReflection/5593554

'use strict';

var isObject      = _dereq_('../is-object')
  , value         = _dereq_('../valid-value')

  , isPrototypeOf = Object.prototype.isPrototypeOf
  , defineProperty = Object.defineProperty
  , nullDesc = { configurable: true, enumerable: false, writable: true,
		value: undefined }
  , validate;

validate = function (obj, prototype) {
	value(obj);
	if ((prototype === null) || isObject(prototype)) return obj;
	throw new TypeError('Prototype must be null or an object');
};

module.exports = (function (status) {
	var fn, set;
	if (!status) return null;
	if (status.level === 2) {
		if (status.set) {
			set = status.set;
			fn = function (obj, prototype) {
				set.call(validate(obj, prototype), prototype);
				return obj;
			};
		} else {
			fn = function (obj, prototype) {
				validate(obj, prototype).__proto__ = prototype;
				return obj;
			};
		}
	} else {
		fn = function self(obj, prototype) {
			var isNullBase;
			validate(obj, prototype);
			isNullBase = isPrototypeOf.call(self.nullPolyfill, obj);
			if (isNullBase) delete self.nullPolyfill.__proto__;
			if (prototype === null) prototype = self.nullPolyfill;
			obj.__proto__ = prototype;
			if (isNullBase) defineProperty(self.nullPolyfill, '__proto__', nullDesc);
			return obj;
		};
	}
	return Object.defineProperty(fn, 'level', { configurable: false,
		enumerable: false, writable: false, value: status.level });
}((function () {
	var x = Object.create(null), y = {}, set
	  , desc = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');

	if (desc) {
		try {
			set = desc.set; // Opera crashes at this point
			set.call(x, y);
		} catch (ignore) { }
		if (Object.getPrototypeOf(x) === y) return { set: set, level: 2 };
	}

	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 2 };

	x = {};
	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 1 };

	return false;
}())));

_dereq_('../create');

},{"../create":29,"../is-object":32,"../valid-value":43}],41:[function(_dereq_,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],42:[function(_dereq_,module,exports){
'use strict';

var isObject = _dereq_('./is-object');

module.exports = function (value) {
	if (!isObject(value)) throw new TypeError(value + " is not an Object");
	return value;
};

},{"./is-object":32}],43:[function(_dereq_,module,exports){
module.exports=_dereq_(13)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/object/valid-value.js":13}],44:[function(_dereq_,module,exports){
module.exports=_dereq_(14)
},{"./is-implemented":45,"./shim":46,"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/string/#/contains/index.js":14}],45:[function(_dereq_,module,exports){
module.exports=_dereq_(15)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/string/#/contains/is-implemented.js":15}],46:[function(_dereq_,module,exports){
module.exports=_dereq_(16)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/node_modules/es5-ext/string/#/contains/shim.js":16}],47:[function(_dereq_,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call('');

module.exports = function (x) {
	return (typeof x === 'string') || (x && (typeof x === 'object') &&
		((x instanceof String) || (toString.call(x) === id))) || false;
};

},{}],48:[function(_dereq_,module,exports){
'use strict';

var setPrototypeOf = _dereq_('es5-ext/object/set-prototype-of')
  , contains       = _dereq_('es5-ext/string/#/contains')
  , d              = _dereq_('d')
  , Iterator       = _dereq_('./')

  , defineProperty = Object.defineProperty
  , ArrayIterator;

ArrayIterator = module.exports = function (arr, kind) {
	if (!(this instanceof ArrayIterator)) return new ArrayIterator(arr, kind);
	Iterator.call(this, arr);
	if (!kind) kind = 'value';
	else if (contains.call(kind, 'key+value')) kind = 'key+value';
	else if (contains.call(kind, 'key')) kind = 'key';
	else kind = 'value';
	defineProperty(this, '__kind__', d('', kind));
};
if (setPrototypeOf) setPrototypeOf(ArrayIterator, Iterator);

ArrayIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(ArrayIterator),
	_resolve: d(function (i) {
		if (this.__kind__ === 'value') return this.__list__[i];
		if (this.__kind__ === 'key+value') return [i, this.__list__[i]];
		return i;
	}),
	toString: d(function () { return '[object Array Iterator]'; })
});

},{"./":51,"d":22,"es5-ext/object/set-prototype-of":38,"es5-ext/string/#/contains":44}],49:[function(_dereq_,module,exports){
'use strict';

var callable = _dereq_('es5-ext/object/valid-callable')
  , isString = _dereq_('es5-ext/string/is-string')
  , get      = _dereq_('./get')

  , isArray = Array.isArray, call = Function.prototype.call;

module.exports = function (iterable, cb/*, thisArg*/) {
	var mode, thisArg = arguments[2], result, doBreak, broken, i, l, char, code;
	if (isArray(iterable)) mode = 'array';
	else if (isString(iterable)) mode = 'string';
	else iterable = get(iterable);

	callable(cb);
	doBreak = function () { broken = true; };
	if (mode === 'array') {
		iterable.some(function (value) {
			call.call(cb, thisArg, value, doBreak);
			if (broken) return true;
		});
		return;
	}
	if (mode === 'string') {
		l = iterable.length;
		for (i = 0; i < l; ++i) {
			char = iterable[i];
			if ((i + 1) < l) {
				code = char.charCodeAt(0);
				if ((code >= 0xD800) && (code <= 0xDBFF)) char += iterable[++i];
			}
			call.call(cb, thisArg, char, doBreak);
			if (broken) break;
		}
		return;
	}
	result = iterable.next();

	while (!result.done) {
		call.call(cb, thisArg, result.value, doBreak);
		if (broken) return;
		result = iterable.next();
	}
};

},{"./get":50,"es5-ext/object/valid-callable":41,"es5-ext/string/is-string":47}],50:[function(_dereq_,module,exports){
'use strict';

var isString = _dereq_('es5-ext/string/is-string')
  , ArrayIterator  = _dereq_('./array')
  , StringIterator = _dereq_('./string')
  , iterable       = _dereq_('./valid-iterable')
  , iteratorSymbol = _dereq_('es6-symbol').iterator;

module.exports = function (obj) {
	if (typeof iterable(obj)[iteratorSymbol] === 'function') return obj[iteratorSymbol]();
	if (isString(obj)) return new StringIterator(obj);
	return new ArrayIterator(obj);
};

},{"./array":48,"./string":56,"./valid-iterable":57,"es5-ext/string/is-string":47,"es6-symbol":53}],51:[function(_dereq_,module,exports){
'use strict';

var clear    = _dereq_('es5-ext/array/#/clear')
  , assign   = _dereq_('es5-ext/object/assign')
  , callable = _dereq_('es5-ext/object/valid-callable')
  , value    = _dereq_('es5-ext/object/valid-value')
  , d        = _dereq_('d')
  , autoBind = _dereq_('d/auto-bind')
  , Symbol   = _dereq_('es6-symbol')

  , defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , Iterator;

module.exports = Iterator = function (list, context) {
	if (!(this instanceof Iterator)) return new Iterator(list, context);
	defineProperties(this, {
		__list__: d('w', value(list)),
		__context__: d('w', context),
		__nextIndex__: d('w', 0)
	});
	if (!context) return;
	callable(context.on);
	context.on('_add', this._onAdd);
	context.on('_delete', this._onDelete);
	context.on('_clear', this._onClear);
};

defineProperties(Iterator.prototype, assign({
	constructor: d(Iterator),
	_next: d(function () {
		var i;
		if (!this.__list__) return;
		if (this.__redo__) {
			i = this.__redo__.shift();
			if (i !== undefined) return i;
		}
		if (this.__nextIndex__ < this.__list__.length) return this.__nextIndex__++;
		this._unBind();
	}),
	next: d(function () { return this._createResult(this._next()); }),
	_createResult: d(function (i) {
		if (i === undefined) return { done: true, value: undefined };
		return { done: false, value: this._resolve(i) };
	}),
	_resolve: d(function (i) { return this.__list__[i]; }),
	_unBind: d(function () {
		this.__list__ = null;
		delete this.__redo__;
		if (!this.__context__) return;
		this.__context__.off('_add', this._onAdd);
		this.__context__.off('_delete', this._onDelete);
		this.__context__.off('_clear', this._onClear);
		this.__context__ = null;
	}),
	toString: d(function () { return '[object Iterator]'; })
}, autoBind({
	_onAdd: d(function (index) {
		if (index >= this.__nextIndex__) return;
		++this.__nextIndex__;
		if (!this.__redo__) {
			defineProperty(this, '__redo__', d('c', [index]));
			return;
		}
		this.__redo__.forEach(function (redo, i) {
			if (redo >= index) this.__redo__[i] = ++redo;
		}, this);
		this.__redo__.push(index);
	}),
	_onDelete: d(function (index) {
		var i;
		if (index >= this.__nextIndex__) return;
		--this.__nextIndex__;
		if (!this.__redo__) return;
		i = this.__redo__.indexOf(index);
		if (i !== -1) this.__redo__.splice(i, 1);
		this.__redo__.forEach(function (redo, i) {
			if (redo > index) this.__redo__[i] = --redo;
		}, this);
	}),
	_onClear: d(function () {
		if (this.__redo__) clear.call(this.__redo__);
		this.__nextIndex__ = 0;
	})
})));

defineProperty(Iterator.prototype, Symbol.iterator, d(function () {
	return this;
}));
defineProperty(Iterator.prototype, Symbol.toStringTag, d('', 'Iterator'));

},{"d":22,"d/auto-bind":21,"es5-ext/array/#/clear":23,"es5-ext/object/assign":25,"es5-ext/object/valid-callable":41,"es5-ext/object/valid-value":43,"es6-symbol":53}],52:[function(_dereq_,module,exports){
'use strict';

var isString       = _dereq_('es5-ext/string/is-string')
  , iteratorSymbol = _dereq_('es6-symbol').iterator

  , isArray = Array.isArray;

module.exports = function (value) {
	if (value == null) return false;
	if (isArray(value)) return true;
	if (isString(value)) return true;
	return (typeof value[iteratorSymbol] === 'function');
};

},{"es5-ext/string/is-string":47,"es6-symbol":53}],53:[function(_dereq_,module,exports){
module.exports=_dereq_(2)
},{"./is-implemented":54,"./polyfill":55,"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/index.js":2}],54:[function(_dereq_,module,exports){
module.exports=_dereq_(3)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/is-implemented.js":3}],55:[function(_dereq_,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"/Users/dubroy/dev/cdg/expanders-js/node_modules/es6-symbol/polyfill.js":17,"d":22}],56:[function(_dereq_,module,exports){
// Thanks @mathiasbynens
// http://mathiasbynens.be/notes/javascript-unicode#iterating-over-symbols

'use strict';

var setPrototypeOf = _dereq_('es5-ext/object/set-prototype-of')
  , d              = _dereq_('d')
  , Iterator       = _dereq_('./')

  , defineProperty = Object.defineProperty
  , StringIterator;

StringIterator = module.exports = function (str) {
	if (!(this instanceof StringIterator)) return new StringIterator(str);
	str = String(str);
	Iterator.call(this, str);
	defineProperty(this, '__length__', d('', str.length));

};
if (setPrototypeOf) setPrototypeOf(StringIterator, Iterator);

StringIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(StringIterator),
	_next: d(function () {
		if (!this.__list__) return;
		if (this.__nextIndex__ < this.__length__) return this.__nextIndex__++;
		this._unBind();
	}),
	_resolve: d(function (i) {
		var char = this.__list__[i], code;
		if (this.__nextIndex__ === this.__length__) return char;
		code = char.charCodeAt(0);
		if ((code >= 0xD800) && (code <= 0xDBFF)) return char + this.__list__[this.__nextIndex__++];
		return char;
	}),
	toString: d(function () { return '[object String Iterator]'; })
});

},{"./":51,"d":22,"es5-ext/object/set-prototype-of":38}],57:[function(_dereq_,module,exports){
'use strict';

var isIterable = _dereq_('./is-iterable');

module.exports = function (value) {
	if (!isIterable(value)) throw new TypeError(value + " is not iterable");
	return value;
};

},{"./is-iterable":52}],58:[function(_dereq_,module,exports){
'use strict';

var setPrototypeOf    = _dereq_('es5-ext/object/set-prototype-of')
  , object            = _dereq_('es5-ext/object/valid-object')
  , value             = _dereq_('es5-ext/object/valid-value')
  , d                 = _dereq_('d')
  , getIterator       = _dereq_('es6-iterator/get')
  , forOf             = _dereq_('es6-iterator/for-of')
  , toStringTagSymbol = _dereq_('es6-symbol').toStringTag
  , isNative          = _dereq_('./is-native-implemented')

  , isArray = Array.isArray, defineProperty = Object.defineProperty, random = Math.random
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , genId, WeakMapPoly;

genId = (function () {
	var generated = Object.create(null);
	return function () {
		var id;
		do { id = random().toString(36).slice(2); } while (generated[id]);
		generated[id] = true;
		return id;
	};
}());

module.exports = WeakMapPoly = function (/*iterable*/) {
	var iterable = arguments[0];
	if (!(this instanceof WeakMapPoly)) return new WeakMapPoly(iterable);
	if (this.__weakMapData__ !== undefined) {
		throw new TypeError(this + " cannot be reinitialized");
	}
	if (iterable != null) {
		if (!isArray(iterable)) iterable = getIterator(iterable);
	}
	defineProperty(this, '__weakMapData__', d('c', '$weakMap$' + genId()));
	if (!iterable) return;
	forOf(iterable, function (val) {
		value(val);
		this.set(val[0], val[1]);
	}, this);
};

if (isNative) {
	if (setPrototypeOf) setPrototypeOf(WeakMapPoly, WeakMap);
	WeakMapPoly.prototype = Object.create(WeakMap.prototype, {
		constructor: d(WeakMapPoly)
	});
}

Object.defineProperties(WeakMapPoly.prototype, {
	clear: d(function () {
		defineProperty(this, '__weakMapData__', d('c', '$weakMap$' + genId()));
	}),
	delete: d(function (key) {
		if (hasOwnProperty.call(object(key), this.__weakMapData__)) {
			delete key[this.__weakMapData__];
			return true;
		}
		return false;
	}),
	get: d(function (key) {
		if (hasOwnProperty.call(object(key), this.__weakMapData__)) {
			return key[this.__weakMapData__];
		}
	}),
	has: d(function (key) {
		return hasOwnProperty.call(object(key), this.__weakMapData__);
	}),
	set: d(function (key, value) {
		defineProperty(object(key), this.__weakMapData__, d('c', value));
		return this;
	}),
	toString: d(function () { return '[object WeakMap]'; })
});
defineProperty(WeakMapPoly.prototype, toStringTagSymbol, d('c', 'WeakMap'));

},{"./is-native-implemented":20,"d":22,"es5-ext/object/set-prototype-of":38,"es5-ext/object/valid-object":42,"es5-ext/object/valid-value":43,"es6-iterator/for-of":49,"es6-iterator/get":50,"es6-symbol":2}]},{},[1])(1)
});