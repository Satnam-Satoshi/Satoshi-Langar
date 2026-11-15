# Same-publisher read-only receipt recovery (local only)

`createReceiptLookup` provides lookup() only. No creation, update, sharing, deletion,
ledger, workflow or artifact operation is exposed. It uses the existing publisher
OAuth identity and drive.file grant. OAuth refresh is a token-endpoint POST; all
Drive and Docs resource requests are fixed GETs. No scope expansion.

Query is restricted to the authorized folder and exact app-private bootstrap
marker, including trashed matches so they cannot silently disappear from duplicate
checks. Search must finish within five pages and two minutes; incomplete/missing
completeness, repeated tokens/IDs and more than one match fail closed. A single
candidate gets separate metadata, owner-only permission and blank native-document
revision/content readback. Used/nonblank documents require a separately reviewed
record-schema verifier, not this bootstrap-only lookup. These are bounded
point-in-time observations, not continuous privacy protection or global uniqueness
proof. A moved, deleted or newly hidden file can yield zero; zero never proves no
create occurred and never authorizes another create.

Google supports parent/appProperties search and requires attention to pagination
and incompleteSearch. App-private marker visibility depends on using the same
requesting application, so generic Drive connector results alone do not replace
this check.
https://developers.google.com/workspace/drive/api/guides/search-files
https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list

## Private result retrieval and retention boundary

Successful result returns document ID, current Docs revision and marker privately
in process memory; only receiptLookupPublicStatus may enter shared/public runner
logs. No public artifact or ID-bearing logs. The existing marked Google document
is the durable target and can be rediscovered after runner loss by rerunning this
READ-ONLY lookup, without repeating creation or adding a service.

This alone does not deliver its ID to an external controller once a GitHub runner
ends. A runner-temp JSON file is ephemeral; do not claim it is durable retrieval.
For use inside the same approved cloud job, pass the private lookup result directly
to the separately authorized consumer (not stdout or artifacts). For post-run
operator access, run lookup through a private cloud execution/tool channel with
that existing publisher identity and deliver its private result there. That channel
is NOT provisioned by this patch; existing workflow-secret access cannot be assumed
to expose credentials safely to another computer.

If the only available execution surface remains public GitHub run logs, the
remaining concrete choice is a separately approved private checkpoint into the
existing receipt document (same Google service), with authenticated readback via
an authorized private connector. That would be an additional Docs mutation and a
nonblank receipt schema, neither implemented nor authorized by this read-only
module. Do not silently add that write or imply a new durable outcome history.
Lookup recovers a currently verified target, not historical exactly-once proof.

No live OAuth, query, create, workflow installation or private delivery occurred.
