var spawn = require('child_process').spawn;

exports.spawn_proc = function (cmd, dir, succ_cb, fail_cb) {
  var proc;
  var output = "";

  cmdname = cmd.shift();

  proc = spawn(cmdname, cmd, {'cwd': dir});
  proc.on('exit', function (code) {
    if (code != 0) {
      console.log("Command failed with: " + code);
      console.log("Output: " + output);
      fail_cb();
    } else {
      succ_cb();
    }
  });
  proc.stdout.on('data', function(data) {
    // Save for error condition
    output += data;
  });
  proc.stderr.on('data', function(data) {
    // Save for error condition
    output += data;
  });
}
