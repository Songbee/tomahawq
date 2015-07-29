var async = require('async');
var fs = require('fs');
var path = require('path');
var PullStream = require('pullstream');
var unzip = require('unzip');
var Q = require('q');

// Load internal modules
var AxeInstance = require('./AxeInstance');

var pullTo = function(cb) {
  var ps = new PullStream();
  ps.pull(cb);
  return ps;
}

exports.loadAxe = function (filepath, cb) {
  var deferred = Q.defer();

  var axe = {};

  fs.createReadStream(filepath).pipe(unzip.Parse()).on('entry', function (entry) {
    if (entry.path == 'content/metadata.json') {
      entry.pipe(pullTo(function (err, data) {
        axe = JSON.parse(data.toString());
      }));
    } else {
      entry.autodrain();
    }
  }).on('close', function () {
    axe.axePath = filepath;
    axe.manifest.scripts = axe.manifest.scripts || [];
    axe.manifest.scripts.push(axe.manifest.main);
    axe.manifest.scripts = axe.manifest.scripts.map(function (item) { return 'content/' + item; });

    axe.sourcecode = '';
    fs.createReadStream(filepath).pipe(unzip.Parse()).on('entry', function (entry) {
      if (axe.manifest.scripts.indexOf(entry.path) >= 0) {
        entry.pipe(pullTo(function (err, data) {
          axe.sourcecode += data.toString() + "\n\n";
        }));
      } else {
        entry.autodrain();
      }
    }).on('close', function () {
      axe.getInstance = function(config) {
        return new AxeInstance(this, config);
      }
      deferred.resolve(axe);
    });
  });

  return deferred.promise;
};

exports.loadDirectory = function (dirpath, cb) {
  var deferred = Q.defer();

  var metadataPath = path.join(dirpath, 'content', 'metadata.json');
  fs.readFile(metadataPath, function (err, data) {
    if (err) {
      cb(err, null);
    } else {
      axe = JSON.parse(data.toString());
      axe.axePath = dirpath;
      axe.manifest.scripts = axe.manifest.scripts || [];
      axe.manifest.scripts.push(axe.manifest.main);
      axe.manifest.scripts = axe.manifest.scripts.map(function (item) { return path.join(dirpath, 'content', item); });
      async.map(axe.manifest.scripts, fs.readFile, function (err, scripts) {
        axe.sourcecode = scripts.map(function (item) {
          return item.toString();
        }).join('\n\n');
        axe.getInstance = function(config) {
          return new AxeInstance(this, config);
        }
        deferred.resolve(axe);
      });
    }
  });

  return deferred.promise;
};
