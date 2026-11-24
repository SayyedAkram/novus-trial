# Stitch Delta Local Agent — Refresh the Locally Generated RE Docs After a Cycle Merges

**Role**: you are a release librarian for teams that work without Atlas. A cycle chose
option B at the Helix connect gate (`common/helix-atlas-integration.md` Section 4): its
reverse-engineering (RE) docs were generated locally. That cycle has now closed, archived itself and
merged into base. Your job is to make the local RE doc set describe the application as it is now.
The next cycle then starts from current truth instead of re-running reverse engineering.

**When this runs**: on the base branch, typed by the user as `/stitch-delta-local`, **after every
`[STORY]` PR merges into base** (a story stitch: no delta exists yet, the merged tree is the whole
input) and after the cycle's PR (`[EPIC]`, `[BUG]` or `[ENH]`) merges (a cycle stitch: the archived
delta plus the merged tree). One run handles whatever of both is pending, in one pass. An epic's code
reaches base story by story, so stitching each story keeps the local docs current while the epic is
still open — an epic started or running in parallel never designs against code they are missing. It
is the local counterpart of `/stitch-delta`. A
team uses one or the other: `/stitch-delta` when Atlas holds the deep dive, `/stitch-delta-local` when
the cycle generated its RE docs locally (option B). It is never auto-invoked, and it does not inspect
how a cycle sourced its docs. Typing it is the choice.

**THE DELIVERABLE IS A WHOLLY CURRENT DOC SET, NOT A SET OF EDITS.**
- Every section of every RE file is decided against the merged code, whether or not the delta named it.
- The rules of `agents/stitch-delta-agent.md` Step 4 apply here unchanged: REFRESH, KEEP (only on
  positive re-verification) or REMOVE/RESOLVE; measure, never carry forward; refresh in place, never
  restructure.

---

## The local RE home — one folder, one writer

```
aire-archives/local-re/
  spec/plans/                      # the RE doc set, same file names as spec/plans/
    business-overview.md   atlas-deep-dive.md   code-structure.md   api-documentation.md
    component-inventory.md   technology-stack.md   dependencies.md
    code-quality-assessment.md   reverse-engineering-timestamp.md
  stitch-ledger.md                 # append-only; one row per stitched delta or story
```

- The `spec/plans/` path inside the home mirrors the live layout. A new cycle restores it with a plain
  copy into `spec/plans/` (`planning/workspace-detection.md` Step 3).
- After that it is a normal locally present deep dive: the RE stage is skipped and Atlas is not
  contacted (CLAUDE.md "Reverse Engineering", row "Already exists locally").

### Why parallel cycles cannot conflict

| Who | Touches the home? | Why that is safe |
|---|---|---|
| Any cycle branch (epic, bug, enhancement, story, `ve/`) | **Read-only**: copied into the cycle's own `spec/plans/` at start | The copy lives in `spec/`, which the cycle creates and `archive-epic` removes on the same branch. Base never carries `spec/`, so every cycle's net diff on `spec/` is zero. |
| `archive-epic` | **Never.** It writes only its own new `aire-archives/<type>/<ID>-<slug>/` | One new folder per cycle; no two cycles share a path. |
| RE stage / `reverse-engineering-root` | **Never.** They write `spec/plans/` only | `workspace-detection.md` Step 3 excludes `aire-archives/` from its RE-artifact search, so no stage is ever pointed at the home. |
| **This agent** | **The only writer**, on its own `stitch-delta-local/<name>` branch from base, one run at a time | Step 1.4 refuses to start while another `stitch-delta-local/*` PR is open. |

The only other paths this agent writes are the archived `audit.md` of each cycle it stitches. Those
folders were created by that cycle's own PR, which has already merged, and nothing else writes them.

---

## Step 0: Load the Source Rules

**MANDATORY** — read these before doing anything:
- `planning/reverse-engineering.md`: each RE file's required structure and its Accuracy Rules (counts
  measured by command, HEAD is ground truth)
- `agents/stitch-delta-agent.md` **Step 4**: the full-refresh discipline (4.2–4.5) applied per file
- `agents/archive-epic-agent.md` **Step 3**: the `delta.md` schema
- `common/content-validation.md`, `common/audit-logging.md`

---

## Step 1: Preconditions

1. **Resolve the base branch** exactly as `agents/stitch-delta-agent.md` Step 1 item 1 does (open epic
   branches, the most recent archive, the repo default branch, then ask). Announce which was used.
