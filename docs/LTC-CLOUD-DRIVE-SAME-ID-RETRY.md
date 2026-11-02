# Bounded same-ID Drive evidence uploads — review proposal

This changes the reviewed upload policy and requires explicit owner approval and a new accepted implementation pin. It does not authorize replay of the existing fence-14 UNKNOWN upload, retire a lease, or enable publication.

The observed failure was HTTP 502 during an upload POST. A later exact-ID read returned 404, which remains UNKNOWN. The evidence does not establish a timeout or whether Drive committed that request.

Google's [official upload guide, pre-generated ID section](https://developers.google.com/workspace/drive/api/guides/manage-uploads#use_a_pre-generated_id_to_upload_files) supports retrying indeterminate creates with the same pre-generated ID. If a previous create succeeded, another create with that ID conflicts rather than creating a duplicate. This provider uploads binary application/json files, without Google Workspace conversion. The multipart body remains below the existing package limit.

## Fixed policy

- At most three HTTP create attempts, with one captured immutable multipart string, identical metadata, operation hash, bytes and preallocated file ID. No replacement IDs, overwrites, deletes or permission changes.
- Additional creates are available only when a caller supplies the live durable authorization guard. Legacy and finite callers without that guard retain one create attempt.
- Only upload POST transport failures/timeouts and HTTP 500, 502, 503 or 504 qualify. HTTP 429, authentication failures and other client/server statuses do not authorize another create.
- Before another POST, perform exact-known-ID readback, bounded polling, backoff (one then two seconds), and another exact-ID read. A valid existing file ends the operation successfully. Read exceptions at the final pre-create check hold UNKNOWN; only an absent known file permits the guarded same-ID attempt.
- HTTP 409 is never success by itself. Exact owner-only ACL, parent, operation markers, payload hash, content hash, length and downloaded bytes must verify.
- An acknowledged successful create never causes another POST. Temporary readback failure can use bounded GET-only polling. Missing or unavailable proof stays UNKNOWN. Ownership, parent, authorization and integrity mismatches stop.

Each outcome has at most three readback rounds; each possible additional POST has one extra readback after backoff. The hard upper bound is eleven complete download-verification calls across three create attempts, with at most five GETs per complete verification. Existing individual request deadlines remain unchanged (60 seconds for create, 15 seconds for reads). No loop is unbounded.

## Durable authorization

After token acquisition, immediately before starting the HTTP request, production checks before every create that the exact run/fence still owns an unexpired lease, paused and restoreHold are false, and the same intent remains UNCERTAIN with the exact operation/payload/file/folder. It also checks captured generation and quarantine/retirement bindings and rejects banned lineage. The check only reads state: it does not extend the lease or authorize an uncertain operation again. The summary provider uses this same check after Git advancement without requiring the previous source head to remain current.

A later invocation of the coordinator cannot replay an UNKNOWN intent. This bounded in-flight policy is not a recovery command for the existing incident.

## Evidence and limits

Sanitized diagnostics retain only the fixed provider/phase/reason/status/timeout/POST-attempted projection already carried to the private receipt and sanitized runner output. No response body, URL, credential, raw error or new private identifier is emitted. A recovered request may retain its earlier failure diagnostic; the verified durable outcome determines success.

Offline tests cover late commits, 409 with and without proof, all allowed statuses, exhaustion, unsupported/auth statuses, immutable bodies, changed configuration/payload/bindings, lease expiry, successful-create readback polling, one-create default and summary checks after source advancement. These tests establish the control contract, not acceptance of a real cloud retry or the cause of earlier incidents.
