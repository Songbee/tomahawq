"use strict";
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-2014 Uwe L. Korn
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var createHash = require('crypto').createHash;
var Q = require('q');

var tomahawkCode = fs.readFileSync(path.resolve(__dirname, 'tomahawk-desktop', 'tomahawk.js'), 'UTF-8');

class AxeInstance {
  constructor(axe, config) {
    var self = this;

    this._streamUrls = {};

    var ctx = this.ctx = vm.createContext({
      XMLHttpRequest: require("xmlhttprequest").XMLHttpRequest,
      localStorage: {},
      sessionStorage: {},
      Promise: Q.Promise,
      RSVP: Q,
      setInterval: setInterval,
      setTimeout: setTimeout
    });

    ctx.window = ctx;

    ctx.Tomahawk = {
      log: function(data) { console.log(data); },
      resolverData: function() {
        return { scriptPath: function () { return axe.manifest.main; } };
      },
      sha256: function(string) { return createHash("sha256").update(string).digest('base64'); },
      md5: function(string) { return createHash("md5").update(string).digest('base64'); }
    };

    // Load standard Tomahawk API
    vm.runInContext(tomahawkCode, ctx, "tomahawk.js");

    ctx.config = config;
    ctx.TomahawkResolver.getUserConfig = function () { return ctx.config; };
    ctx.Tomahawk.hasCustomUrlHandler = false; // Dunno

    this._streamUrlCallbacks = {};
    ctx.Tomahawk.reportStreamUrl = function(qid, url) {
      self._streamUrlCallbacks[qid](url);
    }

    ctx.setInterval = function (cb, ms) {
      var timer = setInterval(cb, ms);
      // Do not register this interval into the main event loop.
      timer.unref();
    };

    // Load the resolver
    vm.runInContext(axe.sourcecode, ctx, axe.manifest.main);

    this._instance = ctx.Tomahawk.resolver.instance;
  }

  _callMethod(method, args) {
    return Q(
      this
        ._instance[method]
        .apply(this._instance, args));
  }

  resolve() { return this._callMethod('resolve', arguments); }
  search()  { return this._callMethod('search', arguments); }
  lookupUrl()  { return this._callMethod('lookupUrl', arguments); }

  canParseUrl()  { return this._instance.canParseUrl.apply(this._instance, arguments); }

  getStreamUrl(url) {
    var deferred = Q.defer();
    var qid = Math.random().toString();
    this._streamUrls[qid] = function(streamUrl) {
      deferred.resolve(streamUrl);
    }
    this._instance.getStreamUrl(qid, url);
    return deferred.promise;
  }
}

module.exports = AxeInstance;
