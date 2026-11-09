# Ask for an R change

Open **Ask**, describe a source or input change and choose a model. Paste handoff
works without an account: prepare/copy the prompt, use your preferred chat and
paste its JSON reply. Connected providers require explicit destination consent
and spending caps; caps start at zero. The canonical editor connects through
the separate AI host. The recovery copy uses keys in memory and disconnects on
reload. No key is stored on the editor origin.

Review the text diff before **Accept change**. Acceptance and undo stop current
execution, retain the document's Auto-run preference and wait for **Run**.
Changing the Auto-run checkbox does not bypass that hold. Editing continues
through normal drafts and share links. Navigation invalidates old proposals.
An incoming link never calls a model or downloads model weights.

The gallery keeps ordinary text/tag filtering and offers optional model
suggestions from sample metadata. Model suggestions do not open programs or
run code on their own.

**Compare models** evaluates the 25 synthetic cases in the
[suite](../ai-suite.json). Every good and bad reference is checked by real
webR 0.6.0 / R 4.6.0 in a fresh opaque sandbox. Output is limited to 64 KiB,
setup to 30 seconds, and execution to the existing five-second auto-run limit.
Input tests include the editor's documented echo behavior. Your own saved cases
stay local and are excluded from exports by default.

## Recorded comparison

A manual Chromium run on 2026-11-09 UTC recorded 75 synthetic results, one per
case/model, with a 512-token output limit. The total model cost was $0.0268728.

| Model | Successful checks | Valid replies | Model cost |
| --- | --- | --- | --- |
| GPT-4.1 (2025-04-14) | 25/25 | 25/25 | $0.021344 |
| GPT-4.1 mini (2025-04-14) | 24/25 | 25/25 | $0.0040432 |
| GPT-4o mini (2024-07-18) | 18/25 | 24/25 | $0.0014856 |

The [report](../ai-comparison.json) contains success checks, Wilson intervals,
cost and latency separately. No overall winner is supported. This small
synthetic run is self-reported evidence, not a promise about your documents.
It used OpenAI; native Safari, GPU, on-device comparisons and other providers
remain unverified for R. No R report or suite was uploaded to HashBin.

Actual deployment and browser receipts are maintained in
[Fragment Kit's R rollout record](https://github.com/curtcox/Tools-for-pages-with-state-in-URL-fragments/blob/main/todo/r_ai_acceptance.json).
