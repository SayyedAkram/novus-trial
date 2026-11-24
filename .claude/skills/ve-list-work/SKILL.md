---
name: ve-list-work
description: >
  The Verification Engineer's (QA's) own moves in the status lifecycle
  (aire-workflow/common/status-model.md), on Azure DevOps Boards: a story In Testing is approved →
  Closed or rejected → Bug fixing (then handed straight to /raise-defect with the story linked); a Resolved bug passes its retest → Closed or fails
  → back to Active; an In-Revision bug is confirmed not a bug → Closed (either way a bug closed here
  closes its linked story too when it was the story's last open bug), or confirmed valid (a comment —
  the developer moves it back to Active). Starts on any branch, usually the Base Branch, and never
  switches it: finds the cycle on origin, reads it from there, and records decisions on the cycle's
  docs branch through a .aire-docs/ worktree opened for the write — never on the Base Branch; an epic cycle's
  test plans are read from, and Option C changes published to, the Base Branch through the cycle's
  [TEST] PR; a bug/enhancement cycle's Option C changes are pushed to the cycle branch, where its plan
  lives (aire-workflow/common/branching-strategy.md Section 7). Asks the Verification Engineer to
  pick one of three actions: A) List — stories and bugs by LIVE status, with what needs attention;
  B) Decide — one prompt, approve or reject per item (e.g. `1.1 approve`, `4840 reject`), confirmed before
  anything moves, every move verified; C) Request changes to a story's test plan — committed and
  pushed to the branch the plan lives on, which updates the PR carrying it — without touching code
  or status. Every move is board + local Story Tracker together.
  After Option A's list it offers to move Ready for Testing stories to
  In Testing — only the ones the Verification Engineer names. Ready for Testing and Resolved are never
  made here. Options B and C close with a confirm-first Approve/Request-Changes gate; Option A writes
  nothing unless a story is moved to In Testing.
when_to_use: >
  Trigger when the user says: "ve-list-work", "Verification Engineer list work",
  "ve-signoff", "Verification Engineer sign off", "Verification Engineer signoff",
  "which stories can I test", "what is ready for testing", "what is in testing",
  "show me the stories to test", "close the story", "story 1.2 passed", "story is tested",
  "Verification Engineer done testing story 1.2", "the bug is fixed, retest passed", "retest failed",
  "the bug is still there", "not a bug", "the bug is valid", "sign off this bug",
  "sign off this enhancement", "ticket is tested", "Verification Engineer approved",
  "Verification Engineer rejected", "approve the story", "reject the story",
  "found a bug in a story", "disapprove this story",
  "change the test plan for this story", "add a test case to the Verification Engineer test plan",
  "update the test plan for story 1.2".
allowed-tools: Read Grep Glob Edit Write Bash
---

# ve List Work — the Verification Engineer's Moves

**This skill makes only the moves the Verification Engineer owns** in `aire-workflow/common/status-model.md`:

| Item, live status | Decision | Move | Status-model row |
|---|---|---|---|
| Story `Ready for Testing` | named when Option A offers it (Step 3a) | → `In Testing` | S5 |
| Story `In Testing` | `approve` | → `Closed` (refused while a linked bug is not `Closed`) | S6 |
| Story `In Testing` | `reject` | → `Bug fixing`, then straight to `/raise-defect` with the story linked | S7 |
| Bug `Resolved` | `approve` (retest passed) | → `Closed`, and its linked story → `Closed` when this was the story's last open bug | B8, S9 |
| Bug `Resolved` | `reject` (retest failed) | → `Active`, with a mandatory comment saying what still fails | B9 |
| Bug `In-Revision` | `approve` (agree it is not a bug) | → `Closed`, and its linked story → `Closed` when this was the story's last open bug | B5, S9 |
| Bug `In-Revision` | `reject` (it is a bug) | no move — a comment confirming the bug; the developer's re-run moves it to `Active` | B4 |
| Parent Epic | (asked) | → `Closed`, once every story is `Closed` | Section 4 |

**Never offered, never made here**: `Ready for Testing` (the developer, on the board, after the DEV
deploy), `Resolved` (the developer, on the board) and every developer claim. `In Testing` is made only
for the stories the Verification Engineer names in Step 3a; they can still move it on the board
instead. When a decision needs one of those first, say which move is missing. Every move goes through
`common/tracker-sync.md` Section 4 and the
`### Status Map` — never a hardcoded state name.

**Who runs this**: the Verification Engineer, after testing on the DEV environment — the
deployment the team's CI/CD makes from the Base Branch, where every story and bug fix lands after its
PR is approved and merged manually (`common/branching-strategy.md`).

**Where it runs — start it on any branch, usually the Base Branch.** It finds the cycle on origin
and never switches the branch the working tree holds (`common/branching-strategy.md` Section 4
item 5). It reads from origin and writes only the cycle's docs branch, never the Base Branch:

