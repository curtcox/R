# R Online

Static GitHub Pages R editor at https://curtcox.github.io/R/. No build step or
server-side execution. Work directly on main and use the existing deploy workflow.
The plan is todo/master_plan.md; update its implementation record when decisions change.

## Contracts

- Pin webR and npm webr to 0.6.0 (R 4.6.0). Use the S1 adapter in src/r-worker.js
  with the unmodified pinned webr-worker.js. R runs only inside the immutable
  HashBin SDK v0.3.0 createSandbox opaque-origin iframe/worker. Never execute R on
  the editor thread or create a page-origin worker. Keep all loader capabilities
  in closures; R's eval_js can inspect global lexical bindings. Remove inherited
  storage/script/worker APIs and Module.webr.channel.WorkerProxy before programs.
- The user explicitly approved adding CSP unsafe-eval on 2026-10-28 because webR's
  dynamic linker requires it. Keep the bootstrap hash, blob worker policy and
  wasm policy. This approval does not relax opaque-origin isolation or output CSP.
- Text uses text nodes. HTML/Markdown/help use empty-sandbox scriptless iframes
  with default-src none. User SVG is an inert image. Only our QR and image wrapper
  create inline SVG. Do not inject arbitrary user SVG/HTML into the editor DOM.
- Auto-run debounce is 750 ms; its 5-second limit starts after package loading.
  Manual runs have only a 60-second reminder and always offer Stop. Terminate
  busy superseded workers and ignore stale worker events. Low-memory/mobile
  devices restart lazily; desktop keeps a startup-ready spare.
- R helpers live in src/r/runtime.R and src/r/t256.R. Reset globals, options,
  random seed, cwd, devices and attached packages each run. Program input starts
  over each run; unqualified readers consume/echo it. Installed packages persist
  until worker replacement. scan nlines reserves input for subsequent readers.
- Share source + stdin + autorun together. Storage keys use ronline:. Incoming
  links must confirm before replacing different stored work. Envelope type is r,
  with r:{stdin,autorun}; document limit is 5 MiB. The public inspection surface is
  ROnline. Save uses SDK publish synchronously from a click, never OAuth tokens.
- hashbin-client-id is intentionally empty. Register R Online with return URL
  exactly https://curtcox.github.io/R/ before adding the supplied public ID.
  No paid documents have been published. Gallery saved documents use inline CIDs.
  Larger paid saves require showing the exact price and user approval first.
- The HashBin SDK/cache files are immutable byte-for-byte v0.3.0 copies from
  Python Online 52ffb06. Sharing tests pin their release SRI. Keep all licenses.
- The service worker uses ronline- caches and project scope. Verify SHA-256 before
  storing/serving cached bytes and on initial runtime fetches. Runtime hashes come
  from pinned npm files. Optional gallery packages use scripts/package-hashes.json.
  Unversioned arbitrary packages remain network-only. A rebuilt pinned package
  must fail CI verification with the package-update message; online execution can
  use it without caching mismatched bytes. Never cache unrelated origin assets.
- Synchronous VFS reads cannot await the SDK proxy. Startup preloads ~23 MB; the
  remaining base-R filesystem is prefetched through the proxy before execution.
  The complete base runtime is roughly 45 MB. Do not quietly drop offline support.
- webR's PostMessage R bridge cannot await crypto.subtle. Dynamic 256t calls use
  vendored MIT synchronous SHA-512; test against Node/WebCrypto vectors. Parameters
  are validated R syntax trees and never evaluated as arbitrary R expressions.
- Mobile <=760 px width or <=500 px height has Output/Code/Input tabs, More controls,
  >=40 px buttons and >=16 px input text. Preserve accessibility labels and focus.

## Validation and publishing

1. Edit examples in examples/*.R and src/examples.js together.
2. npm run gallery executes real pinned webR, writes previews/fingerprints, and
   pins gallery packages. npm run packages -- --verify downloads/checks exact
   pinned files without changing the package manifest. .webr-cache is ignored.
3. npm run docs regenerates docs/*.html after Markdown changes.
4. npm run offline regenerates all shipped hashes after asset changes.
5. npm test, npm run check, and relevant npm run test:browser checks. BROWSER selects
   chromium/firefox/webkit; FULL_GALLERY=1 executes every gallery URL. Browser CI
   runs all three independently from deployment. Do not claim Firefox passed when
   its local build fails before opening a page; verify the Linux CI result.
6. Keep .github/workflows/deploy.yml unchanged from Python Online. It uploads the
   root after a main push with no build step. Do not commit node_modules or caches.
   Check workflow/live page before claiming deployment. HashBin registration is
   a user setup step. Do not invent a client ID or spend the user's HashBin balance.
