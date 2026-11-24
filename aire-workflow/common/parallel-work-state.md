# Parallel Work State — Per-Story Audit and State Fragments

**Purpose**: let several developers (and the ve) work on different stories of the same epic in
parallel without ever conflicting on the framework's own bookkeeping files. Every run that works on
a single story writes its audit trail and its state into its own files, keyed by the story: one
file set per story, merged by readers, folded back at cycle close. The shared
`runtime-artifacts/audit.md` and `runtime-artifacts/aire-state.md` are written only by runs that work
on the docs branch itself (the epic branch, or a bug/enhancement branch).

On an epic cycle every document lives on the epic branch and a story run reaches it through the docs
worktree `.aire-docs/` (`common/branching-strategy.md` Section 4) — so a `[STORY]` PR, which merges into
the development branch, carries code and unit tests only and never a bookkeeping file.

---

## 1. Why `.gitattributes` `merge=union` is not enough

| Problem | Effect |
|---|---|
| `aire-state.md` rows are **edited in place** (a Story Tracker row changes Status, PR, Merged, Recorded) | `merge=union` keeps **both** versions of a changed line — two contradictory rows for the same story, with **no conflict marker**. Silent state corruption. |
| A server-side PR merge (GitHub or Azure Repos) **does not run `merge=` drivers** | A story PR that touched `audit.md` or `aire-state.md` still shows a conflict in the PR; the union driver only helps when someone merges locally. |
| `audit.md` entries from two branches | Union concatenates the two sides' hunks — entries land out of chronological order. |
| Every story PR touching the same two files | Forces merge/rebase churn on every parallel PR, even when the code is unrelated. |

With the fragments below and the docs worktree, a story PR never touches a bookkeeping file at all,
and the epic branch receives each story's fragment as a separate, disjoint path — so none of these can
happen. Every story's files are disjoint from every other story's by construction.

---

## 2. Two kinds of writer

| Writer | Where it commits | Writes to |
|---|---|---|
| **Docs-branch writers** — Workspace Detection through the STOP checkpoint (planning, design; an epic cycle's test plans go through the `[TEST]` PR, `common/branching-strategy.md` Section 7.2), `bug-fix.md` analysis and `enhancement-implement.md` Phase A (before the Verification Engineer handoff), `ve-list-work`, `raise-defect` (the linked story's row), the `epic-enhancement` spec-only path, `archive-epic` | The docs branch itself (epic / bug / enhancement branch), directly or through `.aire-docs/` | The **shared** `runtime-artifacts/audit.md` and `runtime-artifacts/aire-state.md` |
| **Story writers** — `dev-implement` (from the story being chosen), `epic-enhancement` / `epic-bugfix` / `epic-change-request` build path, `pr-fix`, `bug-fix-implement`, `enhancement-implement` Phase B (from Step 9), `ve-implement` standalone, `/novus-automate` (opt-in; its fragment only, `common/audit-logging.md` Section 5.3) | Epic cycle: the **epic branch through `.aire-docs/`** (the story branch gets code only). Bug/enhancement cycle: the bug/enhancement branch. `ve-implement` standalone: on an epic cycle the plans go through the cycle's `[TEST]` PR (`common/branching-strategy.md` Section 7.2) and its fragment through `.aire-docs/`; on a bug/enhancement cycle, its `ve/…` branch | **Only its own fragment** — `runtime-artifacts/stories/<story-key>/audit.md` and `runtime-artifacts/stories/<story-key>/state.md` |

A story writer reads the shared files (they hold the epic-level truth it needs) but **never
writes** them, and never writes another story's fragment.

### 2.1 Story keys (the same keys the evidence folders use)