| Cycle | `Workflow Type` | Where it reads and writes | What it decides |
|-------|-----------------|---------------------------|-----------------|
| **Epic** | `epic`, or field absent | reads `origin/<epic-branch>`; Option B writes through `.aire-docs/`, opened for the write and closed after | the epic's stories and the bugs raised against them |
| **Bug / Enhancement, cycle still open** | `bug` / `enhancement` | reads `origin/<cycle-branch>`; Option C writes through `.aire-docs/` on the cycle branch | nothing yet — the `[BUG]`/`[ENH]` PR has not merged, so the fix is not on DEV. Options A and C only |
| **Bug / Enhancement, cycle archived** | (read from the archive) | **no checkout and no commit** — the archive is read from `origin/<base-branch>` with `git show` | the ticket, tracker-side only (Step 1.4) |

A bug/enhancement cycle archives itself on its PR before that PR merges (`archive-epic`), so by the
time its ticket is on DEV for testing, its Story Tracker and audit trail are in the archive — which is
never edited. Its decisions are therefore recorded on the tracker (comment, label, move) and shown in
the session; nothing is committed.

**The Verification Engineer picks ONE of three actions (Step 2) — the only menu in this skill:**

```markdown
A) List stories and bugs by live status  (and move Ready for Testing stories to In Testing, if you want)
B) Record decisions after testing — approve or reject a story or a bug
C) Request changes to a story's test plan
```

**File-writing boundary:**
- **Option A**: writes NOTHING, unless the Verification Engineer names stories to move to
  `In Testing` in Step 3a — then the moved stories' rows and one audit entry, the way Option B writes
  them.
- **Option B**: on an epic cycle, rewrites the decided rows of the shared `## Story Tracker` in
  `runtime-artifacts/aire-state.md` and appends one entry to `runtime-artifacts/audit.md`, then commits
  and pushes them through `.aire-docs/` (a docs-branch writer — `common/parallel-work-state.md`
  Section 6). On
  the board it also comments, tags and moves each item. An archived bug/enhancement ticket gets
  the tracker side only.
- **Option C**: edits a story's test-plan artifacts in the cycle's Test Plan Folder
  (`common/branching-strategy.md` Section 7.1) and commits and pushes them to the branch they live on.
  Epic cycle: the test-plan branch, which updates the open `[TEST]` PR or raises the next one
  (Section 7.2) — the only PR this skill ever raises. Bug/enhancement cycle: the cycle branch, which
  updates the `[BUG]`/`[ENH]` PR when it is open (Section 7.4).
- **None of the three options ever touch application code, and no option writes any other branch than
  the docs branch — except that epic-cycle test-plan branch.**

