/*
 * Utility functions.
 */

const path = require('path');

exports.tmpname = function (tmpdir) {
  var name = "tmp_" + process.pid +
    (Math.random() * 0x100000000 + 1).toString(36);

  return path.join(tmpdir, name);
}
