'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Listen;

var _finalhandler = require('finalhandler');

var _finalhandler2 = _interopRequireDefault(_finalhandler);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Listen(port, fn, server) {
  var _this = this;

  var opts = this.$options,
      isFunction = this.isFunction;

  if (!server) {
    server = _http2.default.createServer(function (req, res) {
      _this(req, res, (0, _finalhandler2.default)(req, res));
    });
  }

  this.__server = server;

  server.listen(port, function () {
    var port = server.address().port;
    _this.port = port;
    _this.$options.port = port;
    if (isFunction(opts.created)) {
      opts.created.call(_this, port, server);
      _this.$emit('server.created', port, server);
      // this.$emit('server-created', port, server)
      isFunction(fn) && fn(port);
    }
  });
}