> **Relationship to `/ve-implement`**: `/ve-implement` produces the manual test steps the Verification
> Engineer executes (the story's test-plan folder) and never changes status. This skill
> changes status — only on the Verification Engineer's explicit decision, after testing. Option C is
> the one place this skill edits those artifacts directly.

---

## Step 0: Preconditions

Run Step 1 item 1 first: it finds the cycle and the ref `<ref>` its state is read from. Every
`runtime-artifacts/…` read below means `git show <ref>:runtime-artifacts/…`.

1. Read `## Tracker` (and its `### Status Map`) from `runtime-artifacts/aire-state.md` — for an
   archived ticket, from the archived copy (Step 1.4). Confirm `az account show` succeeds. If it fails,
   stop and tell the user to run `az login` first — do not attempt workarounds. (Option C never needs it.)
2. On an epic cycle the state must hold a `## Story Tracker` and a `## Branching` section. If no open
   cycle is found on origin and no ticket was named, stop and say there is no open AIRE cycle on
   origin to read.
3. The repo host's CLI must be available and authenticated — run the access check for `## Repo Host` →
   `Type` (`common/repo-host.md` Section 2). PR state is read from the repo host — never guessed. If the
   check fails, stop and say so (Option C still edits and pushes the plan, and says the PR could
   not be raised or read).

---

## Step 1: Find the Cycle on Origin

1. **Resolve the cycle** per `common/branching-strategy.md` Section 4 item 5: `git fetch origin`, then
   list the `origin/epic/*`, `origin/bug/*` and `origin/enhancement/*` branches that still hold
   `runtime-artifacts/aire-state.md`. A story or Tracker ID in the request → the cycle whose state
   holds it. Otherwise one open cycle → use it; several → ask:
   ```markdown
    Which cycle do you want to work on?

      A) epic/4800-checkout   (Parent Epic 4800)
      B) epic/4900-reporting  (Parent Epic 4900)

   [Answer]:
   ```
   Then announce it, with the ref `<ref>` every read uses:
   - **Epic cycle** → `<ref>` is `origin/<epic-branch>`.
     ` Epic cycle → epic/4800-checkout, read from origin (your branch develop is not touched).`
   - **Bug / enhancement cycle with live state** → `<ref>` is `origin/<cycle-branch>`. Option B has
     nothing to decide yet — say so if it was asked for: the fix reaches DEV only after the
     `[BUG]`/`[ENH]` PR merges.
   - **No open cycle, ticket named** (the user gave a bug/enhancement Tracker ID) → Step 1.4.
   - Never check out, pull into, edit or commit on the Base Branch, and never switch the branch the
     working tree holds.
2. **Read from origin, pull nothing**: every read in Steps 3–8 is `git show <ref>:<path>`, the story
   fragments listed with `git ls-tree -r --name-only <ref> -- runtime-artifacts/stories/`. The fetch
   above makes it current; story runs push their fragments at any time
   (`common/parallel-work-state.md` Section 6), and Option B's write works on a fresh copy (Step 5).
3. **Option C** reads and writes an epic cycle's test plans per `common/branching-strategy.md`
   Section 7.3 and 7.2, never on the epic branch; a bug/enhancement cycle's on the cycle branch
   (Section 7.4).
4. **Archived bug/enhancement ticket**: find its archive on the remote Base Branch —
   `git ls-tree -d --name-only origin/<base-branch> aire-archives/bugs/ aire-archives/enhancements/`,
   the folder starting `<TICKET-ID>-` — and read its state without checking anything out:
   `git show origin/<base-branch>:aire-archives/<type>/<ID>-<slug>/runtime-artifacts/aire-state.md`.
   Take `## Tracker` (Organization, Project, Status Map) and the ticket's row from it, read-only.
   Never edit an archive. No archive found → say the ticket belongs to no AIRE cycle this skill
   can see, and stop.

---

## Step 2: Choose What To Do

**Always ask before reading or printing anything else.** A bare `/ve-list-work` is not a choice —
never take A from the skill's name. Skip the question only when the request itself names the action
(the wording examples below).

```markdown
 What do you want to do on `<docs-branch>`?

   A) List stories and bugs by live status  (and move Ready for Testing stories to In Testing, if you want)
   B) Record decisions after testing — approve or reject a story or a bug
   C) Request changes to a story's test plan

[Answer]:
```

Accept `A`/`B`/`C`, `1`/`2`/`3`, or unambiguous wording — "what can I test" / "what's in testing" →
A; "story 1.1 approve", "the retest passed", "4840 is still broken", "not a bug" → B;
"add a test case to...", "change the test plan for..." → C.

- **A** → Step 3, print the tables, then Step 3a, then Step 10 (and Step 11 when
  Step 3a moved a story). Skip Step 9 — the stories named in Step 3a are the decision.
- **B** → Step 3, then Step 4 → Step 5 → Step 6 → Step 7 → Step 9 → Step 10 → Step 11.
- **C** → skip Steps 3–7, go straight to Step 8.

---

## Step 3: Read Every Story and Bug — status read LIVE

**Stories** — the resolved `## Story Tracker` (the shared table plus every
`runtime-artifacts/stories/*/state.md` fragment, `common/parallel-work-state.md` Section 4) — every row
whose status belongs to the story set:

| Story | Title | Requires | Tracker ID | Status | PR | Merged | Start | End | Recorded |
|-------|-------|----------|------------|--------|----|--------|-------|-----|----------|

**Bugs** — every row whose status belongs to the bug set (`epic-bugfix` bugs), plus every bug
linked to one of the cycle's stories on the board — the links `/raise-defect` creates (its Phase 4):
`az boards work-item show --id <story> --expand relations` → `System.LinkTypes.Related` targets whose
`System.WorkItemType` is `Bug`.

A bug's linked story is the story it was found through (or the one its Story Tracker entry names;
otherwise `—`). An archived ticket (Step 1.4) is the single row of its cycle.

**Status comes from the board LIVE** for every item — read it and map it back through
the Status Map (`common/tracker-sync.md` Section 4; `common/status-model.md` Section 6). That
means the board column first, then the state — `Ready for Testing`, `In Testing` and `Bug fixing`
are columns inside `Active`, so `System.State` alone would show them as `In Progress`. Moves made on
the board are in no file, so the local `Status` column is routinely behind. Option A only reports a
difference; Option B carries the live value into every row it writes (Step 5).

**The status column is headed `Live status`**, every value from this run's live read. A failed read
shows `<local value> (live read failed)` and the failure is named under the table.

**PR state** — for every story `In Progress` (and every bug `Active`) with a PR, read it live
(`common/repo-host.md` RH-2) and show `#<n> OPEN`, `#<n> MERGED <date>` or `CLOSED` (`!<n>` on Azure
Repos). A merge the Story Tracker still has as `Merged = no` is used as `yes` for this run (Option B
writes it into the full resolved row; Option A only reports it — `common/tracker-sync.md` Section 4.1).

