#!/usr/bin/env bash
# Retired: this used to deploy dist/ with no check against GitHub.
# site/ is the deploy target and scripts/deploy-site.sh is the only deploy path.
exec "$(dirname "$0")/deploy-site.sh" "$@"
