const fs = require('fs');

const fork = require('./fork');
const utils = require('./utils');

function prune_repo(path, succ_cb, fail_cb) {
  fork.spawn_proc(['git', 'remote', 'prune', 'origin'],
                  path, succ_cb, fail_cb);
}

function fetch_repo(path, succ_cb, fail_cb) {
  fork.spawn_proc(['git', 'fetch'], path, succ_cb, fail_cb);
}

function sync_repo(path, succ_cb, fail_cb) {
  var fetch_succ_cb = function() {
    prune_repo(path, succ_cb, fail_cb);
  };

  fetch_repo(path, fetch_succ_cb, fail_cb);
}

function update_repo(client, path, donecb) {
  var fail_cb = function() {
    console.log("Failed to update repo for client...disconnecting");
    client.end();
  };

  sync_repo(path, donecb, fail_cb);
}

function init_repo(repourl, path, cb) {
  var file;

  /* Lock down file permissions. */
  fs.chmodSync(path + "/config", 0700);

  file = fs.createWriteStream(path + "/config",
                              { 'flags': 'a' });
  file.on('close', function() {
    sync_repo(path, cb, function() {});
  });

  confstr =
    "[remote \"origin\"]\n" +
    "\tmirror = true\n" +
    "\turl = " + repourl + "\n" +
    "\tfetch = +refs/*:refs/*\n";

  file.write(confstr, 'ascii');
  file.end();
}

function create_repo(basedir, repocfg, cb) {
  var path, ret;

  path = utils.tmpname(basedir);
  try {
    fs.mkdirSync(path, 0700);
  } catch (err) {
    console.log("Unable to mkdir " + path + ": " + err);
    return -1;
  }

  var init_succ_cb = function() {
    cb(repocfg['dir'], path);
  };

  var succ_cb = function() {
    init_repo(repocfg['url'], path, init_succ_cb);
  };

  var fail_cb = function() {
    console.log("Failed to initialize repo: " + repocfg['url']);
    process.exit(1);
  };

  fork.spawn_proc(["git", "init", "--bare"], path, succ_cb, fail_cb);
}

exports.update_repo = update_repo;
exports.create_repo = create_repo;
