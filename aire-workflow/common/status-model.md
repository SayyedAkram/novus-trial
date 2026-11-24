# Status Model — Story and Bug Lifecycles

**Purpose**: Single source of truth for **which statuses exist, who moves each transition and what
AIRE does at each one**. The ADO commands that perform a move live in
`common/tracker-sync.md` Section 4; the branching that feeds the lifecycle lives in
`common/branching-strategy.md`. Every other rule file cites a transition from here instead of
restating it.

The Verification Engineer is the team's QA. "On the board" means the person moves the item in the
Azure DevOps board's own UI.

---

## 1. Canonical Statuses

| Item | Statuses, in lifecycle order |
|---|---|
| **Story** (epic stories, `epic-enhancement` / `epic-change-request` change stories, enhancement tickets) | `ToDo` → `In Progress` → `Ready for Testing` → `In Testing` → `Bug fixing` → `Closed` |
| **Bug** (every defect: `raise-defect` bugs, `epic-bugfix` bugs, bug tickets) | `New` → `Active` → `In-Revision` → `Resolved` → `Closed` |
| **Parent Epic** | The story statuses — only `In Progress` and `Closed` are ever set by AIRE |

These are the only valid values of the Story Tracker `Status` column. A bug recorded in the Story
Tracker (an `epic-bugfix` bugfix story, a bug cycle's ticket) uses the bug set.

---

## 2. Story Lifecycle

| # | Move | Who | How AIRE takes part |
|---|---|---|---|
| S1 | (created) → `ToDo` | AIRE, at the tracker push (User Stories Part 3) | Automatic — Story Set Approval already authorized it |
| S2 | `ToDo` → `In Progress` | Developer, by picking the story with `dev-implement` | **Automatic claim** — verified and announced, never asked (`implementation/story-selection.md` Step 5) |
| S3 | `In Progress` → PR → two approvals → merge into the development branch → CI/CD deploys to DEV | Developer, reviewers, the pipeline | AIRE raises the `[STORY]` PR and its comment-only auto review. **AIRE never approves, merges or deploys.** The two approvals are enforced by the development branch's policy (`common/repo-host.md` RH-11). The story stays `In Progress` throughout |
| S4 | `In Progress` → `Ready for Testing` | Developer, **manually on the board**, once the DEV deploy is done | **None.** AIRE never makes this move; it reads it live (Section 6) |
| S5 | `Ready for Testing` → `In Testing` | Verification Engineer, when picking the story up — on the board, or by naming it when `ve-list-work` Option A offers the move | Made only for the stories named there (naming them is the decision), verified and announced. Otherwise AIRE reads it live |
| S6 | `In Testing` → `Closed` | Verification Engineer, approving with `ve-list-work` Option B | Confirm-first. Refused while any linked bug is not `Closed` (the open bugs are named) |
| S7 | `In Testing` → `Bug fixing` | Verification Engineer, rejecting with `ve-list-work` Option B — or `raise-defect` with this story as the Linked story | `ve-list-work`: confirm-first, and a rejection hands straight to `raise-defect` with the story linked. `raise-defect`: automatic once the defect is approved (also from `Ready for Testing`), verified and announced |
| S8 | `Bug fixing` → `Ready for Testing` | Developer, **manually on the board**, once every linked bug is `Resolved` (fixed, merged, deployed to DEV) | **None.** `ve-list-work` Option A flags a story whose linked bugs are all `Resolved` or `Closed` |
| S9 | `Bug fixing`, `Ready for Testing` or `In Testing` → `Closed` | Verification Engineer, closing the story's **last open linked bug** with `ve-list-work` Option B — a passed retest (B8) or agreed not a bug (B5) | Made with the bug's move, in the same confirm-first plan — never asked separately — and only once the bug's `Closed` is verified and every other bug linked to the story is `Closed` |

Otherwise the Verification Engineer moves it to `In Testing` again (S5) and retests the story and its
bugs together.

---

## 3. Bug Lifecycle

| # | Move | Who | How AIRE takes part |
|---|---|---|---|
| B1 | (created) → `New` | Verification Engineer, with `raise-defect` | At creation |
| B2 | `New` → `Active` | Developer, by starting work on it (`ticket-implement` / `bug-fix` at the start of analysis, `epic-bugfix`) | **Automatic claim** — verified and announced, never asked |
| B3 | `Active` → `In-Revision` | Developer, who believes it is not a bug | Confirm-first, **offered only** when the bug cannot be reproduced or the reported "expected result" contradicts the approved requirements / acceptance criteria. AIRE drafts a comment to the Verification Engineer (why, with the evidence), posts it with the move, and the run **halts** — no fix, no branch, no PR |
| B4 | `In-Revision` → `Active` | Developer, after the Verification Engineer confirms on the bug that it is valid | Automatic claim on re-running the bug workflow (same as B2) |
| B5 | `In-Revision` → `Closed` | Verification Engineer, who agrees it is not a bug | Confirm-first, through `ve-list-work` Option B |
| B6 | `Active` → PR → two approvals → merge into the development branch → CI/CD deploys to DEV | Developer, reviewers, the pipeline | AIRE raises the `[BUG]` (or `[STORY]` for `epic-bugfix`) PR and its auto review; never approves, merges or deploys. The bug stays `Active` |
| B7 | `Active` → `Resolved` | Developer, **manually on the board**, once the DEV deploy is done | **None.** AIRE reads it live |
| B8 | `Resolved` → `Closed` | Verification Engineer, retest passed, through `ve-list-work` Option B | Confirm-first |
| B9 | `Resolved` → `Active` | Verification Engineer, retest failed, through `ve-list-work` Option B | Confirm-first, with a mandatory comment saying what still fails. The developer fixes it under the **same bug** — no new bug is raised (a bug cycle re-runs on a `-r2` branch, `common/branching-strategy.md` Section 6) |

---

## 4. Parent Epic

- **First story claimed** (S2 on the first story, read from the resolved Story Tracker and the live
  Epic) → Epic `In Progress` — automatic, verified, announced, logged.
- **Every story `Closed`** (read live) → Epic `Closed` — confirm-first, asked by `ve-list-work`
  after the approval that closes the last story. Any story not `Closed` → the Epic is not moved; list
  the stories still open.
- **Mid-epic work on a `Closed` Epic** (`epic-enhancement`, `epic-bugfix`, `epic-change-request`) → Epic
  back to `In Progress`, authorised by that workflow's own approval, verified, logged. A `Closed`
  story is never reopened — the new change or bugfix story carries the retest.
- AIRE sets no other Epic status. Skip silently when `Parent Epic: none`.

---

## 5. Status Map (per project)

Teams name these states differently on their boards. The names AIRE uses on the tracker are recorded
once, under `## Tracker` in `runtime-artifacts/aire-state.md`, at ADO Project Resolution
(`common/tracker-sync.md` Section 1):

```markdown
### Status Map
- Story: ToDo=ToDo · In Progress=In Progress · Ready for Testing=Ready for Testing · In Testing=In Testing · Bug fixing=Bug fixing · Closed=Closed
- Bug: New=New · Active=Active · In-Revision=In-Revision · Resolved=Resolved · Closed=Closed
```

Left of `=` is the canonical status; right is the tracker's own name. The defaults are the canonical
names. Every tracker move and every live read goes through this map — never a hardcoded name.

**ADO: statuses are board columns.** On ADO the board a team works from shows columns, and a
column sits inside a work-item state — on the Agile process `Ready for Testing`, `In Testing` and
`Bug fixing` are typically columns inside the `Active` state, and `System.State` stays `Active` while
the card moves between them. Bugs work the same way: **`Active` and `In-Revision` are columns inside
the `Active` state**. So an ADO entry names the column, with its state:
`<canonical>=<State>/<Column>` (e.g. `In Testing=Active/In Testing`, `In-Revision=Active/In-Revision`).

**The column has the same name as the status — the column is the priority.** On ADO every status
is the board column of that same name: a bug in `New` sits in the `New` column, a story in
`In Testing` in the `In Testing` column. Names are compared ignoring case, spaces and hyphens (`To Do`
is `ToDo`, `In Revision` is `In-Revision`); nothing else counts as the same name. The state is
whatever state that column maps the item's type to. A column with a different name (`To Do` for a
bug's `New`) is never used, never offered and never accepted as a substitute.

For example:

```markdown
- Bug: New=New/New · Active=Active/Active · In-Revision=Active/In-Revision · Resolved=Resolved/Resolved · Closed=Closed/Closed
```

**Columns only, on every board the items are on.** Every story and bug status is mapped to its
column, and every move sets that column. A state alone would leave the column to Azure DevOps, which
puts the card in the first column of that state — a bug claimed for `Active` can land in
`In-Revision`. An entry with no `/` is allowed only for an item that is on no board (no column
exists). The boards are recorded once, under the map — one line per board, with the work item type it
shows:

```markdown
- ADO Board: team "<Team>" · board "<Stories>" · types User Story, Bug · column field WEF_<id>_Kanban.Column
```

**Verification** (once, at ADO Project Resolution; re-run only when a move is rejected or a read
finds a name the map does not have) — the board check:

1. **Team** — `az devops team list --org "<org-url>" --project "<project>"`; one team → use it; several → ask once, in chat, which team's board the pod works from. 2. Board — `az devops invoke --org "<org-url>" --area work --resource boards --route-parameters project="<project>" team="<team>" id="Stories" --api-version 7.1` (the requirement backlog's board — `Stories` on Agile, `Backlog items` on Scrum, `Requirements` on CMMI; fallback: `az rest --method GET --resource 499b84ac-1321-427f-aa17-267ca6975798 --url "<org-url>/<project>/<team>/_apis/work/boards/<board>?api-version=7.1"`). Take `columns[].name`, each column's `stateMappings` (per work item type: `User Story`, `Bug`) and `fields.columnField.referenceName` (the `WEF_…_Kanban.Column` field). That board is the item type's board only when it has a column named after each of that type's statuses (story: `ToDo` … `Closed`; bug: `New` … `Closed`). Otherwise — for bugs typically, when the Stories board shows them in story-named columns such as `To Do` — list the team's boards (`az devops invoke … --area work --resource boards --route-parameters project="<project>" team="<team>" --api-version 7.1`), read each the same way, and take the one whose columns for that type carry the status names. 3. Map — every canonical status → `<State>/<Column>`: the column with the same name as the status on that board, its state from that column's `stateMappings` for the item's type. No column of that name on any of the team's boards → stop and name the missing columns and the board: `Board "<board>" has no column named "<status>" for <type>. Add the column on the board (Board settings → Columns), then continue.` Wait for the person to add it, re-read the board and continue. Never map the status to a differently named column, and never ask which other column to use. Never map a status to a state alone while its item type is on a board. Bugs on no board at all (tracked as tasks or off the board) → states only (`az devops invoke … --area wit --resource workItemTypeStates --route-parameters project="<project>" type="Bug"`); `In-Revision` then needs a state of its own, asked as below.

