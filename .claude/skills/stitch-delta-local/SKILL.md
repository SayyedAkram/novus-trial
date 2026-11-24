---
name: stitch-delta-local
description: >
  For cycles that chose option B at the Helix connect gate (reverse-engineering docs generated
  locally, no Atlas). Runs on the BASE branch after every [STORY] PR merges into it (a story stitch —
  the docs stay current while an epic is still open) and after the cycle's [EPIC]/[BUG]/[ENH] PR
  merges (a cycle stitch, which also reads each pending delta from its cycle archive), and performs a
  full refresh of the local RE doc set against the merged code. The doc set lives in one base-only home,
  aire-archives/local-re/spec/plans/, so the next cycle copies it into spec/plans/ and skips reverse
  engineering. It is the only writer of that home and runs one at a time through a
  stitch-delta-local/<name> PR, so parallel cycles never conflict. It never touches spec/, src/,
  tests/ or Atlas.
when_to_use: >
  Trigger when the user says: "stitch-delta-local", "stitch the delta locally", "refresh the local
  RE docs", "stitch local reverse engineering", "post-merge stitch without Atlas", "stitch the story
  locally".
allowed-tools: Read Grep Glob Bash Write Edit
---

# Stitch Delta Local — Refresh the Locally Generated RE Docs

Load `aire-workflow/agents/stitch-delta-local-agent.md` and follow it exactly.