**Print exactly these tables — the whole of Option A's output, and the view Option B works from:**

```markdown
# Verification Engineer Work — `<docs-branch>` (up to date)

## Stories
| # | Story | Tracker ID | Title | Live status | PR | Manual test steps |
|---|-------|------------|-------|-------------|----|-------------------|
| 1 | 1.1 | 4821 | [title] | In Testing | #12 MERGED 2026-10-20 | `test-plans/4800-checkout/4821-<title>/` |
| 2 | 1.2 | 4822 | [title] | Ready for Testing | #15 MERGED 2026-10-22 | `test-plans/4800-checkout/4822-<title>/` |
| 3 | 1.3 | 4823 | [title] | Bug fixing | #18 MERGED 2026-10-18 | `test-plans/4800-checkout/4823-<title>/` |
| 4 | 2.1 | 4824 | [title] | In Progress | #21 OPEN | `test-plans/4800-checkout/4824-<title>/` |

## Bugs
| # | Bug | Title | Linked story | Live status | PR |
|---|-----|-------|--------------|-------------|----|
| 5 | 4840 | [title] | 1.3 (4823) | Resolved | #24 MERGED 2026-10-27 |
| 6 | 4841 | [title] | 1.3 (4823) | In-Revision | — |

## Needs your attention
- Story 1.1 is In Testing — decide it with **B** (`approve` / `reject`).
- Story 1.2 is Ready for Testing — move it to **In Testing** when you pick it up (asked below).
- Bug 4840 is Resolved — retest it on DEV, then **B** (`approve` / `reject`).
- Bug 4841 is In-Revision — the developer believes it is not a bug; decide with **B** (`approve` =
  not a bug / `reject` = it is a bug).
- Story 1.3 is in Bug fixing and all its bugs are Resolved or Closed — retest them with **B**
  (`approve` / `reject`); approving the last one closes the story too.
```

Rows are ordered by lifecycle (`common/status-model.md` Section 1), `Closed` last. A `Needs your attention` line is printed only
for an item that has one; when there is none, print `Nothing is waiting on you.` On a bug/enhancement
cycle there is a single row. Nothing else goes in this output — no commentary, no summary block.

---

## Step 3a: Offer to Start Testing  *(Option A only)*

Only when at least one story reads `Ready for Testing` live; otherwise go to Step 10. Ask once:

```markdown
 Ready for Testing: Story 1.2 (4822), Story 2.3 (4828).
 Do you want me to move any of them to In Testing on the board? Name them (e.g. `1.2`, `4828`,
 or `all`), or say `no`.

[Answer]:
```

- **`no`** (or nothing named) → Step 10. Nothing moves.
- **Stories named** → naming them is the decision; ask nothing more. For each, in order: **move →
  verify → Story Tracker**, through `common/tracker-sync.md` Section 4 with the Status Map name (the
  `In Testing` column — `common/status-model.md` Section 5); verify by reading the status back
  live. No comment and no label. A rejected move → report it and leave that story. A name that is not
  `Ready for Testing` live → refuse it with its live status and continue with the rest.
- **Story Tracker** (epic cycle): write each moved story's full resolved row — Status `In Testing`,
  Recorded now — the way Step 5 does, through `.aire-docs/`. An archived enhancement ticket gets the
  board side only.
- Announce each in one line: ` Story 1.2 (4822) — Ready for Testing → In Testing (verified).`

Then commit and push like Option B (Step 10), with the Step 11 entry.

---

## Step 4: Ask for the Decisions  *(Option B only)*

**One question, covering every item you have finished with:**

```markdown
> **Approve or reject each item you have tested:**
>   story In Testing   →  approve (works)            |  reject (found a problem)
>   bug Resolved       →  approve (retest passed)    |  reject (still failing)
>   bug In-Revision    →  approve (not a bug)        |  reject (it is a bug)
> One per line or comma-separated, by Story ID or Tracker ID — e.g.:
> 1.1 approve
> 4840 reject
> 4841 approve
```

Rules for interpreting the answer:
- **The decision must fit the item's live status** (the first table in this skill). Otherwise
  refuse that item, say what has to happen first, and process the rest:
  - a story `Ready for Testing` → `move it to In Testing first — on the board, or run this skill and pick A`;
  - a story `In Progress` → `not on DEV yet — the developer moves it to Ready for Testing after the merge and DEV deploy`;
  - a story `Bug fixing` → `its bugs are being fixed — it comes back as Ready for Testing`;
  - a bug `New` / `Active` → `not fixed yet — it comes back as Resolved`;
  - anything `Closed` → `already closed`;
  - a word other than `approve` / `reject` → ask for one of the two (`pass`, `fail`, `valid` and
    `invalid` are not used).
