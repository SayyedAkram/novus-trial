# WORKFLOW: `epic-change-request <TICKET-ID>` (Mid-Epic Change Request — into the Epic Branch)

> **READ FIRST.** **This workflow amends specifications. It never generates code.** It cuts no story
> branch, runs no gate chain and raises no PR — those are `dev-implement`'s, and this run ends by
> handing off to it. What binds here: a disclosed gap is never shipped, nothing reaches disk before the
> Phase 9 gate, and the run ends with this workflow's own handoff block verbatim — nothing else in that
> final message.

## WHAT THIS WORKFLOW IS

**A requirement changed while the epic cycle is open.** Not "make it do something new" and not "it is
broken" — the *agreement itself* was revised: a threshold moved, a rule was rewritten, a regulation
landed, a decision was reversed. This workflow makes that change visible in the cycle it arrives in,
versions the requirement, routes every story that promised the old text, and leaves **one new story,
ready to build** — then hands the build to `dev-implement`.

It is the third mid-epic workflow, a peer of the other two — not a variant of either:

| | trigger | its question |
|---|---|---|
| `epic-enhancement` | **behaviour** | "make it do X" |
| `epic-bugfix` | **defect** | "it does X but shouldn't" |
| **`epic-change-request` (this)** | **requirement** | "we agreed X; now we agree Y" |

**This workflow is fully self-contained.** It stands on `workflows/dev-implement.md` and the shared
`common/*.md` contracts only. It never reads, cites or delegates to `epic-enhancement.md` or
`epic-bugfix.md`, and deleting either of those files leaves this workflow fully executable.

| | `ticket-implement` → enhancement/bug cycle | **`epic-change-request` (this workflow)** |
|---|---|---|
| Branch | `enhancement/…` or `bug/…` from **base** | **none** — specs commit on the epic branch |
| PR | `[ENH]` / `[BUG]` → base | **none** — `dev-implement` raises the `[STORY]` PR |
| Cycle | Its own: requirements, design stages, STOP checkpoint, archive | **None** — the epic's state and specs are reused |
| Requirements | Its own scoped `requirements.md` | **The epic's `requirements.md`, amended and versioned in place** (`common/requirement-versioning.md`) |
| Documents | brief, requirements, impact analysis, design docs, plan | **ONE bundle** — `spec/plans/change-requests/CR-<n>/` |
| Earlier stories' tests | Not its concern | **Test plans amended here; unit tests named for `dev-implement`** |
| Questions | Several approvals | **ONE — the single gate (Phase 9)** |

---

## WHAT MAKES THIS DIFFERENT FROM EVERY OTHER WORKFLOW

1. **It starts from the requirement, not the code.** The primary walk is REQ-ID → `Covers` → story →
   AC → test (Phase 3). Starting from code would miss a changed requirement that **no story has built
   yet** — precisely the case a Change Request exists to catch.
2. **It versions requirements.** `REQ-F-03` becomes `REQ-F-03@v2`, prior text retained
   (`common/requirement-versioning.md`). Nothing else in the framework mints a version.
3. **One gate, everything staged.** Nothing reaches disk until the operator answers Phase 9 (CR16).
4. **It stops at the contract.** It amends requirements, stories and manual test plans, then hands
   off — no branch, no code, no gate chain, no PR. The build is `dev-implement`'s job, and keeping it
   there means code and the tests that assert it change together, under one set of gates.

**The verbosity contract binds every phase below.** V1 one report, not a running commentary · V2
cite evidence on every finding · V3 counts before lists before detail · V4 every decision with the
alternative it rejected · V5 never summarise at the gate · V6 continuous progress during the apply ·
V7 fact-only — no severity adjective, no advisory verb, in any output or artifact (CR14) · **V8
ASCII-only diagrams, equal-width box lines (`common/ascii-diagram-standards.md`); `├── └──` tree glyphs
are the one carve-out** · V9 audit parity. Full text: `common/change-request-rules.md` Section 3. The
sample output blocks in each phase show the required shape, not fixed wording.

---

## THE ONLY QUESTION IS THE SINGLE GATE (Phase 9)

**The run asks exactly one thing: approve the staged Change Request.** It never asks a clarifying
question, never offers a menu of options, and never asks for a decision mid-run.

- **The input is a change-request story** — `epic-change-request <TICKET-ID>`, usually the story
  `intent-intake` created with the `change-request` label. With the ID on the keyword the run goes
  **straight to analysis**: the gate stays the only question.
- **A bare `epic-change-request` gets one question first** (Phase 0.5): which change-request story. It
  asks for the story's ID, never what the change means. It is the only question that can precede the
  gate, it is asked once, and passing the ID with the keyword skips it entirely.
- **Where a decision is needed, the framework decides, and the bundle says so.** Every such decision is
  written into `change-request.md` Section 9 with its reason and the alternative it rejected (V4).
  The operator overrules any of them with Request Changes — that is the only channel, and it is enough.
- **Approval authorises everything the bundle lists**: the requirement amendments and version bumps, the
  new/CR-born/amended stories, the Test Change Authorization list, the tracker actions and links, the
  dependency edges, an `architecture.md` amendment, and the push.
- After approval the run is fully automatic through to the commit and the handoff.
- The sanctioned halts stay (they are not questions): a Phase 4 block, a CR12 dependency cycle, a
  Phase 8 pre-emission failure, and a failed push at Phase 10.4.

---

## SINGLE-SESSION EXECUTION — NO FORKS

`workflows/dev-implement.md` Step 1.7 applies to this whole workflow, unchanged: every step runs in the
session where the keyword was typed; nothing is delegated to a fork, subagent, Workflow-tool run,
background or remote agent, second session or `claude -p` subprocess. `agents/change-request-analyst.md`
executes inline. This workflow makes no Agent-tool calls at all. A run inside a fork or subagent
HALTS at Phase 0.

---

## MANDATORY: Rule Details Loading

Resolve `aire-workflow/` and load:
- **`common/change-request-rules.md`** — CR1–CR17 + CR13-V. THE source of truth for this workflow's
  semantics; rule IDs below refer to it and are never restated inline.
