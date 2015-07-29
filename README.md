tomahawq
=========

Implementation of the JS plugins API from Tomahawk as a library for NodeJS and io.js.


Usage
------

```javascript
var Tomahawk = require('tomahawq');

Tomahawk.loadAxe(pathtoaxe).then(function(axe) {
  var instance = axe.getInstance();
  return instance.search({query: "Protohype"});
}).then(function(results) {
  console.log(results);
});
```

`instance` here is a special `AxeInstance` object that proxies some methods to the actual plugin instance. `instance.resolve`, `.search`, `.lookupUrl` and `.getStreamUrl` return [Q promises][npm-q], while `.canParseUrl` is just a proxy.

Further usage docs coming soon.

[npm-q]: https://www.npmjs.com/package/q
