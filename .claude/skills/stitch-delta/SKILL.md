---
name: stitch-delta
description: >
  Refreshes the Atlas deep dive document so it describes the application as it is NOW. Runs on the
  BASE branch after every [STORY] PR merges into it (a story stitch — the deep dive stays current
  while an epic is still open, so a parallel or next epic never designs against missing code) and
  after the cycle's [EPIC]/[BUG]/[ENH] PR merges (a cycle stitch) — the merge is what makes the code
  available as ground truth. A story stitch writes only Atlas and the deep dive's "Synced to" line (no
  ledger row, no PR; its audit goes to the story's own fragment). A cycle stitch reads each pending
  delta from its cycle archive (aire-archives/<type>/<ID>-<slug>/spec/plans/delta/…). Either way it performs a FULL-DOCUMENT
  refresh: every section of the deep dive is decided against the merged tree — refreshed, kept only
  on positive re-verification, or resolved/removed — and the complete body is written back to the
  same Atlas document. It is NOT limited to the sections the delta happens to name. Appends one row
  per delta to aire-archives/stitch-ledger.md; that append-only ledger plus a header stitch marker
  are two independent guards against publishing the same cycle twice. A cycle stitch's whole
  repository footprint is the ledger row plus archived audit entries, raised as a stitch-delta/<name>
  PR into base — it never commits to base directly and never touches spec/, src/ or tests/.
when_to_use: >
  Trigger when the user says: "stitch-delta", "stitch the delta", "stitch deltas",
  "apply pending deltas", "refresh the deep dive", "update the deep dive on Atlas",
  "publish the cycle delta to Atlas", "post-merge stitch", "stitch the story".
allowed-tools: Read Grep Glob Bash Write Edit
---

# Stitch Delta — Refresh the Atlas Deep Dive to the Current Face of the Application

Load `aire-workflow/agents/stitch-delta-agent.md` and follow it exactly.
