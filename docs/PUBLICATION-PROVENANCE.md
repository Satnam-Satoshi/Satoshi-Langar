# Publication Provenance Standard — Draft

Every Lunch Time Conversations edition should preserve the same canonical content across Markdown, HTML, PDF, print, Git archive, and future decentralized archives.

## Canonical source
Markdown + source metadata in Git.

## Required provenance fields
- edition_id
- title
- publication_timestamp
- effective_time_window
- content_hash
- source_manifest_hash
- pdf_hash
- canonical_git_commit
- correction_version
- correction_history
- editor_status
- confidence_summary

## Source manifest
Each factual item should identify source, source type, retrieval time, effective time, confidence, and any known contradiction or limitation.

## Future archives
IPFS, Nostr, or Bitcoin inscription may mirror a verified edition later. No decentralized archive is the only copy, and no Bitcoin inscription or fee spend occurs without explicit Founder approval.
