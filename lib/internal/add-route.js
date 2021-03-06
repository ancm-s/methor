'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addRoute;

var _util = require('../util');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function addRoute(router, path) {
  var _this = this;

  var RouterisFunction = (0, _util.isFunction)(router);
  if (RouterisFunction && (0, _util.isString)(path)) {
    router.path = path;
  }
  if ((0, _util.isObject)(router) || RouterisFunction) {
    var callbacks = RouterisFunction ? [router] : (0, _util.isArray)(router.handler) ? router.handler : [router.handler];
    if (callbacks.length == 0) {
      throw new TypeError('argument handler is required');
    }
    var methods = (router.method || 'get').trim().split(',').map(function toLowerCase(method) {
      return method.toLowerCase(); // convert all method to lower case
    });

    // allow all methods
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = methods[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var method = _step.value;

        if (!this[method])
          // check method can use
          throw new Error('Not support method ' + method + ' !!!');
        this[method].apply(this, [router.path].concat(_toConsumableArray(callbacks.map(function (callback) {
          return function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            _this.BetterHandler.apply(_this, [callback].concat(args));
          };
        }))));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
  if ((0, _util.isArray)(router.children)) {
    // if router has children
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = router.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var child = _step2.value;

        // read all child and set router
        child.path = (0, _util.cleanPath)(`${router.path}/${child.path}`); // replace // => /
        this.addRoute(child, path, child.path);
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }
}