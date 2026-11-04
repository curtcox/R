# Fragment Kit migration

The shared browser tools are replaced by a published Fragment Kit pin. R retains
its schema, stdin/autorun fields, legacy writer, t256 bridge, real webR renderer,
output sanitization and independent immutable v0.3.0 execution sandbox. Publish
uses the kit's v0.4.0 SDK and the registered client ID remains empty.

The main `ronline-` precache includes the complete pinned base runtime. Optional
packages use a separate `ronline-packages-v1` cache and do not count as Available
offline. Spike caches survive activation. All package bytes are verified before
caching; a rebuilt package can run online without being cached as the old pin.

Local unit/corpus, shared contracts, real-engine isolation/t256, offline base and
package rendering, URL/draft recovery and full-gallery checks are being verified.
This branch is not merged or deployed. All three engines must pass in PR CI.
After merge, verify five corpus links, CID, QR, offline reload and phone layout at
the live recovery origin and the canonical origin where it is deployed.
