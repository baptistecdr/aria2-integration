<h3 align="center">Aria2 Integration</h3>
<p align="center">
    Aria2 Integration allows you to redirect downloads to your Aria2 server or Motrix instance.
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

## Managed configuration (enterprise policies)

The extension can be configured through enterprise policies, for example for ephemeral profiles, Docker containers or
kiosks. Options set by a policy take precedence over the ones configured in the options page. Options the policy doesn't
set keep their current value.

Each server **must** have a `uuid`, a valid UUID that is unique among the servers. `captureServer` references a server
by this `uuid`. To generate one:

- Linux/macOS: `uuidgen`
- Linux: `cat /proc/sys/kernel/random/uuid`
- Windows (PowerShell): `[guid]::NewGuid()`

To move an existing setup to a policy, copy the UUID shown for each server in the options page.

### Firefox

In [`policies.json`](https://mozilla.github.io/policy-templates/#3rdparty):

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "baptistecdr@users.noreply.github.com": {
          "servers": [
            {
              "uuid": "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b",
              "name": "aria2",
              "host": "aria2.example.lan",
              "port": 6800,
              "path": "/jsonrpc",
              "secure": false,
              "secret": "example-secret",
              "rpcParameters": { "split": "5" }
            }
          ],
          "captureServer": "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b",
          "captureDownloads": true,
          "excludedProtocols": ["blob", "data", "about", "file", "moz-extension"],
          "notifyErrorOccurs": true
        }
      }
    }
  }
}
```

### Chrome / Edge

Set the same keys as an [extension policy](https://www.chromium.org/administrators/configuring-policy-for-extensions/)
for the extension ID `hnenidncmoeebipinjdfniagjnfjbapi` (Chrome) or `hmmpdilndjfmceolhbgjejogjaglbiel` (Edge). On Linux,
for example in `/etc/opt/chrome/policies/managed/aria2-integration.json`:

```json
{
  "3rdparty": {
    "extensions": {
      "hnenidncmoeebipinjdfniagjnfjbapi": {
        "servers": [{ "uuid": "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b", "name": "aria2", "host": "aria2.example.lan" }],
        "captureServer": "0b6a1f9e-3c2d-4e5f-8a9b-1c2d3e4f5a6b",
        "captureDownloads": true
      }
    }
  }
}
```

The accepted keys are listed in [`managed-schema.json`](public/managed-schema.json).

### Good to know

- If any value is invalid (wrong type, missing or duplicated server `uuid`…), the **whole policy is ignored**. The error
  is only logged in the extension console (`about:debugging` in Firefox, the service worker of `chrome://extensions` in
  Chrome). `about:policies` (Firefox) and `chrome://policy` (Chrome/Edge) show whether the browser loaded the policy.
- Options set by a policy can still be edited in the options page, but the policy value is restored on the next load.
- Changes to the policy are applied after the browser restarts.

## How to build

- Install [Node.JS LTS](https://nodejs.org/)
- Clone the project
- Run `npm install`
- Run `npm run build:firefox` to build Firefox extension
- Run `npm run build:chromium` to build Chrome extension

## Development

- Run `npm run lint:fix` to lint and fix files
- Run `npm run test` to run tests
  - Run `npm run test:coverage` to run tests with coverage
- Run `npm run test:e2e` to run end-to-end tests on Chromium with Playwright
  - Requires Docker: aria2 is started from `compose.yaml` (port 16800) and stopped after the tests
  - Run `npx playwright install chromium` once to install the browser
- Firefox
  - Run `npm run build:firefox:debug:watch` to auto-build for Firefox
  - Run `npm run start:firefox` to install on Firefox with auto-reload
- Chromium
  - Run `npm run build:chromium:debug:watch` to auto-build for Chromium
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
