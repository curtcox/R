# Phase 0: single-worker webR spike

This is a diagnostic harness, not the R Online editor. It deliberately keeps the
master plan's CSP in the checked-in HTML. That policy currently prevents webR
0.6.0 from starting: the Emscripten dynamic linker evaluates JavaScript strings
when loading `webr.so`. `wasm-unsafe-eval` alone does not permit that operation.

The local test server can add `unsafe-eval` **only for a diagnostic run**, using
`DIAGNOSTIC_EVAL=1`. This does not change the checked-in HTML or approve that
policy for production. It broadens the page's JavaScript CSP, even though R still
runs in the opaque worker. A production policy decision is required before the
editor implementation continues.

## Reproduce

```
npm ci
npx playwright install chromium firefox webkit
npm run spike:manifest
npm run test:spike
DIAGNOSTIC_EVAL=1 npm run test:spike
```

`BROWSER=chromium`, `firefox`, or `webkit` selects one browser. The default tests
all three. Default-policy tests expect and assert the startup CSP failure; they
do **not** claim that the phase-0 exit criteria pass. Diagnostic-policy tests
assert actual R execution, origin `null`, removal of storage and worker APIs,
SVG/PNG generation, and reload with the browser network disabled. The server
always closes and each browser is disposed when a test fails. Raw event logs go
to ignored `test-results/spike-{strict,diagnostic}-<browser>.json`.

The test server serves the pinned npm package as a local CDN. The SDK is copied
byte for byte from Python Online revision `52ffb06`; its license header is kept.
No webR binaries are committed. Never deploy `node_modules/` or test caches.

## Adapter

`worker.js` runs immediately before the unmodified `webr-worker.js` in the SDK's
classic opaque-origin worker. It emulates webR's PostMessage main endpoint:

1. Send `init` with channel type `3`.
2. Wait for `resolve` and the worker's `request/read`.
3. Resolve that read with a `request` carrying `evalRRaw` or `readFile`.
4. Match the worker's payload responses by UUID.

No nested worker or main-thread R execution is used. The adapter keeps its loader
capabilities in a closure. After initialization it removes inherited storage,
script-loader and worker APIs, and webR's saved `WorkerProxy` constructor, before
evaluating R code. This is a spike, not a completed security audit.

webR's VFS and dynamic linker also use **synchronous XMLHttpRequest**. Those
cannot await the SDK's fetch proxy on the same worker. `runtime-files.json`
records the measured minimal startup/basic-Cairo dependency set. The adapter
prefetches these through the SDK proxy and answers synchronous requests from
memory. Other URLs retain ordinary XHR behavior; supporting arbitrary package
files and all lazy VFS images offline still needs deliberate implementation.

The verified runtime cache is 23,043,574 bytes (about 22 MiB) including
`webr-worker.js`, `R.js`, `R.wasm`, BLAS/LAPACK, graphics metadata/image,
translation metadata, font configuration/cache and Noto Sans Regular.
`service-worker.js` installs that set atomically, verifies SHA-256 on installation
and reads, controls only `/spike/`, and uses only `ronline-spike-` caches. The
diagnostic test server recomputes the HTML hash for its test-only CSP change.

Cairo's built-in `svg()` and `png()` both work. The test retrieves the SVG and
PNG bytes through webR's filesystem protocol; svglite is unnecessary for the
basic graphics case. It also proves `webr::eval_js("self.origin")` returns `null`.
