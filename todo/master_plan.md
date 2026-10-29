# R Online — master plan

A static GitHub Pages site where people write R programs in the browser and see them run,
the way [Python Online](https://curtcox.github.io/PythonOnline/) does for Python. No server:
R runs in the page as WebAssembly (webR), inside a sandboxed Web Worker.

Published at **https://curtcox.github.io/R/**. The GitHub repo is `curtcox/R`, and the Pages path
follows that casing. The HashBin return URL must match it exactly, including the trailing slash.

## Decisions (agreed)

| Topic | Decision |
|---|---|
| Name and URL | **R Online** at `https://curtcox.github.io/R/`. The repo is not renamed. |
| Language | R only. No language detector, and no Python/Graphviz modes. |
| Engine | **webR 0.6.0** (R **4.6.0**, released 2026-05-19), pinned, loaded from `https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/`. Not vendored: `R.wasm` alone is 18 MB, and most of the 45 MB distribution loads only on demand. Same pinning approach as Pyodide in Python Online. |
| Publishing | Python Online's `deploy.yml`, unchanged: on push to `main`, upload the repo root with `actions/upload-pages-artifact@v3`, deploy with `actions/deploy-pages@v4`. No build step. Tests are a separate workflow and don't gate deployment. |
| Lineage features | Links to docs and gallery, mobile layout, HashBin load/save, QR code of the URL. All four are carried over from Python Online. |
| Extras (all chosen) | Offline/installable PWA; a Program input box; 256t saved-function calls; Playwright CI on Chromium, Firefox and WebKit. The is.gd link shortener, download dialog and auto-run come along too, as in Python Online. |
| HashBin | The user registers an **R Online** app later. Until then the code ships with an empty `hashbin-client-id` meta tag: loading works, and Save explains that the app needs registration. |
| Workflow | Direct commits on `main`, with frequent pushes. Each push deploys. |

## What I checked before planning

- **Python Online** (`curtcox/PythonOnline` @ `52ffb06`) is the source of almost all the glue: `index.html`,
  `src/app.js`/`app.css`, `hashbin.js`, `hashbin-panel.js`, `share-links.js`, `qr.js`, `output-view.js`,
  `offline.js`, `service-worker.js`, `offline-assets.js`, `scripts/*.mjs`, `tests/browser/all.cjs`, the
  vendored HashBin SDK v0.3.0 and lz-string, Ace 1.4.1 and svg-pan-zoom. Its `AGENTS.md` and `README.md`
  record the contracts this plan keeps (sandbox, CSP, hash-verified cache, shared-origin rules).
- **webR 0.6.0** is the newest release (0.5.9 was 2026-04-18). Its `webr.mjs` reports R 4.6.0.
  `R.wasm` is 18 MB, `R.js` 786 KB, `webr-worker.js` 134 KB. Base-package help, docs, translations and
  fonts are separate `vfs/**.data.gz` images (~27 MB in all), mostly fetched lazily.
- Both `webr.r-wasm.org/v0.6.0/` and jsDelivr serve with `access-control-allow-origin: *` and
  `cross-origin-resource-policy: cross-origin`. jsDelivr is chosen because the npm package doubles as a
  pinned devDependency, so tests can serve the exact bytes as a local CDN mirror (as Python Online does with Pyodide).
- **Packages:** `https://repo.r-wasm.org/bin/emscripten/contrib/4.6/PACKAGES` sends `ACAO: *`. It lists
  ggplot2 4.0.3, dplyr 1.2.1, tidyr 1.3.2, data.table 1.18.6.1, jsonlite 2.0.0, stringr 1.6.0,
  lubridate 1.9.5, purrr 1.2.2, readr 2.2.0, knitr 1.52, rmarkdown 2.32 and svglite 2.2.2. This
  repository is **not versioned**: it tracks the newest builds. That matters for offline hashing (see **Offline**).
- **No interrupt:** GitHub Pages can't send COOP/COEP headers, so there's no `SharedArrayBuffer`. webR
  then falls back to its PostMessage channel, which can't interrupt R or block on `readline()`. Stop
  and timeouts must terminate the worker, and Program input must be supplied up front. Python Online
  has the same limits.
- **Worker structure:** `webr-worker.js` is a classic worker. It loads `R.js` with `importScripts`
  and is driven by an `init` message followed by request messages (`evalR`, `captureR`,
  `installPackages`, `writeFile`, …). The main-thread `WebR` class always spawns that worker itself,
  and offers no hook for supplying our own. This shapes **Engine design** below.
- **Ace 1.4.1** (the version Python Online ships) has `mode-r.js` in `ace-builds`, so R highlighting
  needs no custom mode.
- `curtcox.github.io` is one origin shared by every Pages project (PythonOnline, GnuplotOnline, …). Shared
  links run arbitrary R on open, so user code must not run with that origin. That's why we keep
  Python Online's opaque-origin sandbox (SN-2026-001).

## Lineage features to carry over

1. **Links to docs and gallery.** In the *More* panel: *R manuals ↗* (https://cran.r-project.org/manuals.html),
   *An Introduction to R ↗* (https://cran.r-project.org/doc/manuals/r-release/R-intro.html), *webR ↗*
   (https://docs.r-wasm.org/webr/v0.6.0/), *Packages ↗* (https://repo.r-wasm.org/), and *Sample gallery ↗*
   (`gallery.html`). Plus *Explore samples ↗* in the code-pane heading. Gallery cards link to relevant
   docs (ggplot2 reference, dplyr reference, our `docs/input.md` and `docs/256t-calls.md`).
   **Help in the console:** `?mean` and `help()` render the base R help page as sanitized HTML output
   (webR ships help images lazily).
2. **Mobile friendly.** Python Online's `@media (max-width: 760px), (max-height: 500px)` layout:
   *Output / Code / Input* tabs with Output first, prominent Run/Stop, rarely used controls behind
   *More*, 40 px touch targets, 16 px inputs so iOS doesn't zoom, and `100dvh`. Pinch/pan on plots
   with `svg-pan-zoom.min.js`.
3. **HashBin load/save.** Python Online's `hashbin.js` and `hashbin-panel.js`, with the envelope type set to
   `r` (see **HashBin**). `#<cid>` URLs load automatically. Saves go through the SDK's `publish()`,
   and the program survives both the popup and redirect flows, whether approved or cancelled.
4. **QR code of the URL.** Python Online's `src/qr.js` (Project Nayuki encoder, MIT notice kept) and its dialog.
   It encodes the CID link if the editor still matches the last save, else the compressed document link.
   It offers SVG/PNG download, and warns about local hosts, dense codes (version > 20) and overlong URLs,
   each time suggesting HashBin.
5. From GraphvizOnline via Python Online: Ace editor, debounced auto-run, draggable splitter, hide-editor
   toggle, share dialog with *Don't run on open*, Download dialog, GitHub fork link. Keep
   `LICENSE-graphvizonline`.

## Repository layout

```
.github/workflows/deploy.yml     # copied from PythonOnline unchanged
.github/workflows/test.yml       # unit (node + R via webR in Node) + check + Playwright matrix
AGENTS.md                        # contracts for agents (adapted from PythonOnline)
README.md                        # user + developer docs
index.html, gallery.html         # editor and gallery pages
manifest.webmanifest, icon.svg, icons/icon-{180,192,512}.png   # PWA install; original icon, not the R logo
service-worker.js, offline-assets.js   # offline cache (content-versioned, hash-verified)
ace/                             # ace.js, ext-language_tools.js, theme-chrome.js, mode-r.js, LICENSE
svg-pan-zoom.min.js, LICENSE-svg-pan-zoom, LICENSE-graphvizonline
vendor/                          # hashbin-sdk-v0.3.0.mjs, hashbin-cache-v0.3.0.js, lz-string.min.js (+ licenses)
src/app.js, src/app.css          # editor glue (from PythonOnline, R labels and file name main.R)
src/r-core.js                    # shared by worker, Node tests and gallery renderer (≈ python-core.js)
src/r-worker.js                  # sandbox worker body: hosts webR's worker (see Engine design)
src/r-sandbox.js                 # createSandbox() factory (≈ python-sandbox.js)
src/r-client.js                  # worker lifecycle, warm spare, timeouts, Stop (≈ python-client.js)
src/r/runtime.R                  # per-run environment: stdin, plots, display helpers, error formatting
src/r/t256.R                     # 256t saved-function calls
src/hashbin.js, hashbin-panel.js, share-links.js, qr.js, output-view.js, export.js,
  render-scheduler.js, traceback.js, offline.js, examples.js, gallery.js, gallery.css, docs.css
docs/input.md|html, docs/256t-calls.md|html, docs/graphics.md|html
examples/*.R, examples/saved/*.R # sample sources (mirrored in src/examples.js)
gallery/previews/*.svg           # generated by npm run gallery
scripts/check.mjs, render-gallery.mjs, render-docs.mjs, update-offline.mjs, remote-hashes.json,
  package-hashes.json
tests/*.test.js, tests/browser/all.cjs, tests/browser/fixtures/, tests/fixtures/256t/, tests/r/*.R
todo/master_plan.md              # this file
```

## Engine design

### Where R runs

Python Online's rule stands: user code never runs on the main thread or with this origin. The HashBin
SDK's `createSandbox()` starts a classic worker inside an opaque-origin iframe (`sandbox="allow-scripts"`).
That worker's `fetch` goes through the page for whitelisted prefixes, and the page serves those bytes
from the hash-verified offline cache.

webR wants to spawn its own worker, so **Phase 0 is a spike** that settles which of two approaches
we use, in all three browsers:

- **S1 — single worker (preferred).** The sandbox worker body is our prelude, `src/r-worker.js`,
  and then the pinned `webr-worker.js` text. Before webR's code runs, `r-worker.js` prefetches `R.js`
  through `hashbinSandbox`, and shims `importScripts` for webR's base URL to load those proxied blob URLs.
  It also routes webR's own `fetch` calls for `R.wasm` and `vfs/*` through the proxy. Then it plays the
  main-thread side of webR's PostMessage channel itself: `init`, then `evalR`/`captureR`/`installPackages`/
  `writeFile` requests. This keeps every runtime byte hash-verified, so R works offline. The cost is coupling
  to webR's internal message protocol. The pin, and a protocol test in CI, contain that risk.
- **S2 — nested worker (fallback).** The sandbox worker imports `webr.mjs` and constructs
  `new WebR({ channelType: ChannelType.PostMessage, baseUrl })`. webR spawns a nested worker, which
  inherits the opaque origin, so the security property holds. But its fetches bypass the proxy, so the
  runtime can't come from the verified cache, and **R would not run offline**. If the spike forces S2,
  I'll stop and check with you before continuing.

Spike exit criteria: in Chromium, Firefox and WebKit, `self.origin === 'null'` inside R's worker
(checked via an R-side JS call), `print(1)` round-trips, a plot renders, and S1 reloads and runs R
with the network off.

### The run protocol (`src/r-core.js`, `src/r/runtime.R`)

Each run sends `{ id, source, stdin, mode }`. The worker:

1. Resets R state: a fresh global environment (`rm(list = ls(globalenv(), all.names = TRUE))`), default
   options, `set.seed` cleared, working directory `/home/web_user`, closed graphics devices, and
   detached user-attached packages. Installed packages stay until Stop/replacement, like Python Online's packages.
2. Scans the source for `library(x)`, `require(x)`, `requireNamespace("x")`, `pkg::fn` and `pkg:::fn`.
   It ignores comments and strings, and installs missing packages from the 4.6 repo with status
   messages ("Installing ggplot2 and 11 dependencies…"). `install.packages()` and `webr::install()`
   also work inside programs, since `install.packages` is mapped to webR's installer.
3. Writes the source to `/home/web_user/main.R`, then evaluates it **expression by expression** with
   `withCallingHandlers`. This mirrors `Rscript main.R`: visible values auto-print, output stays in order,
   and warnings are collected and printed at the end as R does (`Warning message:` …).
   Errors produce `Error in f(): message` plus a `traceback()`-style call stack mapped to `main.R` line
   numbers, using `srcref`s from `parse(keep.source = TRUE)`. `src/traceback.js` turns these into Ace
   error annotations.
4. Streams stdout/stderr through Python Online's `OutputBuffer` (1 MiB / 20,000-line cap, 50 ms flushes).

### Graphics

- Python Online's eager-capture model. Our device wrapper is the default device
  (`options(device = …)`), so every completed plot page (`plot.new`/`grid.newpage`, a ggplot print, or end
  of run) is captured as **SVG** for display and a **2× PNG** for download. Output order relative to text is kept.
- The spike checks webR 0.6's Cairo-backed `svg()`/`png()`. Bundled Noto fonts and `grDevices/libs.data`
  suggest they exist. If they don't, we use `svglite` (installed on first plot, cached offline) for SVG,
  and webR's `webr::canvas()` (`OffscreenCanvas` → `ImageBitmap`) for PNG.
- SVG output is shown as an inert blob `<img>` (never inline), with svg-pan-zoom on a wrapper. As in
  Python Online, only our own QR code creates inline SVG.
- Default size 7×5 in at 96 dpi; `options(online.plot.width/height)` changes it; `dev.size()` reports it.

### Program input

R reading from stdin in a non-interactive session needs care. `runtime.R` masks these in an attached
`online:runtime` environment, so that all of them consume Program input lines in order and **echo
them** like a terminal:

- `readline(prompt)`
- `readLines("stdin")`, `readLines(file("stdin"))`, `readLines(stdin())`
- `scan(file = "")`, `scan("stdin")`
- `file("stdin")` connections in general, via a `textConnection` over the remaining lines

When input runs out, `readline()` returns `""` and prints a one-time hint: *"Program input is empty —
add lines in the Input box"*. `interactive()` returns `FALSE`, as under `Rscript`. All of this is documented in
`docs/input.md`.

### Rich output

- Data frames, tibbles, matrices and lists print as text, exactly as R prints them.
- `display_html(x)`, `display_markdown(x)` and `display_svg(x)` helpers (in `online:runtime`). Plus
  `knitr::kable(format = "html")` and `htmltools` tags passed to `print()`, which route to the HTML output.
- HTML/Markdown render in an iframe with an empty `sandbox` attribute and a restrictive CSP, as in Python Online.
- `?topic` / `help(topic)` render base-package help as HTML through the same sandboxed iframe.

### Limits and lifecycle (`src/r-client.js`)

Python Online's `PythonClient`, unchanged in behavior:

- Auto-run 750 ms after typing stops. Its **5 s** limit starts after package installation.
- Manual runs have no hard limit, show a 60 s reminder, and always offer Stop.
- Stop and supersession terminate the worker. Desktop keeps a warm spare; low-memory/mobile devices restart lazily.
- Stale worker events are ignored.

R startup is heavier than Pyodide (~20 MB on first visit), so the status says *"Loading R… (~20 MB on first visit)"*.

## Editor page (`index.html`, `src/app.js`)

- Python Online's markup and glue with R labels: brand *R Online*, tagline, `main.R` tab, *Program input* hint
  *"Read with readline() or readLines("stdin")"*, footer *R 4.6.0 · webR 0.6.0*, and *Fork on GitHub*
  pointing to `curtcox/R`.
- Ace in `ace/mode/r` with `ext-language_tools` completion. A word list covers base/stats/utils
  function names, plus names from attached packages that the worker reports after each run.
- Ctrl/Cmd+Enter runs. Auto-run checkbox (remembered). Unsaved source, input and Auto-run are kept in
  `localStorage` under `ronline:` keys, which stay apart from Python Online's on the shared origin.
- Default program: a short welcome showing a vector, a summary, and a plot.

## Sharing and URLs

`src/share-links.js` is unchanged except for the envelope type:

- `#<encoded source>`, `?compressed=<lz-string>`, `?doc=<compressed JSON>` (source + input + settings),
  `?example=<id>`, `#<cid>`, and `?run=0` to suppress the first run.
- *Shorten link* via is.gd through AllOrigins, with Python Online's error handling.
- Links never silently replace the stored program: the user confirms first.

## HashBin

- Envelope: `{"format":"hashbin-diagram","version":1,"type":"r","src":"…","r":{"stdin":"…","autorun":true}}`.
  Bare `.R` text also loads. Limit 5 MiB including the envelope.
- `HashBinDocuments.cid()` accepts links on `hashbin.org`, `256t.us` and `curtcox.github.io`. Loads verify
  content against the CID (inline ≤ 64 bytes, otherwise SHA-512) and fetch from `https://256t.us/`.
- Saves go through SDK v0.3.0 `publish()`, called synchronously from the click. If the popup is
  blocked, documents up to 512 KiB go through a redirect, and the snapshot is restored on return. No OAuth tokens on this origin.
- The SDK files are vendored byte for byte from Python Online, and tests check their SRI hashes.
- `hashbin-client-id` ships **empty**. **Your setup step:** register "R Online" on hashbin.org with return URL
  **`https://curtcox.github.io/R/`**, then give me the public client ID. I'll put it in `index.html`,
  rerun `npm run offline`, and record it in `AGENTS.md`/`README.md`.

## 256t saved-function calls (`src/r/t256.R`)

An R port of Python Online's `t256` module, attached as the `t256` environment (`t256$call(...)`), with
the same three kinds of text:

| Text | Form | Example |
|---|---|---|
| Function | R. Earlier expressions (e.g. `library()` calls) run first. The last top-level expression is the function: a `function(...)` literal, `\(x)` lambda, or an assignment `f <- function(...)`. A trailing `if (sys.nframe() == 0L) { … }` demo block is skipped, R's analogue of `if __name__ == "__main__":`. | `examples/256t-save.R`, `\(name) paste0("Hello, ", name, "!")` |
| Parameters | Call arguments as written between parentheses (`6, h = 7`). Only literal constants and `c()`/`list()` of them are allowed, checked by walking the parsed call, so parameters stay data, not code. | `examples/saved/pi-30.R` |
| Function and parameters | Function text whose last expression calls the function with literal arguments. | `examples/saved/top-words.R` |

API: `t256$text(cid)`, `t256$source(cid)` (unwraps a saved R Online envelope), `t256$fn(cid)`,
`t256$parameters(cid)` (named list), `t256$call(cid, params_cid = NULL)` and `t256$cid(text)`.
Servers are `https://256t.us/` then `https://256t.org/`, fetched with webR's JS bridge (`fetch` from the
worker). Each string is fetched at most once per page and verified by hash. SHA-512 comes from the worker's
`crypto.subtle`, so no R package is needed.

Samples use four saved programs, published once with the **Claude Code publisher** HashBin client
(after confirming the price with you), mirrored to 256t.org, and copied into `tests/fixtures/256t/`.

## Security

Python Online's model, re-checked for R:

- R runs only in the opaque-origin sandbox worker (browser test asserts the origin is `null`).
- Before user code runs, the worker shadows and deletes inherited `caches`, `indexedDB`, `importScripts`
  (after webR's own loading), `Worker` and `SharedWorker`.
- webR's R↔JS bridge (`webr::eval_js`) runs in that sandboxed worker, so it can't reach the page.
- CSP in `index.html`/`gallery.html`: `script-src 'self' <SDK bootstrap hash> blob: 'wasm-unsafe-eval' 'unsafe-eval'`,
  `worker-src 'self' blob:`, `connect-src 'self' https: blob: data:`. jsDelivr and repo.r-wasm.org are reached only
  through the proxy or the worker's `connect-src`.
- Output messages are data: text via text nodes, HTML/Markdown/help in script-less sandboxed iframes, SVG as images.
- R code has network access (e.g. `download.file`, `url()`, `jsonlite::fromJSON("https://…")`), and auto-run
  may repeat side effects. The README says so, as Python Online's does.
- Service worker scope and `ronline-` cache prefix. It serves only bytes matching pinned hashes.

## Gallery (~30 samples)

`gallery.html` + `src/gallery.js` + `src/gallery.css` from Python Online: search box, tag filter, cards with
generated SVG previews, and *Open in editor* links (`?example=<id>`). Samples live in `examples/*.R` and in
`src/examples.js` (with `id`, `title`, `tags`, `docs`, a fingerprint).

| Topic | Samples |
|---|---|
| Basics | welcome, fizzbuzz, vectors (vectorised arithmetic, `seq`, recycling), functions & recursion (Tower of Hanoi), closures & the apply family (`sapply`, `Map`, `Reduce`), strings & regex (`sprintf`, `gsub`, `regmatches`) |
| Input | input-numbers (`readline` + `as.numeric`), word-count (`readLines("stdin")` + `table`) |
| Data | data frames (`mtcars`, `aggregate`, `summary`), `penguins` (new in R 4.5) with dplyr, tidyr reshaping, jsonlite, factors & tables |
| Statistics | linear model (`lm`, `summary`, residual plot), t-test & distributions, simulation (central limit theorem) |
| Graphics | histogram, scatter + regression line, ggplot2 faceting, colour wheel (`hcl.colors`), Mandelbrot (`image`), Game of Life (`image` frames), fractal tree (`segments`), spirals & waves (`curve`, `matplot`) |
| Objects | S3 print methods, Reference Classes / R5 |
| Output | HTML table (`knitr::kable` → `display_html`), Markdown |
| 256t | save a function, a function from 256t, function and parameters, mix functions and parameters |

`npm run gallery` runs each sample with the pinned webR in Node, writes `gallery/previews/<id>.svg` (first plot,
or a styled console excerpt), and updates fingerprints. `npm run check` fails if a sample changed
without regenerating its preview.

## Offline / PWA

- `service-worker.js` + `offline-assets.js` from Python Online. Atomic install of the whole app plus the
  webR core: `webr-worker.js`, `R.js`, `R.wasm`, and the `vfs` images needed at startup (determined in the spike by
  recording a cold start). The update flow is *Update and reload*, preserving the editor first.
- `scripts/remote-hashes.json` pins SHA-256 for every webR file we cache, generated from the npm package by
  `npm run offline`.
- **Packages:** repo.r-wasm.org is unversioned, so arbitrary packages are **network-only and never cached**.
  *Make packages available offline* caches a fixed set: everything the gallery needs (ggplot2, dplyr, tidyr,
  jsonlite, knitr and their dependencies, plus svglite if used). Its exact files and SHA-256s are pinned in
  `scripts/package-hashes.json`, regenerated by `npm run gallery`. If upstream rebuilds a pinned package,
  the hash mismatch is reported as *"Package update available — run npm run gallery"* in CI, and the
  network copy is still used online.
- `manifest.webmanifest`, an original icon (a stylised "R>" console prompt in the site colour), 180/192/512 px PNGs.

## Tests (`.github/workflows/test.yml`)

- **Unit (Node 22):** `node --test tests/*.test.js`. Covers sharing (links, envelopes, CID parsing/verification,
  SDK SRI hashes), QR, `OutputBuffer`, `RClient` lifecycle with fake workers and timers, assets/CSP consistency, and
  the package-scan regexes.
- **R behaviour (webR in Node):** `tests/core.test.js` drives `src/r-core.js` against the pinned npm webR,
  as Python Online's tests drive Pyodide. Covers per-run reset, ordered output, auto-print, warnings,
  error line mapping, Program input via every masked reader, plot capture (SVG + PNG), the display helpers,
  t256 (with `tests/fixtures/256t/` as a fake server), and the protocol messages S1 depends on (this
  breaks loudly if a webR upgrade changes them). R-level unit tests in `tests/r/*.R` run through the same harness.
- **`npm run check`:** JS syntax, gallery fingerprints, docs freshness, offline manifest hashes.
- **Browser (Playwright 1.64.1, matrix chromium/firefox/webkit):** `tests/browser/all.cjs` from Python Online,
  adapted. Serves the app plus a local mirror of the pinned webR and cached packages. Covers: run, auto-run
  timeout, Stop, input echo, plots, HTML output, error annotations, share links (incl. `?run=0`), QR dialog,
  HashBin load (fixture SDK) and redirect save round-trip, mobile tabs at 375×812, offline reload,
  sandbox origin `null`, and with `FULL_GALLERY=1` every gallery URL. Failure screenshots are uploaded as artifacts.

## Phases

Each phase ends with tests passing locally, a commit and push to `main`, and a check of the deploy run/live page.

0. **Spike (decides S1 vs S2, graphics device).** Throwaway `spike/` page served locally: webR 0.6.0 inside
   `createSandbox()` in all three browsers, plus offline reload, Cairo `svg()`, and the startup `vfs` set. Write
   findings into this plan. *Gate: if only S2 works, ask before continuing.*
1. **Skeleton and deploy.** `deploy.yml`, `index.html` with the static UI from Python Online (R labels), Ace + `mode-r`,
   icons/manifest, licenses, README stub, `.gitignore`, `package.json` (webr 0.6.0, playwright pinned). After
   this push you **enable Settings → Pages → Source → GitHub Actions**, and I verify the page loads.
2. **Engine.** `r-core.js`, `r-worker.js`, `r-sandbox.js`, `r-client.js`, `runtime.R`: run, output, errors,
   auto-run/Stop/timeouts, package auto-install, Program input. Node core tests.
3. **Graphics and rich output.** Plot capture, `output-view.js` adaptation, display helpers, help pages,
   downloads (`main.R`, `output.txt`, SVG, PNG).
4. **Sharing, QR, HashBin.** Port `share-links.js`, `qr.js`, `hashbin.js`, `hashbin-panel.js` with the `r`
   envelope; empty client ID handling; is.gd shortener. Sharing unit tests.
5. **Mobile.** Tabs, More panel, touch sizes, pan/zoom; browser layout tests.
6. **Gallery and docs.** The non-256t samples, `render-gallery.mjs`, `gallery.html`, `docs/input.md`,
   `docs/graphics.md`, `render-docs.mjs`, docs links.
7. **256t.** `t256.R`, docs, four saved programs (published via the publisher client after you confirm the
   price), fixtures, the four 256t samples.
8. **Offline/PWA.** Service worker, `offline-assets.js`, `remote-hashes.json`, `package-hashes.json`, offline
   package button, offline browser test.
9. **CI and hardening.** `test.yml` with the three-browser matrix, full gallery run, `AGENTS.md`, final README,
   an accessibility pass (labels, focus, contrast), and a review of CSP and sandbox.
10. **HashBin client ID** (when you have it): meta tag, `npm run offline`, live save test.

## Licensing notes

- webR is MIT. R itself and the base packages are GPL-2 | GPL-3. Both are loaded unmodified from the pinned CDN,
  never redistributed from this repo. Packages keep their own licenses. The README credits R Core and the
  webR authors (Posit).
- This tool is unofficial and not affiliated with the R Foundation. It uses its own icon, not the R logo.
- Retained from the lineage: `LICENSE-graphvizonline`, `LICENSE-svg-pan-zoom`, `ace/LICENSE`,
  `vendor/LICENSE-lz-string`, the Nayuki MIT notice in `src/qr.js`, and the HashBin SDK's license header.
- `src/r/runtime.R` and `src/r/t256.R` are original code.

## Risks and open items

| Risk | Mitigation |
|---|---|
| S1 depends on webR's internal worker protocol | Pinned version; protocol test in CI; S2 as fallback (loses offline); a webR upgrade is a deliberate change. |
| Startup weight (~20 MB first visit, slower on phones) | Lazy `vfs` images; warm spare on desktop only; clear progress status; offline cache after first visit. |
| repo.r-wasm.org is unversioned, so gallery output can drift | `package-hashes.json` detects drift; previews regenerate in CI's gallery run; programs still work online. |
| `readline()` can't block (no SharedArrayBuffer) | Program input supplied up front, documented with samples; exhaustion hint. |
| Long installs (tidyverse-scale) exceed auto-run limit | The 5 s limit starts after installs; status shows install progress. |
| Shared `curtcox.github.io` origin | Opaque-origin sandbox, `ronline:` storage keys, `ronline-` cache prefix, hash-verified cache, confirm before replacing the stored program. |
| HashBin not registered yet | Ships empty; loads still work; Save explains why; phase 10 adds the ID. |

**Account setup steps only you can do:**

1. **Enable GitHub Pages:** Settings → Pages → Source → GitHub Actions (after phase 1).
2. **Register R Online on HashBin:** return URL `https://curtcox.github.io/R/`. Send me the client ID.
3. **Approve the four 256t sample saves** (phase 7). They spend your HashBin balance. I'll show you the
   exact price before publishing.

## Phase 0 findings — 2026-10-28

**Status: spike added; production implementation is waiting on a CSP decision.
The phase-0 exit gate has not passed in all three browsers.**

Reproducible harness and protocol notes: `spike/README.md`. Dependencies are
pinned in `package.json` / `package-lock.json`; the SDK is copied byte for byte
from Python Online `52ffb06`. No runtime binaries are committed.

| Check | Chromium | WebKit | Firefox |
|---|---|---|---|
| Exact CSP from this plan | Startup blocked by `EvalError` in dynamic linker | Startup blocked by `EvalError` in dynamic linker | Not reached: browser launch fails locally |
| S1 with diagnostic-only `unsafe-eval` | Pass | Pass | Not reached: browser launch fails locally |
| R prints `[1] 1` | Pass with diagnostic CSP | Pass with diagnostic CSP | Unverified |
| R-side `self.origin` | `null` with diagnostic CSP | `null` with diagnostic CSP | Unverified |
| Storage/script/worker APIs removed before R programs | Pass with diagnostic CSP | Pass with diagnostic CSP | Unverified |
| Cairo SVG + 1344×960 PNG | Pass with diagnostic CSP | Pass with diagnostic CSP | Unverified |
| SHA-256-verified cache, network disabled, reload + R run | Pass with diagnostic CSP | Pass with diagnostic CSP | Unverified |

1. **CSP conflict:** unmodified webR 0.6.0 evaluates JavaScript strings while
   dynamically linking `/usr/lib/R/library/webr/libs/webr.so`. Allowing only
   `wasm-unsafe-eval` is insufficient; this fails before user code runs. Adding
   `unsafe-eval` to the test server's page policy permits startup. This change
   also broadens the editor page's policy, although R remains in its opaque
   worker; it has **not** been approved or written into production markup.
   S2 would not avoid this inherited-policy issue.
2. **S1 protocol works:** initialize channel type `3`, wait for `resolve`, then
   satisfy the worker's pending `request/read` with UUID-matched `request`
   messages. `evalRRaw` and `readFile` round-trip successfully. The experiment
   neither nests workers nor evaluates R on the editor's main thread.
3. **Synchronous loading matters:** lazy filesystem images and dynamic libraries
   use synchronous XHR, including HEAD requests. Routing `fetch` alone is not
   enough. Prefetch the measured files through the SDK proxy, then answer those
   synchronous reads from memory. Arbitrary package/lazy-image support is still
   future work; the spike proves the basic startup/plot set only.
4. **Measured cache set:** `webr-worker.js`, `R.js`, `R.wasm`, `libRblas.so`,
   `libRlapack.so`, and the eight entries (including BLAS/LAPACK) recorded in
   `spike/runtime-files.json`. Total unique runtime size is **23,043,574 bytes**.
   The VFS files are translation DESCRIPTION, grDevices libs image + metadata,
   fonts.conf, fontconfig cache and NotoSans-Regular.ttf. The spike cache installs
   atomically and verifies SHA-256 both when filling and reading the cache.
5. **Graphics:** built-in Cairo `svg()` and `png()` work. The PNG signature and
   IHDR dimensions are checked; no svglite fallback is needed for this case.
6. **Hardening:** in addition to the global/prototype removals, remove webR's
   saved `Module.webr.channel.WorkerProxy`. Loader capabilities must stay in a
   closure because `webr::eval_js` can access top-level lexical bindings.
7. **Firefox test environment:** Playwright Firefox 1555 exits with
   `Could not find profile folder` before opening a page. A fresh pinned browser
   download and alternate profile/temp directories reproduce it. This is a local
   validation limit, not a finding about Firefox's support for S1.

Validation completed: three Node integrity/contract tests; Chromium and WebKit
strict-policy failure regression checks; Chromium and WebKit diagnostic-policy
R/graphics/hardening/offline browser checks. The full editor, gallery, sharing,
256t, production PWA and deployment phases remain unimplemented. No account setup
or paid saves have been attempted.


## Approved implementation adjustments — 2026-10-28

- The user approved adding `unsafe-eval` and continuing S1. This resolves the CSP
  startup conflict above; opaque-origin isolation and scriptless output remain.
- Base VFS access is synchronous. The app loads the measured ~23 MB startup set,
  then prefetches the remaining base filesystem through the verified SDK proxy
  before running user R. The complete runtime is about 45 MB. This ensures all
  base R/filesystem/help paths work offline, at the cost of a larger first run.
- PostMessage also cannot await `crypto.subtle` from synchronous R calls. Dynamic
  `t256$text()`/`cid()` use vendored MIT js-sha512 0.9.0 in the sandbox; tests compare
  its UTF-8/boundary vectors with Node and WebCrypto SHA-512. Parameter AST validation
  and content-ID verification remain mandatory.
- The four gallery saved documents are <=64-byte inline CIDs, checked in as exact
  sources/fixtures. They require no paid publication. No paid saves were attempted;
  longer published samples remain an optional account-dependent follow-up.

## Implementation record — 2026-10-28

Phases 1–9 are implemented in this checkout: the editor, S1 engine, R runtime,
input/error/graphics/help/rich output, sharing/QR/HashBin integration, mobile UI,
32 executed gallery programs, generated docs/previews, inline-CID 256t samples,
verified offline/PWA assets and optional packages, and the independent CI matrix.

Local validation at the first implementation commit: 34 Node tests passed;
`npm run check` passed; all 32 gallery sources ran under webR in Node and Chromium;
WebKit passed the full editor/gallery suite, including the fixture HashBin
approve/cancel/redirect flow and offline reload. The local Firefox installation
still fails before opening a page; the Linux CI matrix will validate Firefox.
Pages is already configured with `build_type: workflow` for this repo.

Phase 10 still needs the user's registered public HashBin client ID. The meta tag
is intentionally empty and loading/compressed sharing remain functional. No
HashBin credentials or paid sample saves were used. Deployment success and the
three-browser CI result must be checked after the push before final handoff.

### Follow-up hardening and production check

- The first Pages deployment succeeded, and a production Chromium smoke test
  passed the default plot, R-side origin `null`, input echo and offline reload
  against the actual pinned CDN.
- Linux CI passed Chromium and Firefox, including all 32 gallery URLs. WebKit's
  initial CI failure was a redirect-test race: it could read the old document's
  saved status. The test now waits for the new document before assertions; local
  WebKit passes the corrected flow.
- Added exact blank-line preservation, scan nmax/nlines unread-input tests,
  multi-panel/explicit-device-close capture, and dimension checks. Warnings and
  errors use stderr. There are now 37 passing Node tests and current asset/docs
  checks.
- Verified 256t content is shared across worker replacement within a page; browser
  tests assert a remote document is fetched once across Stop. Offline package
  tests install/run jsonlite with the network disabled.
- Package pins cover only selected archives. A 13 KB gallery-only DCF index ships
  with the app as an offline fallback; unrelated updates in the full upstream
  PACKAGES index do not invalidate CI. Arbitrary online packages use the live
  index. `npm run gallery` refreshes upstream package bytes; `--cached` supports
  deliberate local regeneration using existing bytes.
- Mandelbrot's preview shrank from 8.6 MB to about 40 KB by using R's raster-backed
  SVG image support. All gallery previews total about 708 KB. Added keyboard tabs,
  40-pixel labeled plot controls, visible mobile update controls and stronger hint
  contrast. The final push and CI/deploy verification follow these changes.