- **`common/requirement-versioning.md`** — the `@vN` model and RV-1…RV-7.
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`,
  `common/audit-logging.md`, `common/tracker-sync.md`, `common/branching-strategy.md`,
  `common/requirements-traceability.md` (Rules 1–6 and Rule 8), `common/directory-structure.md`,
  `common/parallel-work-state.md`, `common/ascii-diagram-standards.md`
- **`agents/change-request-analyst.md`** — the read-only analyst, executed inline at Phases 2–4.
- `workflows/dev-implement.md` — for its contracts, not its steps. This workflow never executes its
  branch, generation, gate-chain or PR steps; it hands those to `dev-implement` (Phase 11). What binds
  here is Step 1.7 (single-session) and the rule that an existing test plan is **read, never rewritten
  to match code**.

---

## SELF-HEALING RETRY POLICY

**This workflow runs no gate chain, so it owns no gate loop.** The only bounded loop here is the
Phase 9 revise-and-re-present cycle, driven by the user's `Request Changes`.

**SH-LOOP-6 (Test Impact Reconciliation)** belongs to the **build**: `dev-implement` runs it against
the Test Change Authorization list this CR wrote into the bundle (`common/self-heal-limit-guidance.md`).
A halted build of a CR story is handed back to `dev-implement`, never to this workflow.

---

## MANDATORY: Audit Entry Format

`workflows/dev-implement.md`'s format (`User Email`, `User Input`, `TRACKER ITEM`, `Epic Link`,
`AIRE VERSION`, `AI Response`, `Context`) plus one field on every entry:

```markdown
**CHANGE REQUEST**: "CR-<n> — <change-request story ID> — spec/plans/change-requests/CR-<n>/"
```

Append only; timestamps from one real clock command. **V9 — audit parity**: what the operator saw is
what the audit records, never a shorter paraphrase.

---

## PARALLEL-SAFE STATE — THIS RUN IS A DOCS-BRANCH WRITER (`common/parallel-work-state.md`)

This workflow commits on the epic branch itself (the docs branch — through `.aire-docs/` when that
worktree exists, `common/branching-strategy.md` Section 4) and creates no story branch, so it is a
docs-branch writer in every case:

- It writes the shared `runtime-artifacts/aire-state.md` and `runtime-artifacts/audit.md` directly,
  pulling immediately before and pushing immediately after the commit
  (`common/parallel-work-state.md` Section 6), so a concurrent story run never races it.
- The CR story's Story Tracker row, its dependency-graph node and the requirement deltas go to the
  shared sections — `## Story Tracker`, `spec/plans/dependency-graph.yml` + `## Dependency Graph`,
  and `## Change Request Additions`.
- **No `runtime-artifacts/stories/…` fragment is created.** The CR story gets one when
  `dev-implement` claims it, under its own key `story-<N.M>`.
- No State Isolation Check and no evidence folders — both are build-time concerns.

Reads use the resolved view (`common/parallel-work-state.md` Section 4), so a story another clone is
mid-build on is seen at its true state.

**`cr-<n>` is the bundle's identifier, never a story key.** The only story key this cycle gains is
`story-<N.M>`, minted by `dev-implement` when it builds the CR story.

---

## Phase 0 — Single-Session Check + Preconditions

**Emit this first, verbatim, before any work:**

```
-------------------------------------------------------------------
  AIRE Change Request -- a requirement changed mid-epic
-------------------------------------------------------------------

  Something you already agreed has been revised. I work out what that
  touches -- which requirements move, which stories promised the old
  text, and which tests assert it -- then show you one report and ask
  you once.

  For each affected story I decide one of three things, and tell you why:

    ALREADY BUILT       its code is merged, so I do NOT edit it.
                        A new story replaces the part that changed.
    NOT STARTED YET     no code exists, so its spec is amended in place.
                        No new story needed.
    NOTHING COVERS IT   the requirement is new to the epic.
                        A new story is created for it.

  Two ground rules:
    - Nothing is written to disk until you approve.
    - A story being built right now, or with an open PR, stops me
      rather than having its contract changed under it.
```

Then work quietly through Phases 0–8 (V1), emitting only a progress note when a step takes real
time, and only a halt when something blocks. The findings surface once, at Phase 9.

1. **Fork check** — execute `workflows/dev-implement.md` Step 1.7 (the framework-wide single-session
   rule), substituting `epic-change-request`. Inside a fork or subagent → HALT with that step's message,
   change nothing. This workflow has no halted-build state to resume: a re-run starts a fresh analysis,
   and an earlier run that halted wrote nothing (CR16).
2. `runtime-artifacts/aire-state.md` exists with `## Branching` → `Epic Branch` recorded and no
   `Workflow Type: bug` / `Workflow Type: enhancement` in `## Tracker`. Otherwise → stop:
   `No open epic cycle here — a requirement change outside an epic cycle belongs to a base-branch cycle (ticket-implement).`
3. The change-request story is known — from the keyword's `<TICKET-ID>`, or from Phase 0.5, which runs
   at this point when the keyword carried no ID.
4. **Working tree (CR2)** — `git status --porcelain` must be empty. Anything modified → stop, listing
   exactly which files. Never stash or discard for the operator.
   After the STOP CHECKPOINT the epic branch lives in the docs worktree `.aire-docs/`
   (`common/branching-strategy.md` Section 4 item 5): when it exists in this clone, items 4–5 and every
   later git step of this run operate there (`git -C .aire-docs …`).
5. `git fetch origin && git checkout <epic-branch> && git pull --ff-only` (with the docs worktree:
   `git -C .aire-docs pull --ff-only`).
6. **The cycle is still open**: `spec/`, `spec/plans/requirements.md`, `spec/plans/stories.md` and the
   Story Tracker are present, and `aire-archives/epics/<EPIC-ID>-*/` does not exist. Archived → stop: the
   change belongs to a base-branch cycle after the Epic PR merges, or the operator reverts the archive
   commit first.
7. Read `## Tracker`, `## Code Root` and `team_size`. Log the preconditions.

**Emits nothing on success** (V1) — the resolved values go to the audit trail and the report's header.
A failed precondition is a halt and prints immediately: what was expected, what was found, and the
exact command to fix it.

---

## Phase 0.5 — Story ID (ONLY when the keyword carried no ID)