2. Get onto base and up to date:
   ```bash
   git fetch origin && git checkout <base-branch> && git pull --ff-only
   ```
   Dirty tree → STOP and show `git status`. Never stash or discard.
3. **Merged means present on base.** A cycle's archive folder reaches base only through its cycle PR,
   because the cycle-close commit rides that PR. An archive in this freshly pulled tree is therefore
   merged, and the working tree is the post-merge ground truth. A story counts only when its `[STORY]`
   PR MERGED into base (Step 2 item 4).
4. **One run at a time.**
   List the open PRs whose source branch starts with `stitch-delta-local/` (`common/repo-host.md` RH-1,
   by branch prefix).
   If any are open → STOP with nothing written. Ask the user to merge or close it, pull, and re-run.

---

## Step 2: Discover Pending Deltas

1. **The ledger** is `aire-archives/local-re/stitch-ledger.md`. This agent alone writes it, append-only.
   Create it if absent:
   ```markdown
   # Local RE Stitch Ledger — cycle deltas and story merges stitched into aire-archives/local-re/
   <!-- Append-only. One row per stitched delta or story, written by stitch-delta-local. -->

   | Cycle | Ticket | Delta Folder | Stitched At | Commit Range | Files Refreshed |
   |---|---|---|---|---|---|
   ```
   `Delta Folder` (`<CYCLE-ID>-<slug>`) is the idempotency key. A delta is pending because it has **no
   row**. There are no pending rows. A story row has `Cycle` = `story`, the story's ticket and PR number
   in `Ticket`, and `—` in `Delta Folder`.
2. **Glob the archived deltas**: `ls -d aire-archives/{epics,bugs,enhancements}/*/spec/plans/delta/*/`.
   Drop any delta that already has a row. Order the rest by each archive's `archive-manifest.md`
   `**Archived**:` timestamp, oldest first.
3. **Several pending deltas or stories → ONE refresh pass**, with one ledger row each.
4. **Pending story merges**: the synced commit is `Analyzed At Commit` in the home's
   `reverse-engineering-timestamp.md`. A story is pending when its `[STORY]` PR merged into
   `<base-branch>` (`common/repo-host.md` RH-1 by target branch, all states, title prefix `[STORY]`) and
   its merge commit (RH-2) is not yet in that commit
   (`git merge-base --is-ancestor <merge-sha> <synced-sha> || echo pending`). No home yet → every
   merged `[STORY]` PR of a cycle with no ledger row is pending. A story PR merged into any other branch
   is not pending — its code is not on base.
5. **Code that never reached base**: a pending delta's archive manifest may carry a
   `**Not on Base Branch**:` line (`agents/archive-epic-agent.md` Step 5.4). Carry those stories to the
   completion message, the PR body and the audit — the refresh cannot describe their code.
6. **Nothing pending** → report "Nothing to stitch — the local RE docs are up to date." and STOP. This
   is a normal outcome.

---

## Step 3: Resolve the Baseline Doc Set

- **The home exists** (`aire-archives/local-re/spec/plans/atlas-deep-dive.md`): use it as the baseline.
- **First run, no home yet**: seed the home by copying the RE file set from the newest archive that
  has one (`aire-archives/<type>/<ID>-<slug>/spec/plans/`, the nine names above, whichever exist) —
  or, for a story stitch while no archive has one, from the open epic branch
  (`git show origin/<epic-branch>:spec/plans/<name>`). Announce the seed source.
- **No RE set in any archive** → STOP with nothing written. Tell the user that no cycle generated local RE
  docs, so there is nothing to stitch: use `/stitch-delta` if Atlas holds the deep dive.

---

## Step 4: Full Doc-Set Refresh — grounded in the merged code

Inputs:
- the baseline files
- every pending `delta.md` (the narrative and commit ranges)
- every pending story merge: its PR title, changed files (`common/repo-host.md` RH-6) and merge commit
- **the merged working tree on base** (the ground truth)

For each file, read its own outline, then decide every heading:
- **REFRESH**: the merged code no longer supports the claim. Rewrite it from the real tree.
- **KEEP**: only after positive re-verification. Leave it byte-identical.
- **REMOVE/RESOLVE**: the thing no longer exists. Strike or update it, naming the resolving cycle.

The `agents/stitch-delta-agent.md` Step 4 rules apply exactly:
- "Not named in the delta" is never a reason to KEEP.
- Measure with real commands; for example:
  ```bash
  git diff --name-status <range>
  git ls-files
  wc -l
  ```
  Also read the real manifest files.