- **Every decision names its item explicitly.** An item left out is not actioned this run; never guess a
  decision, never act on an item that was not named, never offer "while we're here".
- **One decision per item.** The same item named twice with different decisions → stop and ask which
  one was meant.
- **`approve` is refused while any bug linked to that story is not `Closed`** — name the open bugs
  (`4840 — Resolved`) and leave the story `In Testing`.
- **A bug's `approve` also closes its linked story** (S9) when the story is `Bug fixing`,
  `Ready for Testing` or `In Testing` and every other bug linked to it is `Closed` — read live, counting
  this run's own bug approvals. The story's move is added to the plan below and covered
  by the same yes — never asked separately. Another linked bug still open → the story stays where
  it is; name the open bugs in the plan. A bug with no linked story, or a story already `Closed`, adds
  nothing.
- If nothing actionable remains, skip to Step 9.

**Collect the comments before confirming:**
- each story `reject` — `What did you find wrong with Story [N.M] ([TICKET-ID])? (steps / expected vs actual — or skip)`;
- each `reject` of a `Resolved` bug — `What still fails on [BUG-ID]?` — mandatory, `skip` is not accepted (B9);
- each decision on an `In-Revision` bug — `Your reasoning for [BUG-ID]? (or skip)`.

**Confirm-first — show every planned move and wait:**

```markdown
These changes will be made (tracker + local Story Tracker):
  • Story 1.1 (4821)   In Testing  → Closed        comment + ve-approved
  • Bug 4840           Resolved    → Active        comment ("<what still fails>") + ve-rejected
  • Bug 4841           In-Revision → Closed        comment
  • Bug 4839           Resolved    → Closed        comment + ve-approved
  • Story 1.3 (4823)   Bug fixing  → Closed        comment + ve-approved  (its last open bug, 4839, approved)
Apply them? (yes / change)
```

On change, take the corrections and show the list again. Nothing moves before yes.

---

## Step 5: Apply Each Decision  *(Option B only)*

For every confirmed item, in this order: comment → label → move → verify → Story Tracker — bugs
first, then the stories their `approve` closes (S9), each only after its last open bug's move verified. The
move dispatches through `common/tracker-sync.md` Section 4 with the Status Map name; verify by
re-reading the item. A rejected move → list the states it can move to, report it honestly, and stop for
that item — never pick another state, never claim a move that did not land.

**Labels** (tags in `System.Tags`):
APPEND, never replace — re-read the current tags, add the new one, write the full set back;
`ai-generated`, `aire-anx-v[N]` and every other label survive. Remove the opposite label (`ve-approved` ↔
`ve-rejected`) in the same update.

**Comments** (`common/tracker-sync.md` Section 10) lead with the exact phrase shown, followed by
`Tested by: [session email]`, `Environment: DEV`, `Test steps: <the story's test-plan folder>`
(stories) and the comment text from Step 4:

| Decision | Comment opens with | Label | Move |
|---|---|---|---|
| story `approve` | `Verification Engineer approved the story.` | `ve-approved` | → `Closed` |
| story `reject` | `Verification Engineer rejected the story.` + the finding | `ve-rejected` | → `Bug fixing` |
| bug `Resolved` `approve` | `Verification Engineer retested the bug — passed.` | `ve-approved` | → `Closed` |
| its linked story (S9) | `Verification Engineer approved the story — its last open bug <bug link> is closed (passed retest / agreed not a bug).` | `ve-approved` | → `Closed` |
| bug `Resolved` `reject` | `Verification Engineer retested the bug — still failing.` + what still fails | `ve-rejected` | → `Active` |
| bug `In-Revision` `approve` | `Verification Engineer agrees this is not a bug.` + reasoning | — | → `Closed` |
| bug `In-Revision` `reject` | `Verification Engineer confirms this is a valid bug — please move it back to Active by re-running the fix.` + reasoning | — | none (stays `In-Revision`) |

**Story Tracker** (epic cycle — a docs-branch writer, `common/parallel-work-state.md` Section 6): open
`.aire-docs/` on the epic branch now (`common/branching-strategy.md` Section 4 item 1), and write in
`.aire-docs/runtime-artifacts/aire-state.md`. For
every decided item that has a row, write its full resolved row into the shared table — every column
from the resolved view, the live status from Step 3, then the change: Status → the new status;
Merged → `yes` when the PR read live as MERGED; End → today (`YYYY-MM-DD`) when the item reached
`Closed`; Recorded → now (real clock). Never edit a fragment. A bug found only on the tracker (no
row) has no local side — the tracker move is the whole record. An archived ticket (Step 1.4) gets the
tracker side only.

Announce each item in one plain line, e.g.
` Story 1.1 (4821) — approved → Closed (comment + ve-approved, verified).`
` Bug 4840 — retest failed → back to Active (comment + ve-rejected, verified).`
` Story 1.3 (4823) — last open bug 4839 passed → Closed (comment + ve-approved, verified).`

