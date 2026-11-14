# Private receipt bootstrap: local draft only

A fixed CLI and uninstalled workflow template now accompany the fixed-endpoint
transport draft. No credentials are included. Tests use mock fetch only; it has never been invoked
with live OAuth or provider access. The selected bounded admission is implemented locally; durable atomic admission
is a separate unimplemented stronger mode, not the selected mode prerequisite.

Google's create-file guide explicitly excludes native Workspace documents from
pre-generated IDs (except folders/drive-sdk). Therefore this draft never calls
generateIds or provides an id in the create body:
https://developers.google.com/workspace/drive/api/guides/create-file

Required production prerequisites:
- Exact private folder, expected owner permission ID and stable bootstrap key
  configured in protected workflow data, not a public repository or chat.
- Existing publisher OAuth client/refresh identity and existing drive.file scope.
  A generic Drive connector is not equivalent authority. Never export credentials.
- For the OPTIONAL strong API only: an independently durable, atomic reservation keyed to this one bootstrap,
  established BEFORE creation, surviving job loss/reruns and refusing subsequent
  attempts. The new document cannot bootstrap its own prior reservation. Current
  code supplies only a required capability interface, not that durable backend.
- The reviewed fixed Drive files.create transport for the exact native-document metadata,
  zero retries, final synchronous callback after OAuth/privacy waits; no sharing,
  moving, deletion, ledger mutation or deploy credentials. Bounded responses and
  sanitized transport errors. The folder/permission reader must read all fields
  and reject pagination or any extra permission, using this publisher identity.
- A fresh selected-resource readback must prove returned id, owner-only privacy,
  sole parent, MIME and exact appProperties bootstrap marker. Reservation/outcome
  retention must be independently reviewable privately after runner loss.

Lost acknowledgment leaves UNKNOWN with no retry. A separately reviewed read-only
lookup by exact parent/marker may locate a candidate; it must fully verify the
candidate and reject multiple matches. Zero results never proves non-creation.
No lookup or retry is implemented here. Folder privacy can change externally;
these checks are not a continuous all-writer barrier or a permanent privacy claim.
This bootstrap does not resolve the publication lease or authorize retirement.


Selected mode uses createBoundedInvocationReceiptBootstrap with authenticated
immutable pin/run/job reads and explicit oneInvocationAdmission. It reports
exactlyOnceGuaranteed:false. Credential-free fixed-main discovery and private
config assembly precede the sole Google-bearing creation step. All remain local
until reviewed source hashes, private variables and workflow are installed. This
mode trusts authorized main writers and never retries unknown outcomes. It does
not require the optional strong API's new atomic reservation backend.