**Skip this phase entirely when the keyword carried a `<TICKET-ID>`** — Phase 0 goes straight on to
item 4. It asks which story, never what the change means; it is asked once and never re-asked.

```
  Which change-request story? (Azure DevOps work item ID or URL)
```

Fetch it per `common/tracker-sync.md` Section 8. An ID that does not resolve → say so and re-ask once,
then exit with `Nothing was analysed and nothing was written.`

Log the question and the raw answer.

---

## Phase 1 — Read the change-request story

Fetch the story per `common/tracker-sync.md` Section 8 — summary, description, acceptance criteria,
labels, links. The snapshot pair is current `requirements.md` → the amendment the story describes,
constructed in memory and never written to `requirements.md` before the gate; the analyst states
plainly that the text does not yet exist on disk.

Where the story leaves something open (a limit, a rule, a message text), **do not ask**: choose the
reading most consistent with the approved ACs, `requirements.md`, `architecture.md` and the existing
code, and record it as an assumption in `change-request.md` Section 9 with the alternative not taken.

Log the invocation and the story verbatim. Emits nothing (V1) — the story and the snapshot pair
appear in the report header.

---

## Phase 2 — Requirement anchor-resolution diff (CR3)

Invoke `agents/change-request-analyst.md` inline (never as a subagent) with the snapshot pair.

Match by REQ-ID, never by line number, position or semantic similarity alone. Classify each
requirement AMENDED / ADDED / SUPERSEDED / UNCHANGED per `common/requirement-versioning.md` Section 2.

An ID that cannot be resolved is reported as unresolved, never guessed at — it fails predicate
CR3 and the run HALTS (a halt, not a question).

**Emits nothing** beyond a progress note if the scan is slow (`Analysing <N> requirements…`). The
classifications and before/after text go to `requirements-delta.md` and the report's REQUIREMENTS block.

---

## Phase 3 — Impact ledger: REQ -> stories -> ACs -> tests (CR6)

The analyst performs five walks. No artifact is "affected" without a recorded reason.

1. **REQ → stories (primary walk)** — every story whose `**Covers**:` names the changed REQ-ID.
   Normalise `@vN` from both sides before matching. Exact, not heuristic: Rule 2 makes `Covers`
   mandatory and non-empty. Cite the `Covers` line. **A changed REQ-ID with no covering story is
   reported explicitly** — it routes to a new story.
2. **Story → ACs** — the ACs implementing that requirement, each classified UNCHANGED / AMENDED /
   SUPERSEDED. Where `stories.md` has an AC-level `AC-n → REQ-ID` breakdown, use it; where it does not,
   every AC is a candidate and the ledger states which were judged in scope and why.
3. **Story → code (confirmation walk)** — two independent sources, recording whether they agree:
   base-branch history since the epic started (`git log --format='%H %s'
   $(git merge-base origin/<epic-branch> origin/<base>)..origin/<base> -- <path>`, subjects carry
   `[Story N.M / TRACKER-ID]`) and `git blame -w -M -C -L <range> -- <file>`. Agreement is reported as
   `n/2`. Read the code — never infer relevance from a file's name.
4. **Story → tests** — the unit tests under `tests/unit/**` that assert an affected AC, plus the cases
   in `test-plans/<cycle>/<ID>-*/` (read per `common/branching-strategy.md` Section 7.3). This list is
   the input to the Test Change Authorization list (CR10).
5. **Concurrency scan** — every story `In Progress` without a merged PR, and the cycle's open `[TEST]` PR,
   whose diff touches the change surface (changed files via `common/repo-host.md` RH-6).

Emit the impact tags (CR8): `affects_requirements`, `affects_stories`, `affects_shipped`,
`code_touched`, `doc_only`.

**Emits nothing** beyond a progress note (`Tracing <N> stories…`). The complete evidence chain — every
citation, every agreeing source, every test path — is written to `impact-ledger.md`; the report shows one
row per affected story and cites that file.

---

## Phase 4 — Routing (CR9)

Route every affected story on its pre-run status and its live PR merge state.

**Status is read from the git snapshot** — `git show origin/<epic-branch>:runtime-artifacts/aire-state.md`
plus the committed `runtime-artifacts/stories/*/state.md` fragments, resolved per
`common/parallel-work-state.md` Section 4 — never from the working tree, which the operator may have
edited. Merge state is confirmed live (`common/repo-host.md` RH-2; with no remote,
`git branch --merged <base>`) and is the authority over any tracker status
(`common/tracker-sync.md` "Merge State Authority"). Both are re-asserted immediately before the Phase 10
writes (TOCTOU).

| Story state (git snapshot) | PR state (live) | What the user is told | Route (internal) | Why |
|---|---|---|---|---|
| `ToDo` | — | **NOT STARTED YET** → its spec is amended in place; no new story | `spec-only` | No code exists, so the contract can be corrected directly |
| `In Progress` | no PR yet | **BEING BUILT RIGHT NOW** → blocked | **HALT** | Never change a spec under an in-flight build |
| `In Progress` | PR open, unmerged | **HAS AN OPEN PR** → blocked | **HALT** | Its code is not on the base branch yet → comment on that PR and run `pr-fix <PR>`, or get it merged and re-run |
| any status after `ToDo` except `Closed` (`In Progress`, `Ready for Testing`, `In Testing`, `Bug fixing`) | PR **merged** | **ALREADY BUILT** → a new story replaces the part that changed | `CR-born` | Code is merged; it is never edited in place |
| `Closed` | merged | **ALREADY BUILT, CLOSED** → a new story replaces the part that changed; status **not** moved | `CR-born` | The Verification Engineer already closed it; re-verification rides the CR story's test plan |
| no story `Covers` the REQ | — | **NOTHING COVERS IT** → a new story is created | `new` | A requirement new to the epic needs its own story |

**Say the outcome, then the internal term** (V3). The report leads with what happened and why —
`ALREADY BUILT (PR #31 merged) -> Story 1.10 replaces its contract for AC-4  [CR-born]` — so a reader
who has never opened `common/change-request-rules.md` understands it, while the bracketed term keeps
every row traceable to the CR9 rule that produced it.

