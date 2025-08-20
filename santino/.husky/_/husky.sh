#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  readonly husky_skip_init=1
  export readonly husky_skip_init
  sh -e "$0" "$@"
  exit $?
fi