- Preserve the headings and any human commentary that is still true.

Per-file specifics:
- **`atlas-deep-dive.md`**: add one cumulative header line per cycle:
  `> **Stitched (local)**: <CYCLE-ID> at <ISO 8601 timestamp> · commit <base>..<head>`. A story
  stitch adds no line.
- **`reverse-engineering-timestamp.md`**: set `Analyzed At Commit` to base `HEAD` — every run, story
  or cycle. It is the synced commit Step 2 item 4 and the next cycle's Workspace Detection read. Set the
  timestamp from a real clock (`common/audit-logging.md`).
- **Every file** keeps the local-generation banner. Its source is still not Atlas.

Write the refreshed files into `aire-archives/local-re/spec/plans/`. Validate each one per
`common/content-validation.md` before writing.

---

## Step 5: Ledger, Commit and PR — never directly to base

1. **Append** one ledger row per stitched delta or story, with these columns:
   - cycle type
   - ticket
   - delta folder
   - real-clock timestamp
   - commit range
   - files refreshed (for example `7 of 9`)

   The ledger and the docs land in the same commit, so they can never disagree.
2. `git checkout -b stitch-delta-local/<ticket or -joined tickets>`. Announce it; do not ask.
3. **Stage exactly** `aire-archives/local-re/` and the archived `audit.md` files you appended (Step 6). If
   anything else shows in `git status` → STOP and investigate.
4. Commit with the trailer read live from `CLAUDE.md`:
   ```
   docs: refresh local RE docs for <CYCLE-ID(s)>

   AIRE-Version: [N]
   ```
5. Push, then raise the PR into base.
   - **Title**: `[STITCH] <CYCLE-ID(s)> — local RE docs refreshed`
   - **Labels**: `ai-generated` and `aire-anx-v[N]`, applied with the exact-name method (`pr-generator`
     Phase 6)
   - **Body**: files refreshed versus kept, the commit range, the archives read, the story merges
     included, and any story named `Not on Base Branch` (Step 2 item 5)
6. **Race-rejected push**: fetch and rebase the stitch branch onto base. Re-read the ledger and drop any
   delta stitched meanwhile. Retry with `--force-with-lease` on the stitch branch only. Never
   force-push base.

---

## Step 6: Audit Logging

`runtime-artifacts/audit.md` does not exist on base. Append to each stitched cycle's archived
`aire-archives/<type>/<CYCLE-ID>-<slug>/runtime-artifacts/audit.md`. Each stitched story gets its entry in
its own fragment on its epic branch, exactly as `agents/stitch-delta-agent.md` Step 7 describes. Every entry carries `**User Email**:`
and a real-clock timestamp, plus:
- the files and sections refreshed, kept and resolved, with a reason for each
- the grounding commands run
- the seed source (first run only)

---

## Step 7: Completion Message

```markdown
# Local RE Docs Refreshed

- **Stitched**: [N] delta(s) — [CYCLE-ID list] · [S] story merge(s) — [Story / PR list]
- **Docs**: `aire-archives/local-re/spec/plans/` — [r] files refreshed · [k] kept (re-verified)
- **Grounded in**: `<base-branch>` @ [sha] — the merged tree
- **Not on base**: [stories named `Not on Base Branch` — their code is not described]
- **Ledger**: `aire-archives/local-re/stitch-ledger.md` — [N] row(s) appended
- **PR**: [URL] — `stitch-delta-local/<name>` → `<base-branch>`

NEXT ACTION:
   1.  Review and merge the PR above.
   2.  The next cycle copies these docs into spec/plans/ at start and skips reverse engineering.
```

Substitute every placeholder; drop the Not on base line when there is none. Output **nothing after
this block**.

---

## Critical Rules

- **User-invoked only, and the user's choice.** It never runs automatically and never decides whether
  a cycle used option B.
- **Wholly current, grounded in the merged tree**: the per-section rules of `stitch-delta-agent.md`
  Step 4, applied per file.
- **The only writer of `aire-archives/local-re/`.** It runs one at a time, on base, after every
  story merge and every cycle merge,
  and always through a `stitch-delta-local/<name>` branch and PR. It never commits to base directly.
- **Touches no `spec/`, `src/` or `tests/` path, and no Atlas document.** Its footprint is the home
  folder and the archived audit entries.
- **Ledger is append-only** and lands in the same commit as the refreshed docs.
