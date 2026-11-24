# WORKFLOW: `epic-enhancement <TICKET-ID | description>` (Mid-Epic Enhancement — a Story of the Open Epic)

> **READ FIRST.** The non-negotiables at the top of `workflows/dev-implement.md` bind this workflow
> too: every gate runs (no scope calls), the claim (In Progress + assignee) is made on the external
> tracker and recorded in the fragment's `## Claim` block, a disclosed gap is never shipped, and the run
> ends with this workflow's own handoff block verbatim — nothing else in that final message.

## WHAT THIS WORKFLOW IS

A new or changed behaviour that arrives while an epic cycle is still open, including behaviour that
earlier stories of the epic already built, is delivered inside that epic as ONE new change story,
instead of as a separate cycle. Earlier stories' unit tests that the change touches are found, updated
and re-proven in the same PR; their ACs are amended on the epic branch and their test plans through the
cycle's `[TEST]` PR (`common/branching-strategy.md` Section 7.2), in the same run.
The change story follows the story lifecycle (`common/status-model.md` Section 2).

Bugs found in work the epic already built have their own flow: `epic-bugfix`
(`workflows/epic-bugfix.md`).

| | `ticket-implement` → enhancement cycle | **`epic-enhancement` (this workflow)** |
|---|---|---|
| Branch | `enhancement/…` from **base** (docs + code) | `story/…` from **base** (code only); documents on the **epic branch** through `.aire-docs/`; test plans through the cycle's `[TEST]` PR into base |
| PR | `[ENH]` → base | **`[STORY]` → base** |
| Cycle | Its own: requirements, design stages, STOP checkpoint, archive | **None** — the epic's state and specs are reused |
| Documents | brief, requirements, impact analysis, design docs, plan | **ONE** — `spec/plans/change-story-<N.M>.md` |
| Earlier stories' tests | Not its concern | **Found, changed and re-proven** — test plans and unit tests |
| Questions | Requirements Q&A, approvals per stage | **None — only the plan approval** |

---

## FAST BY DESIGN — LESS CEREMONY, NEVER FEWER GATES

**Cut**: requirements Q&A, design-stage documents, the STOP checkpoint, a separate code-generation plan
file, a separate Verification Engineer test-plan PR, a separate archive, and every clarifying question.

**Never cut**: the baseline, every gate of `workflows/dev-implement.md` (unit tests + coverage, API
contract tests, test placement, full regression, static evals, the J1/J2 judge score checkpoint, the test-plan check, Code Review with the Security Baseline pass,
auto-remediation), the 3-attempt retry cap, and the rule that a test is never weakened to go green.

The one addition over `dev-implement` is the Test Change Authorization discipline (Steps 5.4 and
12): changing an earlier story's behaviour legitimately invalidates some of its tests, so the approved
change document names exactly which ones may change. Every other test is a regression guard and
must stay green by fixing code.

---

## THE ONLY QUESTION IS THE PLAN APPROVAL

**The run asks exactly one thing: approve the change document (Step 7).** It never asks a clarifying
question, never offers a menu of options, and never asks for a decision mid-run.

- **Input comes with the keyword.** `epic-enhancement 4851` or
  `epic-enhancement "let managers export the order list as CSV"`. A bare `epic-enhancement` stops with one usage
  line — `Usage: epic-enhancement <TICKET-ID | "description of the change">` — and asks nothing.
- **Where a decision is needed, the framework decides, and the document says so.** Every such decision
  is written into the document's Section 9 — Decisions & assumptions with its reason and the
  alternative it rejected (defaults in the Edge cases table). The user overrules any of them with
  Request Changes at the approval — that is the only channel, and it is enough.
- **Approval authorises everything the document lists**: the new story, the amended acceptance
  criteria, the Test Change Authorization list, the tracker story creation and links, the dependency
  edges, an `architecture.md` amendment, and — when the document says so — moving the Parent Epic back
  to In Progress.
- After approval the run is fully automatic through to the PR and the handoff. A correction the user
  volunteers is an interrupt: apply it, record it in the document's revision log, continue.
- The sanctioned halts stay (they are not questions): SH-4 retry-limit exhaustion and the Step 4
  blocks.

---

## SINGLE-SESSION EXECUTION — NO FORKS

`workflows/dev-implement.md` Step 1.7 applies to this whole workflow, unchanged: every step runs in the
session where the keyword was typed; nothing is delegated to a fork, subagent, Workflow-tool run,
background or remote agent, second session or `claude -p` subprocess; agent procedure files and skills
execute inline; the Code Review pass is read-only by discipline. A run inside a fork or subagent HALTS
at Step 0.