A mapped state the project does not have (an item on no board) → show the person the project's real
states and ask, in chat, which one to use for that canonical status; record the answer in the map and
log it. A mapped column is never substituted — stop as in step 3 of the ADO check until a column of
that name exists.
Never invent a state or column, and never fall back silently to a different one. A recorded ADO entry
whose column name is not the status name (written by an earlier version, e.g. `New=New/To Do`) → re-run
the board check before the next move, update the map and log it. **Every name must map back to exactly one canonical status**: two canonical statuses
on the same ADO state are allowed only when each has its own column — mapping `In Progress` and
`In Testing`, or a bug's `Active` and `In-Revision`, both to plain `Active` makes the live read
ambiguous, so it is refused. A recorded map with a state-only entry for an item that is on a board
(written by an earlier version) → re-run the board check before the next move, update the map and
log it.

---

## 6. Reading Status Live

Statuses moved on the board (S4, S5, S8, B7, and every confirm in the tracker UI) are never
written by AIRE, so the local Story Tracker can lag. Whenever AIRE needs an item's status — the
Doability Gate, `ve-list-work`, the Epic sync, `raise-defect`'s linked story, the resolved Story Tracker
view, resume — it reads the status live from the board (the board column first, then
the state — `common/tracker-sync.md` Section 4), maps it back through the Status Map,
and, when it differs from the local `Status`, records the observed value in the Story Tracker row
(with a new `Recorded`) and logs `observed on the board`. That is a sync, not a move — it never
triggers a tracker call.

**Merge state is never inferred from status** — whether a story's code is merged is decided by its
PR (`common/tracker-sync.md` Section 4.1).

---

## 7. Rules

- Only S1, S2, B1, B2, B4, `raise-defect`'s S7 and the Epic `In Progress` moves are automatic. S5
  is made only for the stories the Verification Engineer names in `ve-list-work` Option A. S6,
  `ve-list-work`'s S7, S9, B3, B5, B8, B9 and Epic `Closed` are confirm-first. S4, S8 and B7 are
  **manual on the board — AIRE never makes them**, not even when asked inside a workflow run; it tells the person to move the item on the
  board.
- No implement workflow ever moves a story past `In Progress` or a bug past `Active`.
- Every automatic or confirmed move is verified by re-reading the item, logged, and applied to both
  sides (tracker and local Story Tracker) — never one side only.
- A status the Status Map does not contain is reported, never guessed.