A story's S9 move is made only when its bug's move verified; a bug move that did not land leaves the
story where it is, and says so.

---

## Step 6: Rejected Stories → `/raise-defect`  *(Option B only)*

Every story rejected in Step 5 is now `Bug fixing`. A label is not a bug ticket, so hand each one
straight to the `/raise-defect` skill, one story at a time: pass the story as its Linked story
and the Step 4 finding as the starting Description. raise-defect asks its own questions and stays
confirm-first; the story is already `Bug fixing`, so it plans no further move. If the Verification
Engineer declines (`skip`), say once that the developer has nothing to fix against until a defect is
raised, and record the skip.

---

## Step 7: Parent Epic → Closed (EPIC CYCLES ONLY, confirm-first)  *(Option B only)*

Run only when this run's approvals made every story of the cycle `Closed` (re-read live, after
Step 5). Skip silently on bug/enhancement cycles, or when `Parent Epic: none`.

```
 All [N] stories are Closed.
Move Parent Epic [EPIC-ID] to "Closed"? (yes / skip)
```

On **yes**: move it per `common/tracker-sync.md` Section 4, verify, and add a comment summarising
the Verification Engineer's closure. A rejected move → report it honestly. On **skip**: note it. This is
the only thing in this skill that touches the Parent Epic.

---

## Step 8: Request Changes to a Story's Test Plan  *(Option C only)*

**Only when the user picked C in Step 2.** This edits the story's folder in the Test Plan Folder —
never code or status.

1. **Ask which story's test plan to change** (skip if already given):
   ```
    Which story's test plan do you want to change? (Tracker ID, e.g. 4822, or Story ID)
   [Answer]:
   ```
2. **Resolve the test folder**: the story's folder per `common/branching-strategy.md` Section 7.1
   (`<TICKET-ID>-<title-kebab>` — see
   `aire-workflow/implementation/test-plan.md` Output Location), read per Section 7.3. If it doesn't
   exist, tell the user no test plan exists for this story yet — do NOT create one here. An archived bug or enhancement ticket's plan is already on the Base Branch
   with its merged PR and is never edited from here.
3. **Show the current plan** — read `test-plan-summary.md` and present its Applicable Test Plans and
   Acceptance Criteria → Test Case Coverage tables.
4. **Ask what to add or change, and where**:
   ```
    What do you want to add or change, and in which test plan?
      (e.g. "add a negative test case to api-test-steps.md for AC-3",
       "add a boundary case to integration-test-steps.md")
   [Answer]:
   ```
5. **Apply the change** using the exact rules and format from `aire-workflow/implementation/test-plan.md`:
   - Every new/changed test case MUST use the `TC-[PLAN]-[nn]` format from that file's Step 3
     (Traces to / Type / Priority / Preconditions / Test data / Steps / Expected result /
     Pass-Fail criteria / Cleanup).
   - Every case MUST trace to an AC (`AC-[n]`) — ask which AC it covers if unclear; never invent one.
   - Update `test-plan-summary.md`'s case count and its Acceptance Criteria → Test Case Coverage
     table.
6. **Show the exact new/changed section** and wait for confirmation before writing anything.
7. On confirmation, write the file(s) and announce:
   ` Updated <the story's test-plan folder><file> — added TC-[PLAN]-[nn], traced to AC-[n].`
   - **Epic cycle**: first open the test-plan worktree (`common/branching-strategy.md` Section 7.2
     items 1–2) and write inside `.aire-test-plans/`.
   - **Bug / enhancement cycle**: open `.aire-docs/` on the cycle branch
     (`common/branching-strategy.md` Section 4 item 1, with the cycle branch as the docs branch) and
     write inside it. The working tree's branch is never switched.

**Never changes story or tracker status here.**

---

## Step 9: Approve or Request Changes (confirm-first gate — **Options B and C only**)

**Option A never reaches this step.**

```markdown
[Summary of what this run did:
 - Option B: every move and comment from Step 5–Step 7, and the defects raised in Step 6
 - Option C: the test-plan change from Step 8]

 **Do you approve this, or do you want to request changes?**

   1)  Approve — accept this as final
   2)  Request Changes — go back and adjust

[Answer]:
```

- On Approve → Step 10.
- On Request Changes → ask what to adjust, go back to Step 4 (a decision — a move already made
  is reversed the same confirm-first way, through Step 5) or Step 8 (the test-plan edit), then
  present this gate again. Never close without landing back here.

---

## Step 10: Close the Run

