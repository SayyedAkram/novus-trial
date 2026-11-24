---
name: archive-epic
description: >
  Closes an epic's, bug's, OR enhancement's release cycle. Generates the cycle's
  reverse-engineering delta into spec/plans/delta/<CYCLE-ID>-<slug>/ (a change record: what shipped,
  with path-level evidence, plus the problems it resolved), then
  archives the complete spec/ + reports/ + runtime-artifacts/ (including audit.md and aire-state.md)
  into aire-archives/epics/<EPIC-ID>-<name>/ (epic cycles), aire-archives/bugs/<BUG-ID>-<name>/
  (bug cycles), or aire-archives/enhancements/<ENH-ID>-<name>/ (enhancement cycles), per the
  Workflow Type recorded in runtime-artifacts/aire-state.md, at the workspace root. It then REMOVES the
  live spec/, reports/ and runtime-artifacts/ trees in full (context-project/ included) — the archive is
  the only copy, and the next cycle rebuilds spec/ from Atlas truth. It NEVER stitches the delta and
  never writes the stitch ledger: publishing to Atlas belongs to the stitch-delta skill, which runs on
  the base branch after this cycle's PR merges and reads the delta out of this archive. Its readiness
  gates are all upstream of the archive; once the archive verifies, the removal, commit, push and PR
  are automatic and ask nothing.
when_to_use: >
  Trigger when the user says: "archive-epic", "archive the epic", "close the release
  cycle", "archive aire docs", "end of release archive", "wrap up this epic", "release archive".
allowed-tools: Read Grep Glob Bash Write Edit
---

# Archive Epic — Release Archive

Load `aire-workflow/agents/archive-epic-agent.md` and follow it exactly.
