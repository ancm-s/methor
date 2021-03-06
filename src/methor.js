// @flow

import 'babel-polyfill'

import { Server } from 'http'
import chalk from 'chalk'
import {
  isFunction,
  isObject,
  isArray,
  isNumber,
  isPromise,
  isString,
  getProperty,
  getAllMethod,
  capitalize,
  setPropertyOf,
  isNull,
  isUndef,
  flatten
} from './util'
import * as util from './util'
import methods from 'methods'

import Route from './internal/route'
import Layer from './internal/layer'

import Init from './internal/init'
import Listen from './internal/listen'
import Mount from './internal/mount'
import createMethod from './internal/create-method'
import addRoute from './internal/add-route'
import Handler from './internal/handler'
import LodashSet from 'lodash.set'

import Restserver from './restserver'

import { resolve } from 'path'
import events from 'events'

import type { HttpRequest, HttpResponse, MethorOptions } from './types'

function Methor(opts: MethorOptions): Methor {
  if (!(this instanceof Methor)) {
    return new Methor(opts)
  }

  if (!opts) {
    throw new TypeError('1 argument required, but only 0 present.')
  }
  if (!isObject(opts)) {
    throw new TypeError('argument options must be object')
  }

  const methods = opts.methods

  if (!methods) throw new TypeError('option methods is required')
  if (!(isFunction(methods) || isObject(methods)))
    throw new TypeError('option methods must be a function or object ')

  this.$options = opts
  this.methods = getAllMethod(methods)

  if (opts.funcs) {
    if (!isObject(opts.funcs))
      throw new TypeError('option funcs must be object')
    this.funcs = opts.funcs
  }

  // --- private property ---
  this.restserver = Restserver
  this.addRoute = addRoute
  this.$mount = Mount

  this._beforeEnter = []
  this._beforeHanldeResponse = []
  this._installed = []
  this.services = {}

  this.installPlugin()

  function MethorInstance(
    req: HttpRequest,
    res: HttpResponse,
    next: ?Function
  ) {
    MethorInstance.handler(req, res, next)
  }
  setPropertyOf(MethorInstance, this)

  const event = new events.EventEmitter()
  MethorInstance.$on = event.on
  MethorInstance.$off = event.removeListener
  MethorInstance.$emit = event.emit
  MethorInstance.$offall = event.removeAllListeners

  MethorInstance.stack = []
  MethorInstance.params = {}

  MethorInstance.init()

  return MethorInstance
}

Methor.prototype = function() {}

// Methor.prototype = Object.create(Server.prototype)
Methor.prototype.constructor = Server

Methor.prototype.handler = Handler
Methor.prototype.init = Init
Methor.prototype.listen = Listen
Methor.prototype.BetterHandler = require('./internal/better-handler').default

Methor.prototype.beforeEnter = function beforeEnter(
  ...callbacks: Array<Function>
): Methor {
  if (callbacks.length == 0) {
    throw new TypeError('argument handler is required')
  }
  for (let callback of callbacks) {
    if (!isFunction(callback))
      throw new TypeError('argument handler must be function')
  }
  this._beforeEnter = [...this._beforeEnter, ...callbacks]
  return this
}

Methor.prototype.beforeHandleResponse = function beforeHandleResponse(
  ...callbacks: Array<Function>
): Methor {
  if (callbacks.length == 0) {
    throw new TypeError('argument handler is required')
  }
  for (let callback of callbacks) {
    if (!isFunction(callback))
      throw new TypeError('argument handler must be function')
  }
  this._beforeHanldeResponse = [...this._beforeHanldeResponse, ...callbacks]
  return this
}

Methor.prototype.handlerResponse = function handlerResponse(
  req: HttpRequest,
  res: HttpResponse,
  result: any
): void {
  if (res.finished) {
    return
  }
  const $next = (callbacks: Array<Function>, i: number = 0): void => {
    if (isUndef(callbacks[i])) {
      return Main()
    }
    const callback = callbacks[i]
    callback(
      {
        get value(): result {
          return result
        },
        set value(val: any): void {
          result = val
        },
        update(val: any): void {
          result = val
        }
      },
      err => $next(callbacks, ++i),
      req,
      res
    )
  }

  const Main = async (): any => {
    if (res.finished) {
      return
    }

    if (result == undefined || result == null) {
      return res.end('')
    }

    if (isString(result) || isNumber(result)) {
      return res.end(String(result))
    }

    if (isObject(result) || isArray(result)) {
      return res.json(result)
    }
    return res.end(result.toString())
  }
  $next(this._beforeHanldeResponse)
}

Methor.prototype.warn = function warn(msg: any, plugin: string): void {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test'
  ) {
    console.warn(
      chalk.yellow('[') +
        ' Methor ' +
        chalk.yellow.bold('warning') +
        ' ' +
        (plugin ? 'from ' + chalk.red.bold(plugin) : '') +
        chalk.yellow(' ]') +
        ' ' +
        msg
    )
  }
}

Methor.prototype.$route = function $route(path: string): Object {
  const opts = this.$options
  const route = new Route(path)

  const layer = new Layer(
    path,
    {
      sensitive: opts.caseSensitive,
      strict: opts.strict,
      end: true
    },
    handle
  )

  function handle(req: HttpRequest, res: HttpResponse, next: Function) {
    route.dispatch(req, res, next)
  }

  layer.route = route
  this.stack.push(layer)
  return route
}

Methor.prototype.middleware = function use(handler: string | Function) {
  let offset = 0
  let path: string = '/'

  if (typeof handler === 'string') {
    offset = 1
    path = handler
  }

  const callbacks = flatten([].slice.call(arguments, offset))

  if (callbacks.length === 0) {
    throw new TypeError('argument handler is required')
  }

  for (let fn of callbacks) {
    if (!isFunction(fn)) {
      throw new TypeError('argument handler must be a function')
    }

    const layer = new Layer(
      path,
      {
        sensitive: this.$options.caseSensitive,
        strict: false,
        end: false
      },
      fn
    )

    layer.route = undefined

    this.stack.push(layer)
  }

  return this
}

methods.concat('all').forEach(function(method: string): void {
  Methor.prototype[method] = function(path: string, ...args: any) {
    var route = this.$route(path)
    route[method].apply(route, args)
    return this
  }
})

Methor.prototype.installPlugin = function(): void {
  const plugins = this.$options.plugins
  if (!plugins) return
  const _installed = this._installed
  for (const plugin of plugins) {
    if (_installed.includes(plugin)) continue

    _installed.push(plugin)

    // const args = [...arguments].slice(1)
    if (isFunction(plugin.install)) {
      plugin.install.apply(this, [])
    } else if (isFunction(plugin)) {
      plugin.apply(this, [])
    }
  }
}

Methor.prototype.use = function(plugin: any, opts: any): void {
  const plugins = this.$options.plugins
  if (!plugins) {
    this.$options.plugins = []
  }
  this.$options.plugins.push(
    isFunction(plugin) && plugin.name != 'install' ? plugin(opts) : plugin
  )
  this.installPlugin()
  return this
}

Methor.prototype.$option = function setOption(k: string, value: any): Methor {
  LodashSet(this.$options, k, value)
  return this
}

for (let key in util) {
  Methor.prototype[key] = Methor[key] = util[key]
}

;['validator'].map(name => {
  Object.defineProperty(Methor, capitalize(name), {
    get() {
      let pathname = resolve(__dirname, 'plugins', name)
      // $flow-disable-line
      return require(pathname).default
    }
  })
})

Methor.createMethod = createMethod

module.exports = Methor
