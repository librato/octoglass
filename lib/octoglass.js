
/*
 * Simple git-daemon to serve up git mirrors. Serializes updates
 * and ensures repo is up-to-date before serving.
 */

const net = require('net'),
      spawn = require('child_process').spawn,
      sys = require('sys'),
      path = require('path'),
      fs = require('fs'),
      url = require('url'),
      http = require('http'),
      repo = require('./repo');

const git_daemon_port = 9418;

function usage(name) {
  sys.puts(path.basename(name) + " --dir <base-dir> --repos <repos config>");
  process.exit(1);
}

function upload_pack(client, repodir, extradata) {
  var gup;

  sys.log("Running upload pack");

  gup = spawn('git-upload-pack', [repodir]);
  if (gup == null) {
    sys.log("Failed to execute git-upload-pack");
    client.end();
    return;
  }

  if (extradata != null) {
    gup.stdin.write(extradata);
  }

  gup.stdout.on('data', function(data) {
    client.write(data);
  });
  gup.on('exit', function(code, sig) {
    if (sig != null || code != 0)
      sys.log("git-upload-pack returned failure");
    client.end();
  });

  /* All input on client goes to upload-pack now. */
  client.on('data', function(data) {
    gup.stdin.write(data);
  });

  /* Resume client. */
  client.resume();
}

function run_main_server(repomap) {
  var connlist = new Array;
  var server = net.createServer(function(stream) {
    var rcvddata = null;
    var cmdlen = null;
    var cmd = null;
    var dir = null;
    var host = null;

    var onData = function(data) {
      rcvddata += data;
      var m = data.match(/(00[0-9a-f][0-9a-f])([-a-z]+) ([^\0]+)\0host=([^\0]+)\0/);
      if (m == null) {
        return;
      }

      cmdlen = m[1];
      cmd = m[2];
      dir = m[3];
      host = m[4];

      sys.log("Received " + cmd + " request for " + dir +
              " from " + host + " (ip: " + stream.remoteAddress + ")");

      if (cmd != "git-upload-pack") {
        stream.end();
        return;
      }

      var repopath = repomap[dir];
      if (repopath == null) {
        stream.end();
        return;
      }

      // Save extra data -- is there ever any in normal mode?
      if (rcvddata.length > m[0].length)
        rcvddata = rcvddata.slice(m[0].length);
      else
        rcvddata = null;

      stream.pause();
      /* All data will now pass to upload-pack. */
      stream.removeAllListeners('data');

      repo.update_repo(stream, repopath, function () {
        upload_pack(stream, repopath, rcvddata);
      });
    };

    stream.setEncoding('utf-8');
    stream.on('connect', function () {
      sys.debug("Client connection from " + stream.remoteAddress);
      rcvddata = '';
      connlist.push(stream);

      /* Serialize connections. */
      if (connlist.length > 1) {
        stream.pause();
      }

      stream.on('data', onData);
    });
    stream.on('end', function() {
      connlist.shift();

      /* Unfreeze the next connection. */
      if (connlist.length > 0)
        connlist[0].resume();
    });
  });

  server.listen(git_daemon_port, '0.0.0.0');
}

function run_monit_server() {
  /*
   * Status server for Monit
   */
  http.createServer(function(request, response) {
    var uri = url.parse(request.url);

    var code, resp;
    if (request.method == "GET" &&
        uri.pathname == "/status") {
      code = 200;
      resp = "200 OK";
    } else {
      code = 404;
      resp = "404 Not Found";
    }
    response.writeHead(code, {"Content-Type": "text/plain"});
    response.end(resp)
  }).listen(8000, "localhost");
}

/*
 * MAIN start point
 */
function start(argv0, args) {
  var config = {};
  while (args.length > 0) {
    var opt = args.shift();

    if (opt == "--repos") {
      if (args.length == 0)
        usage(argv0);

      config.repocfg = args.shift();
    } else if (opt == "--dir") {
      if (args.length == 0)
        usage(argv0);

      config.basedir = args.shift();
    } else {
      usage(argv0);
    }
  }

  if (!config.repocfg || !config.basedir)
    usage(argv0);

  try {
    var repostr = fs.readFileSync(config.repocfg, 'ascii');
  } catch (e) {
    console.log("Failed to open: " + config.repocfg);
    console.log(e);
    process.exit(1);
  }

  try {
    var repos = JSON.parse(repostr);
  } catch (e) {
    console.log("Failed to JSON parse repos config: " + e);
    process.exit(1);
  }

  var repomap = {};

  var i = 0;
  for(i = 0; i < repos.length; i++) {
    var r = repos[i];

    sys.debug("Creating repo for: " + r['dir']);
    repo.create_repo(config.basedir, r, function(dir, path) {
      repomap[dir] = path;
    });
  }

  run_main_server(repomap);
  run_monit_server();
}

exports.start = start;
