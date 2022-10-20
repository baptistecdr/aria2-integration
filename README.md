<h3 align="center">Aria2 Integration</h3>
<p align="center">
    Aria2 Integration allows you to redirect downloads to your Aria2 server.
    <br>
    <a href="https://github.com/baptistecdr/aria2-integration/issues/new">Report bug</a>
    ·
    <a href="https://github.com/baptistecdr/aria2-integration/issues/new">Request feature</a>
</p>

## How to build

- Install [Node.JS LTS](https://nodejs.org/)
- Install [jq](https://github.com/stedolan/jq)
- Clone the project
- Run `npm install`
- Run `npm run build:firefox` to build Firefox extension
- Run `npm run build:chromium` to build Chrome extension

## Development

- Run `npm run build:firefox:watch` to build and hot-reloads (on Firefox)
- Run `npm run build:chromium:watch` to build and hot-reloads (on Chromium)
- Run `npm run lint:fix` to lint and fix files

### Internationalization

* The extension speaks English and French, but you can add your language
  in [public/_locales](https://github.com/baptistecdr/aria2-integration/tree/main/public/_locales).
  You can find your language
  code [here](https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc#l23).

## Bugs and feature requests

Have a bug or a feature request? Please first search for existing and closed issues. If your problem or idea is not
addressed yet, [please open a new issue](https://github.com/baptistecdr/aria2-integration/issues/new).

## Contributing

Contributions are welcome!

## Confidentiality

Cookies read are only transmitted to Aria2 instance. Be sure to use a secure connection between your computer and the
instance.

## Thanks to

- https://github.com/robbielj/chrome-aria2-integration
- https://github.com/rahuliyer95/chrome-aria2-integration
