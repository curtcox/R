# Fragment Kit migration

The shared browser tools are replaced by a published Fragment Kit pin. R retains
its schema, stdin/autorun fields, legacy writer, t256 bridge, real webR renderer,
output sanitization and independent immutable v0.3.0 execution sandbox. Publish
uses the kit's v0.4.0 SDK. The registered public app ID is retained; its return
URL is exactly https://r.hashbin.page/.

The main `ronline-` precache includes the complete pinned base runtime. Optional
packages use a separate `ronline-packages-v1` cache and do not count as Available
offline. Spike caches survive activation. All package bytes are verified before
caching; a rebuilt package can run online without being cached as the old pin.

The initial shared-tools migration shipped before this AI adoption. Actual
AI rollout status is recorded separately in the dated acceptance evidence.
All three engines must pass in PR CI, followed by live recovery and canonical
checks of source identity, CID/QR, offline reload, review and phone layout.

## Optional AI support

R pins the published Fragment Kit 0.4.3, while keeping the previous kit and
immutable 0.3.0 execution SDK/cache bytes. The R interpreter and its isolation
remain app-owned. Ask supports paste handoff, user-connected providers,
review, rejection, refinement, undo and local comparison. Gallery metadata
suggestions supplement ordinary text and tag search.

The exact canonical origin uses `https://ai.hashbin.page/v0.4.3/`, separately
allowlisted for R only. Python keeps its 0.4.0 host entry and Python-only policy.
GitHub recovery uses direct mode; unknown deployments use paste only. Keys stay
in host-origin memory/storage or direct-mode memory and never in editor storage.
Spending caps start at zero and destinations require explicit consent.

Acceptance changes only source and input, keeps the document autorun setting,
stops current execution and requires Run. Shared links after acceptance include
`run=0`. The same restrictions apply to undo and model comparison proposals.
The 25 synthetic cases in `ai-suite.json` use passing and failing references
checked by real webR in fresh opaque sandboxes. Output is limited to 64 KiB,
setup to 30 seconds, and automatic execution to five seconds after packages.
Input checks include the editor's documented input echo behavior. No model call
or weight download occurs when opening a link. The AI suite and UI are available
offline; paid providers still need connectivity.

This describes source behavior. Actual deployment, browser results and any paid
comparison receipts are recorded in `todo/ai_acceptance.json`. WebKit coverage
is not native Safari; GPU and additional-provider coverage remain separate.
