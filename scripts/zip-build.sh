#!/usr/bin/env bash

NAME=$(jq -r .name <"package.json")
VERSION=$(jq -r .version <"package.json")

mkdir -p "artefact"
cd "build" || exit
zip -r "../artefact/$NAME-$VERSION-$BROWSER.zip" ./*
