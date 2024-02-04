<h3 align="center">Aria2 Integration</h3>
<p align="center">
    Aria2 Integration allows you to redirect downloads to your Aria2 server.
    <br>
    <a href="https://github.com/baptistecdr/aria2-integration/issues/new">Report bug</a>
    ·
    <a href="https://github.com/baptistecdr/aria2-integration/issues/new">Request feature</a>
</p>

<div align="center">

[![](https://img.shields.io/amo/v/aria2-extension.svg)](https://addons.mozilla.org/en-US/firefox/addon/aria2-extension/)
[![](https://img.shields.io/amo/rating/aria2-extension.svg)](https://addons.mozilla.org/en-US/firefox/addon/aria2-extension/)
[![](https://img.shields.io/amo/users/aria2-extension.svg)](https://addons.mozilla.org/en-US/firefox/addon/aria2-extension/)

[![](https://img.shields.io/chrome-web-store/v/hnenidncmoeebipinjdfniagjnfjbapi.svg)](https://chrome.google.com/webstore/detail/aria2-integration/hnenidncmoeebipinjdfniagjnfjbapi)
[![](https://img.shields.io/chrome-web-store/rating/hnenidncmoeebipinjdfniagjnfjbapi.svg)](https://chrome.google.com/webstore/detail/aria2-integration/hnenidncmoeebipinjdfniagjnfjbapi)
[![](https://img.shields.io/chrome-web-store/users/hnenidncmoeebipinjdfniagjnfjbapi.svg)](https://chrome.google.com/webstore/detail/aria2-integration/hnenidncmoeebipinjdfniagjnfjbapi)

[![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhmmpdilndjfmceolhbgjejogjaglbiel)](https://microsoftedge.microsoft.com/addons/detail/aria2-integration/hmmpdilndjfmceolhbgjejogjaglbiel)
[![](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhmmpdilndjfmceolhbgjejogjaglbiel)](https://microsoftedge.microsoft.com/addons/detail/aria2-integration/hmmpdilndjfmceolhbgjejogjaglbiel)
[![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhmmpdilndjfmceolhbgjejogjaglbiel)](https://microsoftedge.microsoft.com/addons/detail/aria2-integration/hmmpdilndjfmceolhbgjejogjaglbiel)

</div>

## Quick start

- [Firefox Extension Add Ons](https://addons.mozilla.org/en-US/firefox/addon/aria2-extension/)
- [Chrome Web Store](https://chrome.google.com/webstore/detail/aria2-integration/hnenidncmoeebipinjdfniagjnfjbapi)
- [Microsoft Edge Store](https://microsoftedge.microsoft.com/addons/detail/aria2-integration/hmmpdilndjfmceolhbgjejogjaglbiel)

## How to build

- Install [Node.JS LTS](https://nodejs.org/)
- Clone the project
- Run `npm install`
- Run `npm run build:firefox` to build Firefox extension
- Run `npm run build:chromium` to build Chrome extension

## Development

- Run `npm run lint:fix` to lint and fix files
- Run `npm run build:firefox:watch` to auto-build for Firefox
- Run `npm run start:firefox` to install on Firefox with auto-reload
- Run `npm run build:chromium:watch` to auto-build for Chromium
- Run `npm run start:chromium` to install on Chromium with auto-reload

### Internationalization

* The extension speaks English, French and Chinese. You can add your language
  in [public/_locales](https://github.com/baptistecdr/aria2-integration/tree/main/public/_locales).
  You can find your language
  code [here](https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc#l23).

## Bugs and feature requests

Have a bug or a feature request? Please first search for existing and closed issues. If your problem or idea is not
addressed yet, [please open a new issue](https://github.com/baptistecdr/aria2-integration/issues/new).

## Contributing

Contributions are welcome!

## Thanks to

- https://github.com/robbielj/chrome-aria2-integration
- https://github.com/rahuliyer95/chrome-aria2-integration
