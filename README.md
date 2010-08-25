# Octoglass

Octoglass serves up consistent mirrored copies of remote git
repositories for read-only clones. Octoglass will behave like
git-daemon listening for git clone requests using the git://
repository URI. These URIs are mapped to the configured mirrored git
repositories. When a user performs a git-clone request to the mirror,
octoglass will perform a remote git-fetch on the mirrored repository
before returning the clone repository (ie., running
git-upload-pack). By synchronizing the git clone request with the
remote fetch, octoglass ensures the returned repository is consistent
with the remote git repository.

Octoglass is designed for environments that must have the most recent
copy of a repository at all times. For example, CI environments that
can be queued by a user immediately after a push operation must be
able to operate with the most recent copy. Traditional mirrored
solutions synchronize with their upstream copies on a periodic, polled
interval. The traditional solutions are most likely suitable for most
environments.

## Requirements

* node.js
* git -- tested with version 1.7.x, should work with 1.6.x

## Usage

`bin/octoglass --dir <base-dir> --repos <repos config>`

 * `--dir`: Location to the base directory to mirror the remote
   repositories to.
 * `--repos`: Path to the repository configuration file in JSON
   format. For example, the following specifies two repos to mirror:

        [
            {
                "url" : "git@github.com:mheffner/octoglass.git",
                "dir" : "/octoglass"
            },
            {
                "url" : "http://github.com/rails/rails.git",
                "dir" : "/ror"
            }
        ]

`url` is the remote git repository to clone and `dir` is the URI the
mirror will be available at. For example, if your octoglass hostname
was `octoglass.mirror.com`, the URI git://octoglass.mirror.com/ror
would return a consistent clone of the upstream Ruby on Rails
repository.

For password protected repositories that support the HTTPS method, you
can mirror them with the URL format
`https://username:password@github.com/username/repo.git`. **NOTE:
Octoglass does not provide any authentication, so it will gladly
return a clone of all configured repositories to any client. Don't
clone a private repository without other access control methods in
place.**

## TODO

* add authentication
* dynamically add/remove mirrors while running
* support alternative git URIs other then git://
* lots

## Hints

* I recommend hosting the mirrors on tmpfs by setting the base
  directory to a directory on tmpfs. Validate beforehand that the
  entire repo can fit comfortably within RAM.