- **Every affected story is `ToDo`** → the **spec-only path**: no CR story is created;
  the amended contracts are committed and the stories are built as usual.
- **Any block** → HALT before writing anything. Emit it in the same plain language as the report,
  so the user knows what to do without reading a rule file:

```
  CANNOT PROCEED -- 1 story is mid-flight

  1.6  Auth Pages & Session
       BEING BUILT RIGHT NOW (claimed, no PR yet)
       Its contract cannot change while someone is building against it.

  What to do:
    - finish and merge Story 1.6, then run epic-change-request again, or
    - if it already has a PR open, put this change on that PR:  pr-fix <PR>

  Nothing was written.
```

Log it. (A halt, not a question.) Emits nothing on success — the routing table is the report's
STORIES block.

---

## Phase 5 — CR collision check (CR11)

Glob `spec/plans/change-requests/CR-*/change-request.md` and grep each affected story-id in their
`## 3. Impact` tables. An open CR is one whose story has no merged PR yet.

- **Collision found** → APPEND to that CR's affected-stories set rather than drafting a parallel CR
  over the same ground. Record it and continue — a stated fact, not a question. The run then carries
  the existing `CR-<n>` number through every later phase.
- **No collision** → recorded explicitly as `none`.

**Emits nothing** — the result (a collision and its CR, or none) appears as one line in the report
header.

---

## Phase 6 — Requirement versioning (CR4)

Apply `common/requirement-versioning.md`:

- **AMENDED** → `@v<N+1>`; prior text retained, struck through, annotated `Amended by CR-<n> on <date>`.
- **ADDED** → a new `REQ-F-<next>` / `REQ-NF-<next>`, unversioned. Never `@v1` (RV-3).
- **SUPERSEDED** → retained and marked. Never deleted — Rule 1 forbids reusing a removed ID, so
  the record must stay visible.
- **UNCHANGED** → byte-identical (RV-5).

Then re-point every covering story's `Covers` to the new version, or route that story as blocked
(CR5). A `Covers` naming an older version while a newer exists is a stale trace — a blocking gap of
the same class as Rule 3's gap A.

**Emits nothing** — version transitions appear in the report's REQUIREMENTS block and in full in
`requirements-delta.md`.

---

## Phase 7 — Stage everything in memory (CR16 — nothing on disk yet)

**No file is written in this phase.** Everything is composed in memory and held for the gate.

### 7.1 Numbering (CR12b)

Read `CR-*` ids and the Story Tracker **from `origin/<epic-branch>` immediately before assigning**:
next CR id = `max(n) + 1` (per-epic, not zero-padded); next story number = the next free `N.M`. Both are
re-verified immediately before the push (Phase 10). On collision: renumber and announce.

### 7.2 The bundle

```
spec/plans/change-requests/CR-<n>/
├── change-request.md        # CR bundle format 1 — 10 sections
├── requirements-delta.md    # CR bundle format 2
└── impact-ledger.md         # CR bundle format 3
```

The three formats are defined in CR bundle format at the end of this file.

**Before composing, read first** — without these the content is generic: the body of every story being
superseded or amended; the changed requirements' full text (both revisions); the code implementing the
affected stories (from their `## Implementation steps` and the Phase 3 ledger); the affected test plans.

### 7.3 CR12 — dependency-cycle check

Walk the `requires` graph across every affected and proposed story (Tarjan SCC). An SCC of size > 1
intersecting the CR's scope means there is no safe ordering → ABORT, print the cycle members,
write nothing. Cycles elsewhere are reported and do not block.

### 7.4 Staged spec edits

- **`spec/plans/requirements.md`** — the version annotations (Section 3 of the versioning file).
- **`spec/plans/stories.md`** — the CR story appended in the same format as every other story
  (`**Tracker ID**:`, `**Covers**:`, `**Requires**:`, `**Change Request**: spec/plans/change-requests/CR-<n>/`);
  every AMENDED / SUPERSEDED AC of earlier stories annotated in place —
  `AC-3 (amended by CR-<n>, <date>): <new text>`, old text struck through, never deleted; the
  `## Requirements Coverage Matrix` rebuilt (Rule 8 item 3).
- **`test-plans/<cycle>/**`** — via the `ve-implement` skill in WORKFLOW MODE only: once for the CR
  story (its plan carries a "Re-verification of affected stories" section) and once per affected story,
  scoped to its AMENDED / SUPERSEDED ACs. Never hand-edited. Written in the test-plan worktree and
  published through the cycle's `[TEST]` PR into the Base Branch (`common/branching-strategy.md`
  Section 7.2) — never on the epic branch.
- **`spec/plans/architecture.md`** — only when the change alters a design decision: amend per
  `implementation/architecture-doc.md` and bump its version.
- **Dependency graph** — `spec/plans/dependency-graph.yml` and the shared `## Dependency Graph`
  directly. It records the CR story's node with its `requires` / `enables` / `touches`, and any new
  edge from a not-yet-started story onto it. Run the R6 plan-time check
  (`planning/dependency-graph-generation.md`) with the CR story included and add its R6 edges.
- **Rule 4 record** — `Requirements coverage verified post-design: [R]/[R] REQ-IDs — [timestamp] (re-verified after CR-<n>)`.

### 7.5 Coverage check (blocking, fixed silently)

Every CR-story AC and every AMENDED AC has ≥1 test case; none remains for a SUPERSEDED AC; every amended
requirement has a story tracing to its new version (CR5 — no stale traces).

**Emits nothing** — the manifest of what will be written appears in the report as per-bucket counts
(`CR bundle 3 · stories.md 1 · test plans 2 · …`). A CR12 dependency cycle is a halt and prints
immediately.

---

## Phase 8 — Pre-emission validation (CR13)

Eight checks against the in-memory staging, before the preview. First failure HALTS — a
malformed bundle is never shown to the operator.