---

## MANDATORY: Rule Details Loading

Resolve `aire-workflow/` and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`,
  `common/audit-logging.md`, `common/tracker-sync.md`, `common/branching-strategy.md`,
  `common/requirements-traceability.md`, `common/directory-structure.md`, `common/story-artifacts.md`
- `workflows/dev-implement.md` in full — its Step 1.5 (story branch + baseline), its code gates and
  its Sections A–F are executed by reference at Steps 9–14; its Self-Healing Retry Policy and
  Retry-Limit Report bind this workflow.
- `implementation/code-generation.md`, `workflows/code-review.md` + `implementation/code-review.md`,
  `workflows/remediate.md` + `implementation/remediate.md`

---

## SELF-HEALING RETRY POLICY — INHERITED, PLUS ONE LOOP

SH-1 … SH-7 from `workflows/dev-implement.md` govern every loop here (3 attempts each, independent
counters, logged root cause per attempt, exhaustion HALTS with the Retry-Limit Report, stalls end the
budget early, no weakening).

At SH-4 the run emits the Self-Heal Limit message (`common/self-heal-limit-guidance.md` Section 2)
with resume keyword = `epic-enhancement`, and records `HALTED —` in the story fragment's `## Progress`.
Typing `epic-enhancement` again is a hand-back: the run finds the halted change story and follows the resume
protocol (Section 4) instead of starting a new change — the plan approval is not asked again.

The loops keep their `dev-implement` IDs, plus:

| ID | Loop | Defined in | Verification that must pass to exit |
|---|---|---|---|
| **SH-LOOP-6** | Test Impact Reconciliation | Step 12 | The test/test-plan diff matches the Test Change Authorization list exactly (every authorised change made, no unauthorised change), and every new or amended AC has ≥1 test case |

---

## MANDATORY: Audit Entry Format

`workflows/dev-implement.md`'s format (`User Email`, `User Input`, `TRACKER ITEM`, `Epic Link`,
`AIRE VERSION`, `AI Response`, `Context`) plus one field on every entry:

```markdown
**CHANGE**: "ENHANCE — Story <N.M> — spec/plans/change-story-<N.M>.md"
```

Append only; timestamps from one real clock command.

## PARALLEL-SAFE STATE — THIS STORY WRITES ONLY ITS OWN FRAGMENT (`common/parallel-work-state.md`)

Other developers build other stories of the same epic at the same time, and the Verification Engineer
records decisions on the epic branch. So that none of them conflict on the framework's bookkeeping,
**the build path of this workflow never writes the shared `runtime-artifacts/audit.md` or
`runtime-artifacts/aire-state.md`**:

- Every audit entry goes to `runtime-artifacts/stories/story-<N.M>/audit.md` (same format plus
  `**Story**: "story-<N.M>"`). Entries from Steps 1–5, before the story number exists, are held and
  written there with their original timestamps as soon as Step 5.2 assigns it.
- The story's Story Tracker row, progress and SH counters go to
  `runtime-artifacts/stories/story-<N.M>/state.md`; the change story's dependency-graph node goes to
  its `## Dependency Graph Additions` section (the shared `## Dependency Graph` section is never
  edited).
- This overrides every mention of those two shared paths below. Reads use the resolved view
  (`common/parallel-work-state.md` Section 4).
- **Documents never ride the story branch.** The fragment, the change document, spec edits and
  evidence are written and committed through the docs worktree `.aire-docs/` on the epic branch
  (`common/branching-strategy.md` Section 4 — its path rule applies to every `spec/`,
  `runtime-artifacts/` and `reports/` path below). Test-plan edits are published through the cycle's
  `[TEST]` PR into the Base Branch (Section 7.2 — its path rule applies to every `test-plans/` path
  below). The story branch carries code and unit tests only. Every run closes the docs worktree
  when it ends, including a halt or an early stop (Section 4 item 6).
  State Isolation Check before every docs commit (Section 5.5), **Docs Isolation Check before every
  code commit** (branching-strategy Section 4 item 4).
- **The spec-only path is a docs-branch writer** — it commits on the epic branch itself (through
  `.aire-docs/`), so it writes the shared files, pulling immediately before and pushing immediately
  after (Section 6).

---

## Step 0 — Single-Session Check

Exactly `workflows/dev-implement.md` Step 1.7's fork check. Inside a fork or subagent → HALT with
that step's message (substituting `epic-enhancement`), change nothing.

## Step 1 — Preconditions: is there an open epic cycle to change?