| Story | Story key | Written by |
|---|---|---|
| Epic story (including `epic-enhancement` change stories, `epic-bugfix` bugfix stories and `epic-change-request` CR stories) | `story-<N.M>` | `dev-implement`, `epic-enhancement`, `epic-bugfix`, `epic-change-request`, `pr-fix` |
| Bug cycle fix (the cycle's single story) | `bug-<TICKET-ID>` | `bug-fix-implement`, `pr-fix` |
| Enhancement cycle implementation (the cycle's single story) | `enhancement-<TICKET-ID>` | `enhancement-implement` Phase B, `pr-fix` |
| ve test-plan run (standalone) | `ve-<TICKET-ID>` | `ve-implement` standalone |
| Novus automation run (opt-in) | `auto-<TICKET-ID>` | `/novus-automate` — a story writer that writes only `audit.md` in its fragment (no `state.md`); `common/audit-logging.md` Section 5.3 says where |

A story renumbered after a collision (`workflows/epic-enhancement.md` E13; `common/change-request-rules.md`
CR12b) moves its fragment with
`git mv runtime-artifacts/stories/story-<old> runtime-artifacts/stories/story-<new>` in the same step.

---

## 3. Fragment formats

### 3.1 `runtime-artifacts/stories/<story-key>/audit.md`

```markdown
# Audit Trail — <story-key>
Story: <Story N.M — title | BUG-ID | ENH-ID | Verification Engineer test plan for TICKET-ID | Novus automation for TICKET-ID>
Branch: <branch> · Workflow: <dev-implement | epic-enhancement | epic-bugfix | pr-fix | bug-fix-implement | enhancement-implement | ve-implement | novus-automate>

---
```

followed by entries in exactly the format the writing workflow already defines (all its fields —
`User Email`, `TRACKER ITEM`, `Epic Link`, `AIRE VERSION`, and any workflow-specific ones), plus one
field on every entry:

```markdown
**Story**: "<story-key>"
```

`common/audit-logging.md` applies unchanged: complete raw input, one real clock command per timestamp,
append only, to the END of this file.

### 3.2 `runtime-artifacts/stories/<story-key>/state.md`

```markdown
# Story State — <story-key>
Workflow: <…> · Branch: <…> · Created: <ISO timestamp> · AIRE v<N>

## Story Tracker Row
| Story | Title | Requires | Tracker ID | Status | PR | Merged | Start | End | Recorded |
|-------|-------|----------|------------|--------|----|--------|-------|-----|----------|
| <this story's ONE row — every column filled, the whole row rewritten on each change> |

## Claim
- Tracker: ADO <TRACKER-ID> · In Progress (bug: Active) — verified <ISO timestamp>
- Assignee: <email> — verified <ISO timestamp>   (or: `unresolved — <identity>, user warned <ISO timestamp>`)
- Parent Epic: <moved to In Progress — verified <ISO timestamp> | already In Progress | not the first story | skipped — none>

## Progress
Current step/gate: <…> · Gates passed: <list> · Last updated: <ISO timestamp>

## Self-Healing Counters
| SH-LOOP | Attempts used | State |

## Dependency Graph Additions          (epic-enhancement / epic-bugfix / epic-change-request; dev-implement and pr-fix for R6)
<the change story's node: id, title, tracker_id, requires, enables, touches;
 R6 edges and touch additions recorded by the R6 build-time check (planning/dependency-graph-generation.md)>

## Package Additions                 (any story run that installed a package not in spec/plans/package-dependencies.md)
<one row per package: name, ecosystem, exact version, latest-stable check timestamp, the story that
 needed it — implementation/package-dependencies-doc.md Section 6>

## Change Request Additions            (epic-change-request only)
<CR id; per amended requirement: REQ-ID, version transition, class (AMENDED/ADDED/SUPERSEDED);
 per affected story: the route taken. Kept in the fragment so parallel runs never collide on the
 shared requirements record — `archive-epic` folds it in at cycle close.>

## PR Feedback Rounds                  (pr-fix only — same columns as workflows/pr-fix.md Step 18)

## Defect Provenance Log               (epic-bugfix only — same columns as workflows/epic-bugfix.md Step 5)
```

Sections that do not apply are omitted. A bug/enhancement cycle's row uses the ticket ID in the
`Story` column. A `ve-<TICKET-ID>` fragment has no Story Tracker row (ve-implement never changes status)
— only `## Progress`.

---

## 4. Reading: the resolved view

Every reader — the workflows, `story-selection.md`, `ve-list-work`, `pr-fix`, `pr-generator`,
`pr-review`, `code-review` (all-stories scope), resume (`common/session-continuity.md`) and `archive-epic` —
reads the **resolved view**:
the shared files plus every fragment present on the docs branch (for a story run, in `.aire-docs/`
after `git -C .aire-docs pull --ff-only`).

1. **Epic-level sections** (`## Tracker`, `## Branching`, `## Code Root`,
   `## Extension Configuration`, `## Context Project`, `## Design References`, stage progress,
   `team_size`, …) come only from the shared `aire-state.md`. Fragments never contain them.
2. **Story Tracker**: start from the shared table. For each fragment row, compare it with the shared
   row of the same story: the row with the later `Recorded` wins, whole row; on a tie, the status
   read live from the board wins. A fragment row for a story the shared table does not
   have (a change, bugfix or Change Request story) is appended. Status is then refreshed live for
   every row a reader acts on — moves made on the board are in no file
   (`common/status-model.md` Section 6).
3. **Dependency graph**: `spec/plans/dependency-graph.yml` plus every fragment's
   `## Dependency Graph Additions`.
4. **PR Feedback Rounds / Defect Provenance Log / Change Request Additions / Package Additions / Atlas Artifact Sync
   `### Synced Files` and `### Pending`**: the union of the shared section and every fragment's. The
   `## Atlas Artifact Sync` header fields (Enabled, Cycle Folder) come only from the shared file.
5. **Audit trail**: the shared `audit.md` plus every fragment's `audit.md`. A reader that needs one
   story's history (pr-generator, pr-review, pr-fix, resume) reads that story's fragment first;
   a reader that needs the whole cycle merges all of them by `Timestamp`.
6. **`Merged: no` is resolved live.** An epic-cycle story run records its PR URL in its fragment once
   the PR exists (the fragment is on the epic branch, so this never changes the PR's head), but the
   merge happens later, outside any run — so a committed fragment may still say `Merged: no` after the
   fact. On a bug/enhancement branch the fragment is committed before the PR exists and may also say
   `PR: pending`. A reader that needs the PR or its merge state resolves it live from the story's branch
   with `common/repo-host.md` RH-1 (all states) (`common/tracker-sync.md` "Merge State Authority").

**Visibility**: on an epic cycle a story's fragment reaches other developers as soon as its docs commit
is pushed to the epic branch — the claim is committed and pushed right after it is verified. The
ADO board (read live) remains the real-time source for "who has claimed
what"; `story-selection.md` already reads it.

---

## 5. Writing rules for story writers

1. **Pre-key buffering.** Entries logged before the story key is known (the `dev-implement` selection
   prompt, `epic-enhancement` / `epic-bugfix` Steps 1–5, `pr-fix` Step 1) are held and written into the
   fragment, with their original timestamps, the moment the key is known. If the run ends before a
   key exists (a stop, a block, a halt), write the held entries to the shared `audit.md` only when the
   run is on the docs branch with nothing else to commit; otherwise leave them in the session
   output and say so — never commit them to the shared file from a story branch.
2. **The Story Tracker row lives in the fragment.** Claiming (`ToDo → In Progress`, bug `New → Active`), recording the PR URL, setting
   `Merged = no`, refreshing `Recorded` — all rewrite the one row in `state.md`. The shared table is not
   touched.
3. **Progress and SH counters live in the fragment**, so a resumed run (a new session, the same branch)
   continues from `## Progress` with the counters it already had (SH-2).
4. **ADO board updates are unchanged** — they never touched git.
5. **State Isolation Check — before EVERY docs commit a story writer makes** (on an epic cycle, run
   it inside `.aire-docs/`; the story branch itself is covered by the Docs Isolation Check,
   `common/branching-strategy.md` Section 4):
   ```bash
   BASE="$(git merge-base origin/<docs-branch> HEAD)"
   git diff --name-only "$BASE" -- runtime-artifacts/ ; git diff --name-only --cached -- runtime-artifacts/
   ```
   Every path listed must be under `runtime-artifacts/stories/<own-story-key>/`. For any other path
   (usually the shared `audit.md` / `aire-state.md`, from a run that predates this rule or a slip):
   copy its new entries / row into the own fragment (keeping their timestamps), restore the shared file
   to the merge-base version (`git restore --source "$BASE" --staged --worktree -- <path>`), and re-run
   the check. The commit happens only when the check is clean. Log the check result in the fragment.
   A path under another story's fragment is never edited — restore it the same way and report it.
   This check applies to `auto-<TICKET-ID>` keys (`/novus-automate`) exactly as to any other key.

## 6. Writing rules for docs-branch writers

- They write the shared files as before (append-only `audit.md`; in-place `aire-state.md` rows).
- **When they change a story's row** (`ve-list-work` Option B closing a story or a bug, moving a story
  to `Bug fixing` or a bug back to `Active`; `raise-defect` moving its linked story to `Bug fixing`), they read the
  resolved row first and write the full resolved row into the shared
  table with a new `Recorded` — so it wins over the fragment's older row (Section 4.2). They never edit
  a fragment.
- They pull (`git pull --rebase` — story runs push fragments to the same branch at any time)
  immediately before editing and push immediately after, so two docs-branch writers rarely overlap. If a
  push is rejected, pull and redo the edit on the fresh file — never hand-merge a Story Tracker row.

## 7. Cycle close — folding (`archive-epic`)

Before the archive copy, `archive-epic` folds the fragments (`agents/archive-epic-agent.md` Step 4):
the resolved Story Tracker is written into the shared table, the union sections are merged into their
shared sections, each fragment's audit entries are appended to the shared `audit.md` under
`## Story Audit Trails (folded at cycle close)` (one sub-heading per story, entries in timestamp
order — append-only is preserved), and the fragments are archived with everything else.

## 8. `.gitattributes`

- `runtime-artifacts/audit.md merge=union` stays — the shared audit is append-only, so a local merge
  of two docs-branch appends is safe.
- `runtime-artifacts/aire-state.md` has no union driver. Its rows are edited in place; a genuine
  conflict there (two docs-branch writers on one row) must surface as a conflict, not be merged
  into duplicate rows.
- `runtime-artifacts/stories/**` needs no driver — each story's files are touched by that story only.

## 9. Edge cases

| # | Situation | Handling |
|---|---|---|
| P1 | An in-flight branch created before this rule already edited the shared files | The State Isolation Check on its next commit moves those edits into its fragment and restores the shared files |
| P2 | A story is renumbered (collision) | `git mv` the fragment directory with the branch rename |
| P3 | `pr-fix` merges the Base Branch into a `[STORY]` PR head | The PR head carries no bookkeeping — nothing to conflict on |
| P4 | A reader has not pulled the epic branch since another story pushed its fragment | Pull first (`git -C .aire-docs pull --ff-only`); the ADO board covers live claims either way |
| P5 | The shared file and a fragment disagree on a row | Section 4.2 decides — later `Recorded` wins, then the status read live from the board |
| P6 | A run halts before its story key exists | Section 5.1 — held entries go to the session output, never into a shared file on a story branch |
| P7 | `archive-epic` finds fragments | Step 4 folds them before the copy; none is lost |