| # | Check |
|---|---|
| (a) | **Route coverage** — every affected REQ-ID is routed **exactly once** (CR-born, spec-only, or new story). Both → fail (over-counted). Neither → fail (uncovered). |
| (b) | **Supersede integrity** — every CR-born story names a real story in `supersedes`, and that story's PR is confirmed merged. |
| (c) | **Dependency inheritance** — every CR-born story's `requires` is a superset of the superseded story's, minus ids superseded in this same CR. |
| (d) | **Bundle inventory** — `change-request.md`, `requirements-delta.md`, `impact-ledger.md` all present. |
| (e) | **Section presence** — `change-request.md` carries all 10 `## ` sections in order, empty ones written as `(none — <reason>)`. |
| (f) | **Fact-only scan (CR14)** — regex for severity adjectives and advisory verbs across every staged artifact; count must be 0. |
| (g) | **Coverage** — Phase 7.5's result; plus RV-1…RV-7 from `common/requirement-versioning.md`. |
| (h) | **One CR per run** — exactly one bundle is staged, unless this is a CR11 append (which stages zero new bundles and edits one existing). |

**Emits nothing on success** — all eight results are computed, recorded in the audit trail, and
summarised in the report as `pre-emission: 8/8 PASS`. Any failure is a **halt**: it prints the failed
check, the offending file/section, the rule violated and the remediation, and the report is never shown.

---

## Phase 9 — THE SINGLE GATE (CR16 / V5)

**This is where the whole run surfaces.** Phases 0–8 worked quietly; everything they found is
presented here, once, as one scannable report — then the run halts for the only question it asks.

**Nothing has been written to disk at this point.**

**Shape (V3): counts → table → decisions.** Every number is real; the deep evidence is in the bundle
and is cited, never pasted (V2/V3/V5). The report fits on roughly one screen.

```
+-------------------------------------------------------------------+
|  CR-<n>  --  REVIEW BEFORE APPROVING                              |
|  Nothing has been written to disk.                                |
+-------------------------------------------------------------------+

  <one-line summary of the change, in the user's own words>

  Story       : <TICKET-ID> <title>
  Epic branch : <epic-branch> @ <sha>          Project: <ADO project>
  Bundle      : spec/plans/change-requests/CR-<n>/     (staged, not written)
  Collision   : <none | appending to CR-<m>>           Pre-emission: 8/8 PASS

WHAT CHANGED IN THE AGREEMENT    <A> amended, <B> added, <C> withdrawn, <D> untouched
  <REQ-ID> -> @vN   <what differs, one line>

WHAT THAT MEANS FOR YOUR STORIES     Blocked: <none | N -- see below>
  <N.M>  <title>
         ALREADY BUILT (PR #<n> merged)
         -> Story <X.Y> replaces its contract for <AC-n>          [CR-born]
  <N.M>  <title>
         NOT STARTED YET
         -> its acceptance criteria and test plan are amended in place  [spec-only]
  --     (nothing covers <REQ-ID>)
         -> new Story <X.Y>                                        [new]

  Nothing already built is edited in place. <X> new, <Y> amended, <Z> untouched.

TESTS          <n> may change; <m> stay as regression guards
  <file>  <test>  <action>  <- <AC-n> <class>
  ...  full list in the bundle

WRITES         <N> files, all inside the allow-list
  CR bundle <n> · requirements.md <n> · stories.md <n> · test plans <n>
  architecture <n> · dependency graph <n> · state <n>        outside allow-list: 0

DECISIONS I MADE FOR YOU  (overrule any with Request Changes)
  1. <decision> -- <why>.  Rejected: <alternative>.
  2. ...

  Full detail: spec/plans/change-requests/CR-<n>/change-request.md
               (+ requirements-delta.md, impact-ledger.md -- open them to see every citation)

A) Request Changes -- tell me what to change
B) Approve & Apply -- amend the specs and commit them to <epic-branch>,
   then hand the build to dev-implement

[Answer]:
```

**What this report must NOT do**: paste the `change-request.md` body (it is staged and its path is
printed — re-printing it buries the decision); reprint the per-phase working state; or list every
citation when the ledger holds them. The user decides from this screen and opens the bundle when they
want the proof.