0. **▶ Hand-back first**: if the checked-out branch is a change story's branch whose fragment
   (`runtime-artifacts/stories/story-<N.M>/state.md`) holds a `HALTED —` record, this invocation is the
   developer handing the work back after a manual fix — the keyword may be bare and the working tree
   dirty by design. Skip the rest of Steps 1–9 and follow `common/self-heal-limit-guidance.md` Section 4,
   then continue from the halted gate. Otherwise continue with item 1.
1. `runtime-artifacts/aire-state.md` exists with `## Branching` → `Epic Branch` recorded and no
   `Workflow Type: bug` / `Workflow Type: enhancement` in `## Tracker`. Otherwise → stop:
   `No open epic cycle here — use ticket-implement <TICKET-ID> for a base-branch enhancement cycle.`
2. The keyword carries a ticket ID or a description. Otherwise → stop with the usage line.
3. The working tree is clean (`git status --porcelain` empty). Otherwise → stop:
   `Commit or stash your local changes, then re-run epic-enhancement.` Never stash or discard for the user.
4. Open the docs worktree `.aire-docs/` on the epic branch (`common/branching-strategy.md`
   Section 4 item 1); the main working tree holds the Base Branch.
5. **The cycle is still open**: `spec/`, `spec/plans/stories.md` and the Story Tracker are present, and
   `aire-archives/epics/<EPIC-ID>-*/` does not exist. Archived → stop: the change belongs to a
   base-branch cycle after the Epic PR merges (`ticket-implement`), or the user reverts the archive
   commit first.
6. Read `## Tracker`, `## Code Root` and `team_size`. Log the preconditions.

## Step 2 — Capture the change

- **Ticket ID**: fetch it per `common/tracker-sync.md` Section 8 — summary, description, acceptance
  criteria, labels, links.
- **Description**: use it verbatim as the change statement.

Where the capture leaves something open (a rule, a limit, a message text), do not ask: choose the
reading most consistent with the approved ACs, `requirements.md`, `architecture.md` and the existing
code, and record it as an assumption in document Section 9. Log the invocation and the capture verbatim.

## Step 3 — Impact analysis (code → stories)

No file is "affected" without a recorded reason.

1. **Code surface**: the files, symbols and `file:line` ranges the change must add to or alter — read
   the code, never infer from names.
2. **Map every touched path to the stories that own it**, from two independent sources (record whether
   they agree):
   - base-branch history since the epic started — story commits carry `[Story N.M / TRACKER-ID]`
     subjects (`git log --format='%H %s' $(git merge-base origin/<epic-branch> origin/<base>)..origin/<base> -- <path>`),
   - `git blame -w -M -C -L <range> -- <file>` on the touched line ranges.
3. **Map behaviour to stories**: read the ACs of every story in `stories.md` — merged, in flight
   and not yet started — and list each AC whose behaviour the change alters, even where no code exists
   yet.
4. **Map tests to stories**: for each affected story, list its unit tests (`tests/unit/**`) that
   exercise the touched code or the altered ACs, plus its cases in `test-plans/<cycle>/<ID>-*/` (read
   per `common/branching-strategy.md` Section 7.3).
5. **Concurrency scan**: every other story `In Progress` without a merged PR, and the cycle's open
   `[TEST]` test-plan PR, whose diff touches a path in the change surface (changed files via `common/repo-host.md` RH-6).

## Step 4 — Route on the state of each affected story

| Affected story's state | What the change does to it | Outcome |
|---|---|---|
| `ToDo` — no code yet | Amend its ACs and test cases only (**spec-only**); add a `requires` edge onto the change story when its code will build on the change | Proceed |
| `In Progress`, **no PR yet** — being built right now | Cannot change a spec or code under an in-flight build | **HALT — blocked** (E2) |
| `In Progress`, **PR OPEN, unmerged** | Its code is not on the base branch yet | **HALT — blocked** (E3): comment the change on that PR and run `pr-fix <PR>`, or get it merged and re-run |
| **PR MERGED** (`common/tracker-sync.md` Section 4.1), not `Closed` — `In Progress` awaiting the DEV deploy, `Ready for Testing`, `In Testing` or `Bug fixing` | Code change on the base branch through the change story; its tests and test plan amended in place | Proceed (E4) |
| `Closed` — the Verification Engineer already closed it | Code change through the change story; its tests and test plan amended in place; **status not moved** — the change story's test plan carries the re-verification | Proceed (E5) |

- **All affected stories are `ToDo`** → the **spec-only path**: Steps 5–7 and 9.3 run,
  no change story is created, nothing is built; Step 9.3 ends with a direct commit on the epic branch,
  and the document is saved as `spec/plans/change-spec-<X.Y>.md`.
