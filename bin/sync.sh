#!/bin/bash

set -e

echo "setting git credentials"
git config --global user.email "noreply@emberjs.com"
git config --global user.name "Tomster McTomster"

echo "Cleaning build directories"
rm -rf tmp/build

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )"/.. && pwd )"

ember build --environment=production
mkdir -p tmp/build
echo "cloning"
git clone https://ember-guides-deploy-bot:${GITHUB_TOKEN}@github.com/tomdale/glimmer-website.git tmp/build/glimmer-website 2>&1
echo "done cloning"

pushd tmp/build/glimmer-website
git rm -rf src/api/*
mkdir -p src/api
cp -rf ${ROOT_DIR}/dist/* src/api
git add -A src/api
sha="$(git rev-parse HEAD)"
git commit -am "Auto deploy for $sha from https://github.com/glimmerjs/glimmer-api-docs"
git push origin master
popd