- **`A`** → revise the staging (a requested change to a Section 9 decision moves that row to "decided by
  the user" with their wording), add a Section 10 revision entry, re-run Phase 8, present again.
  Nothing has been written, so there is nothing to roll back.
- **`B`** → Phase 10.
- Any other answer → re-prompt: `Please answer A (Request Changes) or B (Approve & Apply).`

Log the prompt and the complete raw answer.

---

## Phase 10 — Apply

**Everything below happens only after the Phase 9 `B`.** Writes are ordered; a sub-step failure HALTS
with rollback instructions (`git status` + `git restore`) rather than leaving a partial apply (CR16).
Each write announces its path and line count (V6).

### 10.1 Re-assert routing before writing (TOCTOU)

Re-read every affected story's snapshot status and confirm its live PR merge state exactly as
Phase 4 did. Any story that changed state since the analysis → HALT and re-run; never write against
stale routing. Re-check the CR id and story number against `origin/<epic-branch>` (CR12b); renumber,
and announce, if either was taken.

### 10.2 Tracker and state

Runs before the spec writes, so the CR story's `**Tracker ID**:` is known when `stories.md` is written.

1. **Tracker item** (`common/tracker-sync.md`): create the CR
   story linked to the Parent Epic (Section 3 labels/fields — AC in the Acceptance Criteria field only,
   never in the description — Section 6 link, `Built with AIRE v[N]` footer), left in the
   mapped ToDo status (`common/status-model.md` S1). Verify. Do not move it to In Progress and
   do not assign it — `dev-implement` claims it. (Spec-only path: no tracker item is created.)
2. **Story Tracker row** in the shared `runtime-artifacts/aire-state.md`: Story `<N.M>`,
   `ToDo`, `Requires` from the bundle, `Recorded` set.
3. **Comment on every affected story's tracker item**:
   `Requirement amended by CR-<n>: <REQ-IDs@vN>. Delivered by Story <N.M>.` (spec-only: `Acceptance
   criteria amended by CR-<n>: <AC list>.`, with the AC text updated in the item's Acceptance Criteria
   field per `common/tracker-sync.md` Section 3.1 — never in its description).
4. **Comment on the change-request story**: `Applied by CR-<n>: <REQ-IDs@vN>. Delivered by
   Story <N.M> (<Tracker ID>).` (spec-only: `Applied by CR-<n>: <REQ-IDs@vN>. Stories <X.Y, …> amended
   in place; nothing to build.`), and link the CR story to it as related
   (`az boards work-item relation add --relation-type "System.LinkTypes.Related"`).
   Verify.
5. **Epic sync**: Parent Epic already `Closed` → move it back to `In Progress` (authorised by the gate),
   verify, log.

### 10.3 Write the bundle and the approved spec edits

In this order, each re-asserting the snapshot status immediately before it:

1. **The CR bundle** → `spec/plans/change-requests/CR-<n>/` (3 files).
2. **`spec/plans/requirements.md`** — version annotations.
3. **`spec/plans/stories.md`** — the CR story appended; every AMENDED / SUPERSEDED AC annotated in
   place, old text struck through, never deleted; the `## Requirements Coverage Matrix` rebuilt.
4. **Test plans** — the `ve-implement` skill in WORKFLOW MODE (never re-implemented), once for the
   CR story and once per affected story scoped to its AMENDED / SUPERSEDED ACs, in the test-plan
   worktree opened before the first one (`common/branching-strategy.md` Section 7.2 items 1–2).
5. **Architecture** — only when the bundle records a design change.
6. **Dependency graph** — `spec/plans/dependency-graph.yml` + the shared `## Dependency Graph`.
7. **Rule 4 record** — refresh `Requirements coverage verified post-design: …(re-verified after CR-<n>)`.

### 10.4 Commit the spec edits on the epic branch

1. **Coverage check (blocking, fixed silently)** — Phase 7.5's check, re-run on the written files.
2. **Commit on the epic branch** — pull immediately before and push immediately after
   (`common/parallel-work-state.md` Section 6):
   `[CR-<n>] Amend <REQ-IDs@vN>; Story <N.M> created` (spec-only:
   `[CR-<n>] Amend <REQ-IDs@vN> and Story <X.Y>[, …]`) with the `AIRE-Version: [N]` trailer.
   Staged: the CR bundle, `requirements.md`, `stories.md`,
   `spec/plans/architecture.md` when a design decision changed, `spec/plans/dependency-graph.yml`, and
   the shared `runtime-artifacts/aire-state.md` + `audit.md`.
3. **Push.** If the push fails, say so and stop — `dev-implement` cannot start until the specs are on
   origin.
4. **Publish the test plans** — the test-plan commit, push and `[TEST]` PR into the Base Branch
   (`common/branching-strategy.md` Section 7.2 items 4–6). Automatic; it asks nothing.

The CR story is left `ToDo` and unclaimed — `dev-implement`'s own Story Selection
makes the claim, as it does for every other story.

### 10.5 What `dev-implement` inherits

The CR leaves behind everything the build needs, and nothing it must re-derive:

| Artifact | State on handoff | Who consumes it |
|---|---|---|
| `requirements.md` | amended, `REQ-F-nn@vN` versioned, prior text retained | `dev-implement` planning (REQ-ID thread, Rule 5) |
| `stories.md` | CR story appended; earlier stories' AMENDED/SUPERSEDED ACs annotated in place | planning + Code Review scope |
| `test-plans/<cycle>/**` (the `[TEST]` PR) | **written/amended by the CR** via `ve-implement` WORKFLOW MODE | `dev-implement`'s test-plan check; the Verification Engineer once the story is deployed to DEV and `In Testing` |
| `change-request.md` Section 6 | the implementation plan | `dev-implement` grounds its own plan on it |
| **Test Change Authorization list** (Section 5b) | the earlier stories' **unit tests** that may change, each traced to an AMENDED or SUPERSEDED AC | **`dev-implement`** — it updates them during generation and proves the result with Test Impact Reconciliation (SH-LOOP-6) |

**The spec/code split is the whole point of the handoff:**

- **The CR owns the spec layer** — requirements, acceptance criteria and manual test plans. They are the
  *contract*, they must exist before code, and amending them is a requirement decision, not a coding one.
- **`dev-implement` owns the code layer** — unit tests assert *implementation*, so they change when the
  code changes, in the same commit, under the same gates.

Updating an obsolete unit test before the code that makes it correct would leave the base branch red
with no way to tell a legitimate amendment from a break. So the CR names those tests and does not
touch them.

### 10.6 CR13 self-verification

Print the Section 2 predicates of `common/change-request-rules.md` with computed results — CR3, CR4,
CR5, CR6, CR8, CR9, CR11, CR12, CR12b, CR14, CR16, CR13-V — plus RV-1…RV-7. A predicate that could not be
computed counts as fail. CR10 is recorded as **staged, not enforced**: the Test Change
Authorization list is handed to `dev-implement`, which enforces it at its own Test Impact Reconciliation.

---

## Phase 11 — Handoff to `dev-implement` (verbatim, the last output)

**When the CR created a story to build:**

```
  CR-<n> APPLIED -- specs amended. No code was written.

  Requirements : <REQ-F-nn -> @v2, REQ-F-mm added, REQ-F-kk withdrawn>
  Story <N.M>  : <title>          ToDo (unclaimed)
  Amended      : <Story X.Y AC-n, ...> -- their acceptance criteria were
                 updated in this commit, their manual test plans in [TEST] PR <TEST PR URL>.
  Bundle       : spec/plans/change-requests/CR-<n>/
  Commit <sha> pushed to `<epic-branch>`.

  <n> earlier test(s) now assert behaviour the agreement no longer requires.
  They are listed in the bundle's Test Change Authorization list and are
  updated by the build -- not here, because changing them before the code
  exists would leave the branch red with no way to tell an authorised
  amendment from a break.

NEXT ACTIONS:
   1.  Build it:  dev-implement <N.M>
       It reads the CR's plan and the authorization list, writes the code,
       updates exactly those tests, runs every gate, and raises the [STORY] PR.
   2.  The Verification Engineer can review the amended test plans now --
       they are in [TEST] PR <TEST PR URL>, into `<base-branch>`.
       Changes needed? /ve-list-work -> C updates that PR.

Type the keyword EXACTLY as shown -- any other phrasing is not a framework trigger.
```

**Spec-only (nothing needs building — every affected story was not yet started):**

```
  CR-<n> APPLIED -- specs amended. Nothing needs building.

  Requirements : <REQ-F-nn -> @v2, ...>
  Amended      : <Story X.Y AC-n, ...> -- not started, so their contracts were
                 corrected in place. No new story was created.
  Test plans   : [TEST] PR <TEST PR URL>, into `<base-branch>`.
  Bundle       : spec/plans/change-requests/CR-<n>/
  Commit <sha> pushed to `<epic-branch>`.

NEXT: those stories are built as usual, against the corrected contracts:
      dev-implement <X.Y>
      Verification Engineer: review the test plans in the [TEST] PR (changes: /ve-list-work -> C).
```

Log which variant was shown.

---

## CR bundle format

All three files are written at Phase 10.3 into `spec/plans/change-requests/CR-<n>/`. Every row cites its
evidence (CR6); the text is fact-only (CR14); `[N]` is read live from `CLAUDE.md`.

### Format 1 — `change-request.md` (all 10 `## ` sections, in order; an empty section reads `(none — <reason>)`)

```markdown
# CR-<n> — <one-line summary>

Mode: CHANGE REQUEST · Story: <TICKET-ID>
Epic: <EPIC-ID> (<epic link>) · Epic branch: <branch> @ <sha>
Written: <ISO timestamp> · AIRE v[N] · Produced by: epic-change-request (CR17)

## 1. The change
<What changed in the agreement and what it now requires, in two to five sentences.>
**Source**: <change-request story link>

## 2. Requirements — delta and versions
| REQ-ID | Class | Version | Before → After |
Unchanged: <N> requirements, byte-identical. Full detail: `requirements-delta.md`.

## 3. Impact — stories, acceptance criteria and tests
| Story | Pre-run status (snapshot) | PR state (live) | AC | AC class | Route | Evidence |
Blocked stories: <list with the exact way forward, or `(none)`>. Full ledger: `impact-ledger.md`.
**Impact tags** — `affects_requirements: <N>` · `affects_stories: <N>` · `affects_shipped: <bool>` ·
`code_touched: <bool>` · `doc_only: <bool>`

## 4. Resolution — what this CR does
### 4a. CR-born stories (supersede a story whose code is merged)
Story <N.M> — <title> · Covers: <REQ-IDs@vN> · Supersedes: <story> · Requires: <stories> · Enables: <stories>
Acceptance criteria:
- AC-1 …
### 4b. Spec-only amendments (stories not yet started)
| Story | ACs amended | Test case(s) |
### 4c. New stories (no story covered the requirement)
Story <N.M> — <title> · Covers: <REQ-IDs> · Epic: <Epic-N>

## 5. Test impact
### 5a. Test plans — per story: test cases added / amended / retired
### 5b. Test Change Authorization list (CR10)
| File | Test | Action (`update assertion` / `delete — dead`) | Traces to |
A unit test **not** on this list must pass unmodified; every other red test is a regression fixed in the
application code. New tests may always be added.
### 5c. New unit tests to add

## 6. Implementation plan
The plan `dev-implement` builds from — checkboxes marked `[x]` as steps complete.
- [ ] Step 1 — … (REQ-F-03@v2, AC-1)
- [ ] Step N — Unit tests to the coverage minimum (`implementation/code-generation.md` Step 11a), then the remaining code gates and the judge score checkpoint in their order: API contract tests when an endpoint changes (11a.5), test placement (11b), full regression (11c), static evals (11c.5), the J1/J2 judge score checkpoint (11c.6), test-plan check (11d)
**Trace check**: every CR story AC and every AMENDED/SUPERSEDED AC appears in ≥1 step
(`common/requirements-traceability.md` Rule 5).

## 7. Tracker, state and dependency actions on approval
Tracker story created · linked to Parent Epic · comments on affected stories · comment and related
link on the change-request story · Epic reopened (only if already Closed) · dependency edges added ·
Story Tracker row.

## 8. Warnings
Concurrent in-flight stories on the change surface · an open `[TEST]` PR on affected test-plan folders ·
architecture impact · anything the analysis could not resolve. `(none)` if empty.

## 9. Decisions & assumptions — made by the framework (overrule any with Request Changes)
| # | Decision | Why | Alternative not taken |

## 10. Revision log
| # | When | What changed | Trigger |
```

### Format 2 — `requirements-delta.md`

```markdown
# CR-<n> — Requirements Delta
Epic: <EPIC-ID> · Written: <ISO timestamp> · AIRE v[N] · Story: <TICKET-ID>

## Summary
| Class | Count | REQ-IDs |
(AMENDED / ADDED / SUPERSEDED listed by ID; UNCHANGED as a count only)

## AMENDED
### REQ-F-03 → REQ-F-03@v2
**Before (v1)** · **After (v2)** — verbatim text of each
**What changed**: <one factual sentence>
**Covering stories re-pointed**: <story → Covers now names @v2 | routed as blocked>
**As written into `requirements.md`**: <the block per `common/requirement-versioning.md` Section 3>

## ADDED
### REQ-F-<next> — <title>
<verbatim new text> · **Covered by**: <new or CR-born story> · unversioned (RV-3)

## SUPERSEDED
### REQ-F-07 — <title>  *(SUPERSEDED)*
<withdrawn text, retained> · **As written into `requirements.md`** · **Covering stories**: <AC marked
superseded; test case retired> · excluded from the gap-A check, recorded `N/A` with this CR

## Coverage matrix after this CR
| REQ-ID | Current version | Covering stories | Status |   (keyed on bare REQ-ID, `@vN` normalised)

## Version self-check
| # | Predicate (RV-1 … RV-7) | Computed result |
```

### Format 3 — `impact-ledger.md`

Produced from `agents/change-request-analyst.md`'s output; decisions are this workflow's.

```markdown
# CR-<n> — Impact Ledger
Epic: <EPIC-ID> · Epic branch: <branch> @ <sha> · Written: <ISO timestamp> · AIRE v[N]

## 1. Requirement → story   (matched on bare REQ-ID; a changed REQ with no covering story is listed, never omitted)
| REQ-ID | Class | Covering story | Evidence |
## 2. Story → acceptance criteria   (states which ACs were judged in scope and why, where no AC-level breakdown exists)
| Story | AC | Class | Artifacts that move | Evidence |
## 3. Story → code (history + blame)
| Story | Path | History | Blame | Agreement (n/2) |
## 4. Story → tests (the Test Change Authorization input)
| Story | Artifact | Type (unit test / test-plan case) | Asserts AC | Evidence |
## 5. State and routing input
| Story | Pre-run status | Snapshot source | PR | Live merge state | Proposed route |
## 6. Concurrency
| Story / PR | Status | Overlapping path | Evidence |
## 7. Impact tags (CR8)
## 8. Unresolved   (never silently omitted; an unresolved requirement anchor fails CR3)
```

A row with an empty Evidence cell is a defect in the analysis and fails CR6.

---

## Edge cases — every one resolved without a question

| # | Situation | Handling (default recorded in `change-request.md` Section 9 where it is a decision) |
|---|---|---|
| E1 | Affected story not started (`ToDo`) | Spec-only amendment of its ACs and test cases; `requires` edge onto the CR story if its code builds on the change |
| E2 | Affected story being built right now (`In Progress`, no PR) | **HALT — blocked**: never change a spec under an in-flight build; finish it, then `pr-fix` (open PR) or re-run (merged) |
| E3 | Affected story has an OPEN, unmerged PR | **HALT — blocked**: comment the change on that PR and run `pr-fix <PR>`, or get it merged and re-run |
| E4 | Affected story merged, not yet `Closed` | CR-born story; its test plan is amended in the same commit |
| E5 | Affected story already `Closed` | Not reopened; tracker comment; re-verification cases live in the CR story's plan |
| E6 | Parent Epic already `Closed` | Moved back to `In Progress` — stated in Section 7, authorised by the gate, verified |
| E7 | Epic already archived | Stop — the change belongs to a base-branch cycle (`ticket-implement`) after the Epic PR merges, or the operator reverts the archive commit |
| E8 | A changed requirement has NO covering story | **New story** (CR9). This is the case only a requirement-first walk finds; it is reported, never silently dropped |
| E9 | The amendment would violate the Security Baseline | **Default**: the CR story is shaped to comply (adds the missing authorisation / validation); Section 9 records what was reshaped and why |
| E10 | Requirement SUPERSEDED (behaviour withdrawn) | ACs marked superseded (kept); test cases retired; dead tests listed on the authorization list for deletion by the build; requirement retained and marked, never deleted |
| E11 | Two clones mint the same `CR-<n>` or story number | Re-read from `origin/<epic-branch>` right before assignment and again before the push; on collision renumber and announce (CR12b) |
| E12 | Story already belongs to an open CR | **Append** to that CR (CR11), never a parallel bundle |
| E13 | Dependency cycle among affected/proposed stories | **ABORT** (CR12), print the SCC, write nothing |
| E14 | During the build, a test outside the authorization list goes red | Regression — `dev-implement` fixes the code; a test joins the list only if it asserts an AMENDED/SUPERSEDED AC |
| E15 | Another story merges into the base branch during the run | Phase 10.1 re-asserts routing with live merge state; Phase 10.4 pulls the epic branch immediately before the commit |
| E16 | The story is ambiguous (a limit, a rule, a message text) | **Default**: the reading most consistent with approved ACs, requirements, architecture and existing code; Section 9 records the assumption and the alternative |
| E17 | CR story PR rejected | `pr-fix <PR>` — it detects the bundle through the story's `**Change Request**:` field and re-runs Test Impact Reconciliation with the stale-trace check |
| E18 | It is not a requirement change at all — behaviour or a defect | Out of this flow: new/changed behaviour with no requirement change is `epic-enhancement`; a defect is `epic-bugfix`. The run stops with that pointer **before writing anything** |
| E19 | An unversioned `Covers` after its requirement reached `@v2` | **Stale trace** — a blocking gap (CR5); the story is re-pointed or routed |

---

## Critical Rules

- **THE GATE IS THE ONLY DECISION QUESTION.** No clarifying questions, no option menus mid-run, no
  decisions asked of the user after analysis starts. Decisions the framework makes are written into
  Section 9 with their rejected alternative and overruled only via Request Changes. The single
  exception is the Phase 0.5 story ID question, shown only when the keyword carried no ID — it asks
  which change-request story, never what the change means. Blocks, cycles, pre-emission failures
  and a failed push are halts, not questions.
- **NOTHING ON DISK BEFORE THE GATE** (CR1 / CR16). Everything is staged in memory; every written path
  falls inside the `common/change-request-rules.md` Section 4 allow-list.
- **REQUIREMENTS ARE VERSIONED, NEVER RENUMBERED OR DELETED** (CR4). AMENDED → `@v<N+1>` with prior
  text retained; ADDED → unversioned; SUPERSEDED → retained and marked.
- **STATE FROM THE GIT SNAPSHOT, MERGE STATE LIVE** (CR9), re-asserted immediately before writing.
- **NEVER CHANGE WORK IN FLIGHT.** A story being built, or with an open PR, blocks the change.
- **SPECS ONLY — NEVER CODE.** The CR amends requirements, acceptance criteria and manual test plans,
  and names the earlier stories' unit tests the amendment invalidates (CR10) without touching them.
  `dev-implement` changes exactly those, alongside the code, under every gate.
- **NO STATUS DEMOTION, NO MERGING.** Statuses move only as `common/status-model.md` defines; the
  framework never merges a PR.
- **INTO THE EPIC, AS A STORY.** The CR story joins the epic's Story Tracker and dependency graph as
  `ToDo`, and is built by `dev-implement` like any other — never a separate cycle,
  never a new `Workflow Type`, never a change to `## Tracker`'s Parent Epic.
- **SELF-CONTAINED.** This workflow never reads, cites or delegates to `epic-enhancement.md` or
  `epic-bugfix.md`.
- **VERBOSE BY CONTRACT** (CR13-V / V1–V9). No quiet mode, no verbosity flag, no summarising the
  bundle at the gate.
- **SINGLE SESSION, FULL AUDIT.** No forks (Phase 0); every audit entry carries the `dev-implement`
  fields plus `CHANGE REQUEST`; every commit carries `AIRE-Version: [N]`.