- **Any block** → HALT before writing anything, listing every blocking story, its state, its PR and the
  exact way forward. Log it. (A halt, not a question.)

## Step 5 — Test impact analysis and sizing

### 5.1 Classify every affected AC

| Class | Meaning | Artifacts that move |
|---|---|---|
| **UNCHANGED** | Behaviour stays as approved | None — its tests are regression guards and must stay green |
| **AMENDED** | Behaviour changes | AC text, its test case(s), the unit tests asserting the old behaviour |
| **SUPERSEDED** | Behaviour is removed | AC marked superseded (never deleted); test case(s) retired; tests deleted as genuinely dead; dead code removed |

### 5.2 Define the change story

- **Number**: the next free `N.M`, read from `origin/<epic-branch>`'s `stories.md` and Story Tracker
  immediately before assigning (two clones may run this at once — E13).
- **Title**: `Change: <summary>`.
- **ACs**: the behaviour as it must now be — net-new behaviour plus the new form of every AMENDED
  behaviour, so the change story's own tests prove the change end to end.
- **Covers**: existing REQ-IDs it implements; a genuinely new requirement gets a new REQ-ID appended to
  `requirements.md` (`REQ-F-NN — added mid-cycle by Story <N.M>`).
- **Requires**: every affected story whose code it changes (all merged, per Step 4).
- **Enables**: every `ToDo` story that must now wait for it.

### 5.3 Artifact inventory