**Option A** — the Step 3 tables ARE the output. When Step 3a moved stories, first commit and push
their rows and the Step 11 entry inside `.aire-docs/`, then close it — exactly as Option B does below
— and print the Step 3a lines. Add only this footer and stop:
```markdown
**Next, once you have tested on DEV:**
   1.  Run /ve-list-work again and choose **B** to approve or reject a story or a bug.
   2.  To log a bug against a story, use the skill /raise-defect and link it to the story — rejecting
       a story with **B** opens /raise-defect for you, with the story already linked.
   •   Choose **C** instead to change a story's test plan.
```

**Option B** — first, on an epic cycle, commit and push the Story Tracker and audit changes inside
`.aire-docs/` (`git -C .aire-docs pull --rebase` → commit with the `AIRE-Version: [N]` trailer →
`git -C .aire-docs push`). A rejected push → pull again and redo the edit on the fresh file, never a
hand merge (`common/parallel-work-state.md` Section 6). Then close the worktree
(`common/branching-strategy.md` Section 4 item 6).
Then:

```markdown
# Verification Engineer decisions recorded

**Stories closed**: [Story 1.1 (4821), Story 1.3 (4823) — last bug passed, … — or "none this run"]
**Stories sent to Bug fixing**: [Story 1.3 (4823) → defect 4842 raised, … — or "none"]
**Bugs closed**: [4841 (not a bug), 4839 (retest passed), … — or "none"]
**Bugs back to Active**: [4840, … — or "none"]
**Bugs confirmed valid (developer to move back to Active)**: [… — or "none"]
**Refused**: [item — the board move it needs first, … — or "none"]
**Parent Epic**: [EPIC-KEY → Closed (verified) / skipped / not applicable]
**Branch**: `<docs-branch>` — pushed [commit sha]   (archived ticket: "tracker only — nothing committed")

**Next, whenever you are ready:**
   • this skill again (**A**) — see what is waiting on you
   • `/ve-implement <story>` — generate the manual test steps for a story that has none
   • `/raise-defect` — log anything else your testing finds
```

**If every story of an epic cycle is now `Closed`**, replace the "Next" list with:
```markdown
**NEXT ACTION — one keyword:**
   1.  Type this keyword: archive-epic
       It runs on the epic branch `<epic-branch>`, archives the cycle's documents and raises the
       [EPIC] PR into `<base-branch>` — it carries only the archive; every story's code is already
       there. Merging it, then `/stitch-delta` on `<base-branch>`, completes the cycle.

Type the keyword `archive-epic` EXACTLY as shown — do not describe what you want in your own words.
   Any other phrasing is not a framework trigger and the workflow will not advance.
```

**Archived bug/enhancement ticket, now `Closed`**: add one line — `This ticket's cycle was archived
when its PR merged. If /stitch-delta has not run for it yet, run it on <base-branch>.`

**Option C** — publish the change first; the Step 9 approval is the authorization, so ask nothing more:
- **Epic cycle**: `common/branching-strategy.md` Section 7.2 items 4–6 (push the test-plan branch;
  update the open `[TEST]` PR or raise the next one), then commit the Step 11 audit entry on the epic
  branch through `.aire-docs/` the way Option B does.
- **Bug / enhancement cycle**: inside `.aire-docs/`, stage only the Test Plan Folder and the Step 11
  audit entry (`git -C .aire-docs diff --name-only --cached` shows nothing else), `pull --rebase`,
  commit with the `AIRE-Version: [N]` trailer and push — a rejected push is handled as Option B does.
  Close the worktree, then find the cycle branch's open `[BUG]`/`[ENH]` PR (`common/repo-host.md`
  RH-1); the push has already updated it.

Then print the one variant that matches the cycle:
```markdown
# Test plan updated

**Story**: [Story N.M / TICKET-ID]
**File changed**: <the story's test-plan folder><file>
**Added/changed**: TC-[PLAN]-[nn], traced to AC-[n]
**State**: [EPIC cycles:] pushed to `<test-plan branch>` — [TEST] PR into `<base-branch>`: <PR URL> (updated | raised)
           [BUG/ENH cycles:] pushed to `<cycle-branch>` — [BUG]/[ENH] PR: <PR URL> (updated) | not raised yet — the plan goes in when it is

NEXT ACTIONS:
   1.  [EPIC cycles:] Get the [TEST] PR approved and merged into `<base-branch>`.
       [BUG/ENH cycles:] Nothing to merge separately — the plan reaches `<base-branch>` with the [BUG]/[ENH] PR.
   2.  Execute the manual test steps on DEV once the story is In Testing.
   3.  Then use this skill again and pick **B** to record your decision, or **C** to adjust more.
   • Use the skill raise-defect for anything your testing finds.

Nothing about story or tracker status changed here — only Option B does that.
```

Say nothing after the applicable block above.

---

## Step 11: Log the Run

