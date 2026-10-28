# R Online

Write and run R in your browser at **https://curtcox.github.io/R/**. R runs locally
as WebAssembly in an isolated worker. There is no R server and no build step.

- Ace editor with R highlighting/completion and Ctrl/Cmd+Enter to run.
- Console, Program input, base/grid/ggplot2 plots, HTML/Markdown, and R help.
- Run/Stop, debounced Auto-run, mobile Output/Code/Input tabs and a resizable editor.
- Source/input/settings in share links, an optional is.gd shortener, QR codes,
  source/text/SVG/PNG downloads, and HashBin CID loading/publish integration.
- A searchable [gallery](https://curtcox.github.io/R/gallery.html) of 32 executed
  samples covering R basics, data, statistics, graphics, objects, input and 256t.
- Installable PWA with hash-verified offline base R and optional gallery packages.

## Running programs

A run starts with fresh global variables, options, random seed, working directory,
graphics devices and attached packages. Installed packages remain available until
Stop replaces the worker. Package references in `library`, `require`,
`requireNamespace`, and `pkg::function` trigger automatic installation from the
webR R 4.6 repository. Explicit `install.packages()` maps to webR's installer.

Put answers in **Program input** before running. `readline()`, `readLines("stdin")`,
`readLines(stdin())`, `readLines(file("stdin"))` and `scan()` consume and echo it.
See [input docs](docs/input.md), [graphics docs](docs/graphics.md), and
[256t calls](docs/256t-calls.md). Use unqualified reader/helper names.

Auto-run waits 750 ms after an edit and allows five seconds of execution after
package loading. Manual runs have no hard limit; Stop always terminates the
worker. A reminder appears after 60 seconds. R code can access the network, and
auto-run can repeat network requests or other side effects. Disable it while
preparing a program with side effects.

The startup runtime is about 23 MB on a first visit. The remaining base-R files
are downloaded before the first program executes, for a complete runtime of
about 45 MB. This allows synchronous filesystem reads to work from verified
bytes even when offline. Gallery packages are an additional optional download;
arbitrary packages require internet.

## Sharing and HashBin setup

Links preserve source, input, and Auto-run. **Don't run on open** suppresses the
first execution. A link asks before replacing different work saved in this
browser. Work uses `ronline:` localStorage keys, separate from sibling apps.

`#<cid>` loads verified R source or an R Online document. Saving uses the
immutable HashBin SDK's Publish approval flow; no HashBin OAuth credentials are
stored on this shared Pages origin. Popup and redirect flows preserve work,
including cancelled saves.

**The HashBin client ID intentionally ships empty.** To enable saving, register
**R Online** on hashbin.org with return URL exactly **https://curtcox.github.io/R/**,
then supply the public client ID for the `hashbin-client-id` meta tag in
`index.html`. Run `npm run offline` after changing it. Loading and compressed
sharing work without registration. No paid sample documents have been published;
the four short gallery documents use inline CIDs and need no paid storage.

## Offline and isolation

The service worker installs the app and complete pinned base runtime atomically.
It verifies SHA-256 before caching or serving bytes; initial worker downloads are
also verified before execution. Caches use `ronline-` names and project scope.
Use **Make packages available offline** to cache the gallery's pinned dependency
set. Upstream package rebuilds fail verification with a package-update message;
the online copy can still run without being cached. Other packages stay
network-only. **Update and reload** saves editor work before activating an update.

Untrusted R and its JavaScript bridge run inside an opaque-origin iframe worker
(`sandbox="allow-scripts"`, origin `null`). Storage, script-loading and nested
worker APIs are removed before execution, including webR's saved WorkerProxy.
Rich output is inert text, image SVG, or script-disabled sandboxed HTML frames.
The user approved CSP `unsafe-eval` because webR's dynamic linker requires it;
this does not grant the R worker the editor's origin. The base runtime remains
unmodified and pinned. See [spike findings](spike/README.md) and the
[implementation plan](todo/master_plan.md) for the measured tradeoffs.

## Development

Requires Node 22 or later. Browser tests use a local mirror of the pinned npm
runtime and downloaded package files. The site itself stays buildless.

```
npm ci
npx playwright install chromium firefox webkit
npm run packages -- --verify
npm test
npm run check
npm run test:browser
BROWSER=webkit npm run test:browser
FULL_GALLERY=1 npm run test:browser
npm run serve
```

After changing examples, keep `src/examples.js` and `examples/*.R` in sync, then
run `npm run gallery` to execute every sample and regenerate previews and
fingerprints. It also regenerates the gallery package manifest. After editing
docs run `npm run docs`. After changing shipped assets run `npm run offline` and
`npm run check`. `npm run packages -- --verify` downloads and verifies existing
pins without rewriting them. Caches, browser installations and test output are
ignored. Gallery generation uses the same RCore and R helpers as the browser.

`npm run serve` starts a local development server with a local runtime mirror.
GitHub Pages serves the checked-in root directly and loads the pinned CDN.
`.github/workflows/deploy.yml` is copied unchanged from Python Online: each push
to main uploads the root and deploys. Unit/check and three-browser/full-gallery
CI run separately and do not gate deployment. Pages is configured for GitHub
Actions. HashBin registration remains a user setup step.

## Credits and licenses

This unofficial tool is not affiliated with the R Foundation. It uses an original
console-prompt icon, not the R logo. R is by the R Core Team (GPL-2 | GPL-3), and
webR is by its contributors at Posit (MIT). Their unmodified binaries load from
pinned jsDelivr webR 0.6.0 and are not redistributed in this repository. Packages
retain their own licenses.

Editor and sharing glue descend from Python Online `52ffb06` and GraphvizOnline.
Retained notices: `LICENSE-graphvizonline`, `LICENSE-svg-pan-zoom`, `ace/LICENSE`,
`vendor/LICENSE-lz-string`, HashBin SDK license headers, and Nayuki's MIT QR notice.
The synchronous 256t bridge uses MIT js-sha512 0.9.0 with its license retained;
Node/WebCrypto vectors test its CID results. The R runtime and t256 helpers are
original code.