Every artifact that will be edited or created: `stories.md` (new story + annotated amendments),
`requirements.md`, `dependency-graph.yml` + Story Tracker row, test plans (the change story's new
folder, amended cases in earlier stories' folders), unit tests (5.4), and `architecture.md` only if a
design decision changes.

### 5.4 Test Change Authorization list

The exact unit tests and test-plan cases that may be modified or deleted because an AC they assert
was AMENDED or SUPERSEDED — one row each: `file` + test name + action (`update assertion` /
`delete — dead`) + the AC it traces to. A test not on this list must pass unmodified (new tests may
always be added).

### 5.5 Sizing check

A change that would add a new deployable component, service, data store, external integration or
infrastructure resource, touch more than half of the epic's stories, or need a design stage the epic
skipped is over-size (E9). It is not asked about: the default is decided and recorded (E9).

## Step 6 — Write THE ONE document: `spec/plans/change-story-<N.M>.md`

(Spec-only path: same template, saved as `spec/plans/change-spec-<X.Y>.md` after the first amended
story, with Sections 4 and 6 marked N/A.)

```markdown
# Change Story <N.M> — <title>
Mode: ENHANCE · Source: <ticket link | "inline description"> · Epic: <EPIC link>
Epic branch: <branch> @ <sha> · Written: <ISO timestamp> · AIRE v<N>

## 1. The change
<what changes and why>

## 2. Impact — code
| Path / range | Change | Owning story (evidence: history / blame) |

## 3. Impact — stories and acceptance criteria
| Story | State | AC | Class (UNCHANGED / AMENDED / SUPERSEDED) | Old → new text |
Spec-only amendments to stories are listed here too.

## 4. The change story
Story <N.M> — <title> · Covers: <REQ-IDs> · Requires: <stories> · Enables: <stories>
Acceptance criteria:
- AC-1 …

## 5. Test impact
### 5a. Test plans — test cases per story (added / amended / retired)
### 5b. Test Change Authorization list
| File | Test | Action | Traces to |
### 5c. New unit tests to add

## 6. Implementation plan  (this section IS the code-generation plan — checkboxes marked as work completes)
Coding guidelines: applied — <n> files (<file names>) | none   (implementation/code-generation.md Step 1.8)
- [ ] Step 1 — … (AC-n / REQ-ID)
Trace check: every change-story AC and every AMENDED/SUPERSEDED AC appears in ≥1 step.

## 7. Tracker and state actions on approval
New tracker story or existing ticket · link to the Parent Epic · comments on affected stories · Epic
reopen (only if the Epic is already Closed) · dependency edges.

## 8. Warnings
Concurrent work on the same paths · an open `[TEST]` PR on affected test-plan folders ·
architecture impact · OVER-SIZE (if flagged).

## 9. Decisions & assumptions (made by the framework — overrule any with Request Changes)
| # | Decision / assumption | Why | Alternative not taken |

## 10. Revision log
```

Rules: every row cites its evidence; no invented scope; `common/content-validation.md` applies; this is
the only new planning file of the run (the change story's test-plan folder is created at Step 9.3
because the Verification Engineer's sign-off depends on it).

## Step 7 — THE ONLY QUESTION: approve the plan

Present the document path and a short summary — affected stories with their states, AC counts by class,
the change story's ACs, the Test Change Authorization count, the tracker actions, and every Section 9
decision in one line each — then:

```
 Change Story <N.M> — review spec/plans/change-story-<N.M>.md
   (Section 9 lists every decision I made for you — change any of them with Request Changes.)

A) Request Changes — tell me what to change
B) Approve & Build — apply the spec edits and tracker actions, then build, test and raise the
   [STORY] PR into <base-branch> automatically

[Answer]:
```

(Spec-only: option B reads `Approve & Apply — amend the specs and commit them to <epic-branch>`.)

`A` → revise the document (a requested change to a Section 9 decision moves that row to "decided by
the user"), log a revision entry, present again. `B` → Step 8. Log the prompt and the raw answer.
Nothing outside the document has been written before this approval.

## Step 8 — Tracker actions and the claim (build path; the spec-only path skips to Step 9.3)

Runs in the refreshed docs worktree, exactly where `dev-implement` Story Selection runs, because the
story branch name needs the tracker ID. Only the claim is committed here.

1. **Tracker item** (`common/tracker-sync.md`): no ticket →
   create a Story (Section 3 labels/fields — AC in the Acceptance Criteria field only, never in the
   description — `Built with AIRE v[N]` footer, status `ToDo`) linked to the
   Parent Epic (Section 6); ticket given → use it and link it to the Parent Epic if not linked yet; its
   live status must be `ToDo` or `In Progress` (anything later → stop: it is past development). Verify.
2. **Re-check the story number** against `origin/<epic-branch>` (E13); renumber if taken.
3. **Story Tracker row + claim** — in the fragment `runtime-artifacts/stories/story-<N.M>/state.md`,
   never the shared table: add Story <N.M> and claim it in the same step — `ToDo` → `In Progress`
   (`common/status-model.md` S2), `Start` and `Recorded` set, tracker moved and verified, assignee = the
   operator, `aire-anx-v[N]` label (`common/tracker-sync.md` Sections 4, 5, 9) — exactly as `dev-implement`
   Story Selection does, including its docs commit and push of the claim. `Requires` = document
   Section 4.
4. **Epic sync**: Parent Epic already `Closed` → move it back to `In Progress` (authorised by the
   approval), verify, log.
5. **Comment on every affected story's tracker item**:
   `Behaviour amended by Story <N.M> (<link>): <AC list>. Re-verified under Story <N.M>.`

## Step 9 — Branch, baseline, spec edits

### 9.1 Branch and baseline (build path)

Execute `workflows/dev-implement.md` Step 1.5 for Story <N.M>: the story branch
`story/<TRACKER-ID>-<N.M>-<kebab-title>` is cut from the refreshed base branch (its dependency-merge
check re-confirms every `requires` is merged into it), then the baseline full regression is captured
before any edit. The fragment `runtime-artifacts/stories/story-<N.M>/` from Step 8 stays in
`.aire-docs/`, as it does in `dev-implement`.

### 9.2 (reserved — the reproduction proof exists only in `epic-bugfix`)

### 9.3 Apply the approved spec edits (docs worktree `.aire-docs/`, test plans through the `[TEST]` PR, both paths — never the story branch)

1. **`spec/plans/stories.md`**: append the change story (same format as every other story, with
   `**Tracker ID**:`, `**Covers**:`, `**Requires**:` and
   `**Change document**: spec/plans/change-story-<N.M>.md`). Annotate every AMENDED / SUPERSEDED AC of
   earlier stories in place — `AC-3 (amended by Story <N.M>, <date>): <new text>`, old text struck
   through, never deleted.
2. **`spec/plans/requirements.md`**: new or amended REQ text, marked with the story that changed it.
3. **Dependency graph** — build path: the fragment's `## Dependency Graph Additions` only
   (`archive-epic` merges it into `spec/plans/dependency-graph.yml` at cycle close; readers combine both
   meanwhile); spec-only path: `spec/plans/dependency-graph.yml` and the shared `## Dependency Graph`
   directly. It records the change-story node with its `requires` / `enables` / `touches`, and the new
   edges from `ToDo` stories onto it. Run the R6 plan-time check
   (`planning/dependency-graph-generation.md`) with the change story included and add its R6 edges.
   Its `touches` list code paths only — the spec edits are on the epic branch, never in its PR.
4. **Test plans**: invoke the `ve-implement` skill in WORKFLOW MODE — once for the change story
   (its plan includes a "Re-verification of affected stories" section listing each amended AC and the
   test cases the Verification Engineer re-runs), and once per affected story, scoped to its AMENDED /
   SUPERSEDED ACs. Never hand-edit a plan to match code. The plans are written in the test-plan
   worktree, opened before the first one (`common/branching-strategy.md` Section 7.2 items 1–2); its
   commit, push and `[TEST]` PR (items 4–6) run with item 7's commit (spec-only path) or Step 13's
   docs commit (build path).
5. **Architecture** (only when the document records a design change): amend
   `spec/plans/architecture.md` per `implementation/architecture-doc.md` and bump its version.
6. **Coverage check (blocking, fixed silently)**: every change-story AC and every AMENDED AC has ≥1
   test case; nothing remains for a SUPERSEDED AC.
7. **Spec-only path ends here**: update the amended stories' tracker items (AC text + a comment naming
   the document), commit on the epic branch —
   `[Spec] Amend Story <X.Y>[, …] per spec/plans/change-spec-<X.Y>.md` with the `AIRE-Version: [N]`
   trailer — push, publish the test-plan edits (Section 7.2 items 4–6), emit the spec-only handoff
   (Step 14), stop. **Build path**: these edits stay
   uncommitted in `.aire-docs/` until Step 13's docs commit, so the epic branch receives the amended ACs
   together with the change story's PR.

## Step 10 — Build

Execute `workflows/dev-implement.md` Part 2 generation for Story <N.M>, with these overrides and nothing
else changed:

- **Plan**: document Section 6 is the code-generation plan (it satisfies `dev-implement`'s
  write-the-plan-to-disk step); mark its checkboxes as steps complete. No separate plan file.
- **Generation order**: application change → the authorised test changes from Section 5b (update
  obsolete assertions, delete dead tests, each traced to its AC) → new tests (Section 5c).
- **Packages**: the epic's approved `spec/plans/package-dependencies.md` governs every install
  (`implementation/package-dependencies-doc.md` Section 6). The document's Section 6 (implementation
  plan) lists any new package, so the plan approval covers it.

## Step 11 — The COMPLETE gate chain

Execute `workflows/dev-implement.md` Steps 6 through 6.6 for Story <N.M> — Unit Test & Coverage,
API Contract Tests, Test Placement, Full Regression, Static Evals, the J1/J2 Judge Score Checkpoint and the
test-plan check. Gate
semantics with authorised changes:

- In the full regression, a test green at baseline and red now is a **regression to fix in the
  application code** — unless it is on the Test Change Authorization list, in which case it must already
  have been updated and must now pass.
- A red test the analysis missed may join the list only if it asserts an AC the document classifies
  AMENDED or SUPERSEDED: add it to Section 5b with a revision-log entry, announce it, continue. A red test
  that traces to an UNCHANGED AC is always a regression.
- Every gate keeps its SH-LOOP and 3-attempt budget; exhaustion → SH-4 HALT with the Retry-Limit Report.

## Step 12 — Test Impact Reconciliation (SH-LOOP-6)

A deterministic check, after Step 11 and before the review:

1. `git diff --name-status $(git merge-base origin/<base> HEAD) -- tests/` on the story branch, plus
   `git -C .aire-test-plans diff --name-status HEAD -- test-plans/<cycle>/` (this run's uncommitted
   test-plan edits, Step 9.3).
2. Every modified or deleted test file or test case maps to a Section 5b row (or is one of the
   change story's own new files). A modified or deleted test not on the list → **violation**: restore it
   from the merge-base and fix the application code instead.
3. Every Section 5b row is done (an `update` row whose test was left untouched and now fails is a gate
   failure, not a skip).
4. Every change-story AC and every AMENDED AC has ≥1 test case; none remains for a SUPERSEDED AC.

Write the result to `reports/unit-test-evidence/story-<N.M>/test-impact-reconciliation.md` and record
PASS/FAIL in that folder's `evidence-manifest.md`. A failure → fix → re-run the affected Step 11 gates
(continuing their counters) → re-check; one cycle = one SH-LOOP-6 attempt; cap 3; exhaustion → SH-4.

## Step 13 — Review, commit, PR, PR review

1. **Code Review** — `workflows/dev-implement.md` Sections A → B → C, with the AC scope set to the
   change story's ACs plus every AMENDED AC of the affected stories (as amended) and the `Covers`
   REQ-IDs of both. The security pass stays diff-scoped. The report adds a **Change Impact
   Verification** table: each affected story → amended ACs → Met / Partially Met / Not Met with
   `file:line`.
2. **Sections D and E** unchanged, with:
   - the Docs Isolation Check, then the code commit on the story branch (application change and unit
     tests) — `[Story <N.M> / <TRACKER-ID>] Change: <summary>` + `AIRE-Version: [N]`;
   - the State Isolation Check, then the docs commit in `.aire-docs/` — Step 9.3's spec edits, the
     change document, the reconciliation evidence and the fragment
     `runtime-artifacts/stories/story-<N.M>/` (never the shared `audit.md` / `aire-state.md`) — pushed
     to the epic branch (`common/branching-strategy.md` Section 4 item 3);
   - the test-plan commit, push and `[TEST]` PR into the Base Branch for Step 9.3's test-plan edits
     (Section 7.2 items 4–6);
   - `pr-generator` in WORKFLOW MODE, target = the Base Branch, `[STORY]` prefix, work item = the change
     story's Tracker ID (linked per `common/repo-host.md` RH-12); the PR body also
     carries a `## Change Impact` section (affected stories and amended ACs, the Test Change
     Authorization list) — read the body back and verify it landed.
3. **Before the handoff**: log which variant is shown, commit and push the fragment through
   `.aire-docs/`, then close the docs worktree (`common/branching-strategy.md` Section 4 item 6).

## Step 14 — Handoff (verbatim, the last output)

**Build path**:

```
 CHANGE STORY <N.M> PR RAISED — NOT MERGED. Story <N.M> stays In Progress until it is merged and deployed to DEV.
   PR: <PR URL>  →  target `<base-branch>`   Change document: spec/plans/change-story-<N.M>.md (epic branch)
   Affected stories: <X.Y (AMENDED AC-n), …> — their tests were updated in this PR, their test plans in [TEST] PR <TEST PR URL>.
   Gates: all PASS / N/A, including Test Impact Reconciliation — summary in the PR body.

NEXT ACTIONS:
   1.  APPROVE and MERGE the PR into `<base-branch>` manually — the framework never
       approves or merges. Its CI/CD deploys the change to DEV.
       Rejected instead? Leave comments on the PR, then type: pr-fix <PR URL>
   2.  Once it has merged into `<base-branch>`, on `<base-branch>` type: <stitch-command>
       It updates the existing-system docs with this change.
   3.  Developer, once the DEV deploy is done: move Story <N.M> to Ready for Testing on the board.
   4.  Verification Engineer: review the test-plan changes in [TEST] PR <TEST PR URL> (changes:
       /ve-list-work → C, which updates that PR). Then move Story <N.M> to In Testing, test it on DEV
       and decide with ve-list-work — its test plan includes the re-verification cases for the
       affected stories.
   5.  More stories to build? type: dev-implement

Type the keywords EXACTLY as shown — any other phrasing is not a framework trigger.
```

`<stitch-command>` and the greenfield case follow `workflows/dev-implement.md` Section F Step 3.

**Spec-only path**:

```
 SPEC AMENDED — no code existed yet, so nothing was built.
   Amended: <Story X.Y AC-n, …> in stories.md and their test plans; tracker updated.
   Commit <sha> pushed to `<epic-branch>`; test plans in [TEST] PR <TEST PR URL>.   Document: spec/plans/change-spec-<X.Y>.md

NEXT: the amended stories are built as usual — type: dev-implement
Verification Engineer: review the amended test plans in [TEST] PR <TEST PR URL> (changes: /ve-list-work → C).
```

Log which variant was shown.

---

## Edge cases — every one resolved without a question

| # | Situation | Handling (default recorded in document Section 9 where it is a decision) |
|---|---|---|
| E1 | Affected story not started (`ToDo`) | Spec-only amendment of its ACs and test cases; `requires` edge onto the change story if its code builds on the change |
| E2 | Affected story being built right now (no PR) | **HALT — blocked**: never change a spec under an in-flight build; finish it, then `pr-fix` (open PR) or re-run (merged) |
| E3 | Affected story has an OPEN, unmerged PR | **HALT — blocked**: comment the change on that PR and run `pr-fix <PR>`, or merge it and re-run |
| E4 | Affected story merged, not yet `Closed` | Change story; its test plan is amended through the `[TEST]` PR in the same run, so the Verification Engineer tests the amended behaviour once the change story is deployed too |
| E5 | Affected story already `Closed` | Not reopened; tracker comment; re-verification cases live in the change story's plan |
| E6 | Parent Epic already `Closed` | Moved back to `In Progress` — stated in Section 7, authorised by the approval, verified |
| E7 | Epic already archived | Stop — `ticket-implement` after the Epic PR merges, or revert the archive commit first |
| E8 | The change as described would violate the Security Baseline | **Default**: the change story is shaped to comply (e.g. adds the missing authorisation / validation); Section 9 records what was reshaped and why |
| E9 | Over-size change | **Default**: proceed as one change story; amend `architecture.md` for the new element; Section 8 flags OVER-SIZE and Section 9 names the rejected alternatives (split / full cycle) |
| E10 | Change removes a feature | ACs SUPERSEDED (kept, marked); test cases retired; dead tests deleted via the authorization list; dead code removed |
| E11 | Change contradicts an unstarted story's ACs | That story is amended spec-only in the same document |
| E12 | Another in-flight story or the cycle's open `[TEST]` PR touches the same paths | Warned in Section 8; for code, whichever merges second resolves the conflict (`pr-fix` handles it on a `[STORY]` PR); test-plan edits join the open `[TEST]` PR (`common/branching-strategy.md` Section 7.2) |
| E13 | Two clones pick the same story number | Re-read from `origin/<epic-branch>` right before assignment and again before the push; on collision renumber to the next free, rename the branch, announce |
| E14 | The change duplicates an existing `ToDo` story's scope | **Default**: amend that story spec-only instead of creating a new one (spec-only path); Section 9 records it |
| E15 | The capture is ambiguous (a limit, a rule, a message text) | **Default**: the reading most consistent with approved ACs, requirements, architecture and existing code; Section 9 records the assumption |
| E16 | A test outside the authorization list goes red | Regression — fix the code; it joins the list only if it asserts an AMENDED/SUPERSEDED AC (announced, revision-logged) |
| E17 | Another story merges into the base branch during the run | `dev-implement` Section D Step 4 merges it in before the push; one that merges after the push shows on the PR, and `pr-fix` brings it in and re-runs every gate |
| E18 | `ticket-implement` typed while this epic is open | The router offers `epic-enhancement` / `epic-bugfix` instead (`workflows/ticket-implement.md` Step 1) |
| E19 | Change story PR rejected | `pr-fix <PR>` — it detects the change document and also re-runs Step 12 |
| E20 | It is really a defect, not a change | Out of this flow — `epic-bugfix` (it adds reproduction proof and AI-origin detection); the run stops with that pointer before writing anything |
| E21 | The change amends, adds or withdraws a **requirement** in `spec/plans/requirements.md` (not just behaviour) | Out of this flow — `epic-change-request` (it versions the requirement, re-points every covering story's `Covers`, and rebuilds the coverage matrix); the run stops with that pointer before writing anything |

---

## Critical Rules

- **THE ONLY QUESTION IS THE PLAN APPROVAL.** No clarifying questions, no option menus, no mid-run
  decisions. Decisions the framework makes are written into document Section 9 and overruled only via
  Request Changes. Missing input stops with a usage line; blocks and retry limits are halts, not
  questions.
- **ONE NEW DOCUMENT.** `spec/plans/change-story-<N.M>.md` (or `change-spec-<X.Y>.md`) is the only new
  planning file; nothing outside it is written before approval.
- **INTO THE EPIC, AS A STORY.** Story branch from the base branch, `[STORY]` PR into the base branch,
  documents on the epic branch, Story Tracker row, dependency graph node — never a separate cycle, never
  a new `Workflow Type`, never a change to `## Tracker`'s Parent Epic.
- **NEVER FEWER GATES.** Every `dev-implement` gate runs on the change story, plus Test Impact
  Reconciliation. "Fast" means less ceremony only.
- **ONLY AUTHORISED TESTS CHANGE.** An earlier story's test is modified or deleted only if it is on the
  approved Test Change Authorization list and traces to an AMENDED or SUPERSEDED AC. Every other red test
  is a regression fixed in the code (SH-6).
- **CONTRACTS MOVE TOGETHER.** An amended AC moves its `stories.md` text and test case (epic branch)
  and its unit tests (the `[STORY]` PR) in the same run; test plans are never rewritten to match code.
- **NEVER CHANGE WORK IN FLIGHT.** A story being built, or with an open PR, blocks the change.
- **NO STATUS DEMOTION, NO MERGING.** Statuses move only as `common/status-model.md` defines; the
  change story never moves past `In Progress` here, and the framework never merges a PR.
- **SINGLE SESSION, BOUNDED LOOPS, FULL AUDIT.** No forks (Step 0); 3 attempts per loop; every audit
  entry carries the `dev-implement` fields plus `CHANGE`; every commit carries `AIRE-Version: [N]`.