Append (never rewrite) one entry to `runtime-artifacts/audit.md` on the docs branch — for Option B
before the Step 10 commit, so it rides it. **Archived ticket**: the archive is never edited, so print
this entry in the session output instead and say so; the tracker comments are the durable record.
Option A logs nothing to a file unless Step 3a moved a story — then one entry, `Mode: A — moved to
In Testing`, with each story moved in `Decisions`.

```markdown
## Verification Engineer Decisions (ve-list-work)
**Timestamp**: [ISO 8601 — real clock]
**User Email**: [current session email — read live from the session context]
**User Input**: "[complete raw user input]"
**Mode**: "[A — moved to In Testing | B — decisions | C — test-plan edit]"
**Cycle / Branch**: "[epic | bug | enhancement] — <docs-branch> | archived ticket (read from origin/<base-branch>)"
**TRACKER ITEM**: "[each item involved — [#<id>](<work-item URL>)]"
**Decisions**: "[Story 1.1 (4821) approve → Closed, verified; 4840 reject → Active, verified, comment: '<text>'; … or n/a]"
**Refused**: "[item — reason / board move needed, … or none]"
**Defects raised (Step 6)**: "[4842 for Story 1.3 | skipped | none]"
**Tracker labels/tags applied**: "[ve-approved → 4821 | ve-rejected → 4840 | none]"
**Test-plan edit**: "[Story N.M (<work item ID>) — <file> — TC-[PLAN]-[nn] added/changed, traced to AC-[n] | n/a]"
**Epic transition**: "[EPIC-KEY → Closed (verified) / skipped by user / n/a]"
**Approve / Request Changes gate**: "[Approved / Request Changes → re-did [step]]"
**AI Response**: "[what was changed, with verification results]"
**AIRE VERSION**: "[N — read live from CLAUDE.md]"
**Context**: ve-list-work skill (Verification Engineer decisions)

---
```

Write tracker-linked items as clickable Markdown links (`[#<id>](<work-item URL>)`, the direct
work-item URL), never bare text.

---

## Critical Rules

- **Only the Verification Engineer's moves** (S5, S6, S7, S9, B5, B8, B9 and the Epic `Closed`, plus the B4
  comment) — `common/status-model.md`. Never make `Ready for Testing` or `Resolved`; make
  `In Testing` only for the stories named in Step 3a. When a decision needs one of them first, refuse
  that item and name the move.
- **Every decision is `approve` or `reject`, and the item must be in a status that takes one** — a
  story `In Testing`, a bug `Resolved` (the retest) or a bug `In-Revision` (is it a bug?).
- **Confirm-first, then verify**: show every planned move (Step 4), wait for yes, apply, re-read
  each item. Never claim an unverified move.
- **`approve` is refused while a linked bug is not `Closed`**; a failed retest needs a comment saying
  what still fails; a rejected story goes straight to `/raise-defect` with the story linked.
- **A bug's `approve` closes its linked story too** when it was the story's last open bug (S9) — in the
  same confirmed plan, never a separate question, and only after the bug's move verified.
- **Status is read LIVE** for every item and mapped through the Status Map; the local
  column is a lagging copy.
- **Start on any branch, switch nothing** — the cycle is found and read on origin
  (`common/branching-strategy.md` Section 4 item 5); writes go only to the epic branch, through
  `.aire-docs/` opened for the write and closed after. Never check out, edit or commit on the Base
  Branch, never switch the working tree's branch, and never edit an archive; an archived ticket is
  decided tracker-side only. Option C pushes to the branch the plan lives on: an epic cycle's
  test-plan branch, through the cycle's `[TEST]` PR (Section 7.2), or a bug/enhancement cycle branch
  through `.aire-docs/` (Section 7.4).
- **Labels/tags are APPENDED, never replaced**, and the opposite `ve-approved` / `ve-rejected` label is
  cleared in the same update.
- **Never update only one side** — every move lands on the tracker and in the Story Tracker row
  (when the item has one) together, written as the full resolved row.
- **NEVER guess merge state** — read PRs live (`common/repo-host.md` RH-2).
- **Runs NO build and NO tests.** The Verification Engineer tests on DEV, using the steps in the
  story's test-plan folder (`common/branching-strategy.md` Section 7.1).
- **Ask A/B/C first (Step 2)** — no table or status read is shown before the answer; a bare
  `/ve-list-work` is never taken as A.
- **Option A prints the Step 3 tables and nothing else**, then asks the one Step 3a question when a
  story is `Ready for Testing`. It writes nothing unless stories are named there.
- **Option C only edits test-plan artifacts**, in the `TC-[PLAN]-[nn]` format with AC
  traceability (`aire-workflow/implementation/test-plan.md`).
- **Options B and C close through the Step 9 gate**; Option A never does.
- **Close with the handoff that matches the state**: every epic story `Closed` → `archive-epic`.
- **Append to `runtime-artifacts/audit.md` — never rewrite it.** Timestamps come from a real clock
  in ISO 8601.
