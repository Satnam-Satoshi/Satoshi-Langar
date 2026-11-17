# Executable synthetic editorial smoke

Run from this package:

```
npm run smoke:editorial
```

This command accepts **synthetic mode only**, never production configuration, provider credentials, source URLs or user approval files. `npm start` remains unchanged and disabled. The dedicated smoke/ directory is copied into the final image, so the same explicit command works there without packaging the general test suite. Python 3 with ReportLab/Pillow/DejaVu must already be installed as specified by the reviewed container recipe; the smoke does not install anything.

## What actually runs

1. The real collector/parser receives a fixed synthetic HTML source through an in-process fake transport. All other registered sources remain explicitly unavailable. Original fixture event/retrieval dates and exact evidence bytes are retained.
2. Test-only independent review inputs bind the synthetic statement to those bytes. They are labeled synthetic and cannot approve real news. Selected-fact policy checks do not mean whole-ecosystem coverage.
3. The actual consumer Firestore SDK wrapper reserves and accepts an existing synthetic canonical event; the actual worker/journal claims it. All store/provider operations use fake SDK/HTTP implementations, not accounts.
4. `prepareEditorialFromCollection` runs without retrieval, and the existing Python renderer produces a real PDF, HTML reader, 1080×1350 cover and 1200×630 promo. Original renderer manifest bytes are retained separately as `renderer-provenance.json`, including renderer/font/runtime hashes.
5. `createEditorialWorkerRuntime` reopens exact files with type/path/size/hash checks and builds the separate canonical worker manifest. It composes the concrete Drive artifact store, upload/read-only adapters and durable journal against the fake provider. Five artifacts, worker manifest and private descriptor are distinct objects. The original render manifest is not substituted for the worker manifest.
6. The fake Firestore rows and fake provider's actual bytes/metadata are written to a private temporary directory. A fresh Node process reloads them, performs a read-only worker/store reconciliation and re-verifies every artifact byte. It must not rerender, upload or mutate fixture state. The manifest digest must match.

Output is a small **synthetic-only** report with temporary directory, manifest digest, artifact counts and restart observations. Real generated draft files remain beneath the temporary output directory for inspection. Local fake persistence is not proof of real Firestore/Drive durability, ownership or IAM. A missing or corrupt retained state holds rather than bootstrapping or rerendering.

## Callable dormant composition

`createEditorialWorkerRuntime({worker,editorial,workRoot,artifactStoreConfig,enabled:false})` returns `advance`, `reconcile` and bounded diagnostics. It installs the concrete local preparation callback itself; caller-supplied `prepare` is rejected. The artifact store is instantiated internally with exact run/event/source/capture/manifest binding. No arbitrary “prepared:true” or metadata-only archive acknowledgment can replace actual renderer output and rawbyte readback.

The runtime remains a draft preparation/archive pipeline, not a publisher. It does not perform visual QA, establish semantic truth, approve source reviews, obtain runtime/build provenance, configure credentials, provision services, initialize production state, send subscribers an edition or publish social/site changes. Those independent boundaries remain required. Unknown preparation/upload outcomes stay held and are never automatically retried under a new render hash.

The integration test runs through the same smoke implementation. In a container test target with `RUN --network=none`, it still needs no provider network. All synthetic approval/identity observations are fixtures, not operational authorization.

The final archive readback is followed by a finite-clock check against any carried evidenceExpiresAt. Crossing that deadline yields prepared-observed-stale / expired-during-archive-readback with no retry authorization; an invalid clock holds. Existing bytes and work history are retained. Fresh artifact availability alone never refreshes source evidence.
