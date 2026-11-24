# WORKFLOW: `dev-implement` (Implementation Phase — Code Generation)

## READ FIRST — THE NON-NEGOTIABLES OF EVERY `dev-implement` RUN

1. **Every gate runs.** No gate is skipped, deferred or "scoped out" to finish sooner. A gate ends only as
   `PASS`, or `N/A` for a reason its own definition allows (the coverage gate's rules are in
   `implementation/code-generation.md` Step 11a). A gate that truly cannot run is an `ERROR` that HALTS the
   run. "Not run this session", "scope call" and "to keep the session moving" are never reasons.
2. **The evidence is complete before the commit** (`common/story-artifacts.md` Section 4). A gate that is
   not `PASS` or a legitimate `N/A` means no commit and no PR: HALT with the Self-Heal Limit message.
3. **The claim happens on the board too, before any branch or code.**
   Move the story's work item to the mapped In Progress AND assign the operator (`common/tracker-sync.md`
   Sections 4 and 5), verify both by re-fetching, and write the results into the fragment's `## Claim` block.
   Updating only the local fragment is a defect.
4. **Disclosing a gap does not make it acceptable.** The moment you notice a gate unrun, a transition
   unmade or a file missing is the moment to do the work — or to HALT with the Self-Heal Limit message.
   Never raise a PR with "disclosed gaps", and never ask the user whether to skip.
5. **The run ends with its exact end message.** A successful run's final output is the Section F Next-Action
   Handoff block, verbatim, every placeholder substituted, and nothing else in that message — no free-form
   summary before it, no gap list, no suggestions after it. A halted run ends with the Self-Heal Limit
   message instead, also verbatim.

---

## THIS WORKFLOW IS FULLY AUTOMATIC — AFTER THE STORY KEY IT ASKS ONLY WHERE THE PR GOES

**Typing `dev-implement` and naming the story is the ONLY user decision before the PR; the one
question after it is which branch the PR goes into (Section D Step 5).**
Everything after it — the implementation plan, code generation, the unit-test/coverage gate, the API
contract tests, the test placement check, the regression gate, the static evals, the J1/J2 judge score checkpoint, the automated Code Review with its security review, **the
remediation of any findings it reports**, the commit, the push, the PR and the PR review — happens
without a single approval prompt.

- The plan is written, announced and executed — it is never put up for approval.
- A review with findings is remediated automatically, then re-reviewed, **looping until the review
  comes back clean** — the user is never asked to choose between approving and remediating.
- **Never write the word "GATE" into an audit heading from this workflow.** Plan and review outcomes
  are logged as auto-approved decisions.
- The machine checkpoints that DO stop the run are not approvals and remain fully in force: the
  Doability Gate and the Story Branch dependency-merge check. The Doability Gate **never merges a
  prerequisite's PR itself, not even one a human has already approved** — merging is always a manual action
  the user performs outside this workflow. It simply stops — naming the reason — for any prerequisite
  that isn't merged yet.
- A user who volunteers a correction at any point (plan, code, review finding) is an interrupt —
  apply it and continue. Never convert it into a standing gate.
- **Automatic does not mean unbounded.** Every self-healing loop in this workflow is capped at
  3 remediation attempts by the Self-Healing Retry Policy (SH-1 … SH-7) below. When a loop
  exhausts its budget the run HALTS at that gate, emits the Self-Heal Limit message
  (`common/self-heal-limit-guidance.md`) and waits for the developer's manual fix. A failing gate is never
  passed, skipped, weakened, or carried forward.

---

## SELF-HEALING RETRY POLICY (SH-1 … SH-7) — BINDING ON EVERY AUTOMATIC LOOP IN THIS WORKFLOW

Any gate in this workflow that detects a failure and fixes it without user input is a **self-healing
loop**. Every such loop is bounded by the rules below. **These rules override any wording elsewhere in
this file that describes a loop as repeating "until clean".**

**Governed loops — each has its own independent attempt counter:**

| ID | Loop | Defined in | Verification that must pass to exit the loop |
|---|---|---|---|
| **SH-LOOP-1** | Unit Test & Coverage | Step 6 | All unit tests green **and** coverage on new/changed lines ≥ 90% (`implementation/code-generation.md` Step 11a) |
| **SH-LOOP-8** | API Contract Tests — stories that add or change an endpoint | Step 6.1 | Every API contract test passes and every checklist item is covered or `N/A` (`implementation/code-generation.md` Step 11a.5) |
| **SH-LOOP-2** | Test Placement | Step 6.2 | Zero placement violations (`implementation/code-generation.md` Step 11b) |
| **SH-LOOP-3** | Full Regression | Step 6.3 | Zero NEW failures versus `baseline-regression.log` (`implementation/code-generation.md` Step 11c) |
| **SH-LOOP-9** | Static Evals | Step 6.4 | Zero NEW findings on changed files versus the static baseline (`implementation/code-generation.md` Step 11c.5) |
| **SH-LOOP-10** | Judge Score Checkpoint (J1, J2) | Step 6.5 | J1 and J2 each ≥ 0.85, or `N/A` (`implementation/code-generation.md` Step 11c.6) |
| **SH-LOOP-4** | Auto-Remediate (code review + security findings) | Section C | Review verdict clean — zero Blocker and zero High |
| **SH-LOOP-6** | Test Impact Reconciliation — Change Request stories only | Step 6.7 | The test diff matches the CR's Test Change Authorization list exactly (`workflows/epic-enhancement.md` Step 12) |
| **SH-LOOP-7** | Figma Fidelity — stories governed by an exact-match Figma design only | `implementation/code-generation.md` Step 1.7 | Zero remaining differences between every governing frame and the built code |

**SH-1 — Attempt budget.** Each loop is allowed a maximum of 3 remediation attempts. One attempt
is one complete `fix → re-verify` cycle. The initial verification run that first detects the failure
is not an attempt (it is attempt 0). Attempts are numbered 1, 2, 3.

**SH-2 — Counters are per-loop, independent, and never silently reset.** Maintain a separate counter
per SH-LOOP ID. A counter is never shared between loops, never reset by another loop's success, and
never reset by advancing to a later gate. When a later loop's remediation forces re-entry into an
earlier loop (for example Section C re-running the Step 6.3 regression diff), that re-entry **continues
the earlier loop's existing counter** — it does not grant a fresh budget of 3. The only reset is the one
the user grants explicitly under SH-4 step 5.

**SH-3 — Every attempt is recorded.** Before an attempt, log to the story's audit trail and to the
evidence manifest: the loop ID, the attempt number (`n of 3`), the exact failures being addressed, the
identified root cause, and the planned fix. After the attempt, log the files changed, the exact
verification command re-run, and its result. An unrecorded attempt is a process violation.

**SH-4 — Exhaustion halts the workflow.** When attempt 3 completes and the loop's verification still
fails, the loop is exhausted. Immediately:
1. Stop the loop. Do not begin a 4th attempt.
2. Stop the workflow at this gate. Do not advance to the next gate, do not commit, do not
   push, do not raise or update a PR, and do not change the local Story Tracker or the
   external tracker. The story stays `In Progress` on its story branch. The attempted fixes stay in
   the working tree for inspection.
3. Record the halt in the story's `## Progress` (`HALTED — …`, `common/self-heal-limit-guidance.md`
   Section 1) and emit the Self-Heal Limit message (`common/self-heal-limit-guidance.md` Section 2,
   with the "HOW TO FIX IT YOURSELF" steps taken from the Section 3 playbook row for this loop) as the
   run's final output.
4. Append the same content to the story's audit trail under the heading
   `## Self-Healing Retry Limit Reached — [SH-LOOP-ID] (Story N.M)`, carrying the standard
   `**TRACKER ITEM**:` and `**Epic Link**:` fields.
5. **HALT and wait for the developer's manual fix.** Do not resume, re-attempt, reroute, or skip the gate
   on your own initiative. The developer fixes the problem manually and types `dev-implement` again; that
   hand-back is the only way the run resumes, and it grants a fresh 3-attempt budget for the halted loop
   only, via the resume protocol in `common/self-heal-limit-guidance.md` Section 4.

**SH-5 — A stall ends the budget early.** If an attempt produces no code change at all AND
re-verification returns output identical to the previous verification, the loop cannot make
progress. Treat it as exhausted under SH-4 immediately, regardless of attempts remaining, and state in
the report that the budget ended early on a stall rather than on attempt 3.

**SH-6 — Forbidden shortcuts, on every attempt.** No attempt may produce a pass by weakening the
check. Explicitly forbidden: deleting, skipping, `xfail`-ing or weakening a failing test; adding a
trivially-true test; suppressing a finding (`eslint-disable`, `# nosec`, `# type: ignore`, ignore-list
entries); excluding files from coverage; deleting a finding from a review report; narrowing a gate's
declared scope. Reaching SH-4 honestly is the required outcome; passing the gate dishonestly is not an
outcome at all.

**SH-7 — Diagnose before spending an attempt.** An attempt that repeats a previous attempt's change,
or applies a speculative fix with no stated root cause, wastes budget. State the root cause in the
attempt log before making the change. If the root cause cannot be established from the available
evidence, stop and report under SH-4 rather than spending an attempt on a guess.

At SH-4 emit the message in `common/self-heal-limit-guidance.md` Section 2 verbatim, every bracket
substituted from this run's evidence, with Story = this story, Branch = its story branch, the
playbook row for the exhausted SH-LOOP, and resume keyword = `dev-implement`.

---

## MANDATORY: Rule Details Loading

This workflow may be invoked standalone (the user just types `dev-implement`, possibly in a fresh
session). Before doing anything else, resolve the rule details directory (`aire-workflow/`) and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`
- The REQ-ID thread rules from `common/requirements-traceability.md` (plan-level trace + fallback coverage verification)
- `common/story-artifacts.md` — the complete evidence set this run must leave behind and the check before the commit
- `common/self-heal-limit-guidance.md` — the Self-Heal Limit message, the per-gate manual-fix playbook and the hand-back (resume) protocol
- The branching model from `common/branching-strategy.md` (story branches cut from the Base Branch; the
  cycle's documents on the epic branch, reached through the docs worktree — Section 4)
- The status lifecycle from `common/status-model.md` (this workflow makes only the S2 claim)
- Story selection steps from `implementation/story-selection.md`
- The detailed code generation steps from `implementation/code-generation.md`. Follow the Guardrail defined there (Generation Phase Rules) for any generated code.
- The reviewer steps from `workflows/code-review.md` (auto-run after code generation) and the fixer steps from `workflows/remediate.md` (on the remediation path)

**GUARDRAIL — `code-review` and `remediate` are WORKFLOW RULE FILES, NOT Claude skills.** Whenever this
workflow "runs Code Review" or "runs Remediate", you MUST `Read` and follow `workflows/code-review.md` /
`workflows/remediate.md` (which pull their detailed steps from `implementation/code-review.md` /
`implementation/remediate.md`) as instructions. There is NO Claude skill named `code-review` or
`remediate` — NEVER invoke one via the Skill tool.

**The converse guardrail — these three ARE real Claude skills, and are INVOKED via the Skill tool, never
re-implemented inline**: `ve-implement` (Step 6.6, in WORKFLOW MODE, only to backfill a missing test
plan), `pr-generator` (Section D, workflow mode), and `pr-review` (Section E, AUTO MODE). **NEVER
edit those skills — invoke them as-is.**

`pr-generator` pushes the branch and raises the PR — always pass it the proposed target branch explicitly
(story PRs target the Base Branch — the development branch — from `runtime-artifacts/aire-state.md`
`## Branching`). Passing a
target means it runs in workflow mode, where its Phase 5 confirmation is skipped and the push + PR
happen automatically (the user's `dev-implement` invocation is the authorization). Its one question
is which branch the PR goes into, with the Base Branch proposed. After the PR is
raised, `pr-review` runs against it in AUTO MODE — a plain COMMENT review (summary + inline comments),
no user prompt, no formal approve/request-changes verdict or vote (`common/repo-host.md` RH-8).

This workflow does NOT move any story past `In Progress`. After two approvals and a human merge into
the Base Branch, the team's CI/CD deploys the story to DEV and the **developer moves it to
`Ready for Testing` on the board** (`common/status-model.md` S4); the Verification Engineer takes it from
there with `ve-list-work`.

All paths below are relative to the resolved rule details directory.

## DOCS WORKTREE — CODE ON THE STORY BRANCH, DOCUMENTS ON THE EPIC BRANCH

The story branch merges into the development branch, so it carries only code and unit tests. The
cycle's documents stay on the epic branch, checked out at `.aire-docs/`
(`common/branching-strategy.md` Section 4). For the whole run:

- **Every `spec/…`, `runtime-artifacts/…` and `reports/…` path in this file, and in every rule file,
  agent and skill this run loads, means `.aire-docs/spec/…`, `.aire-docs/runtime-artifacts/…`,
  `.aire-docs/reports/…`.** Code (`src/` or `## Code Root`) and `tests/unit/` stay in the main working
  tree.
- Documents are committed and pushed in the worktree (Section 4 item 3) — after the claim (Story
  Selection Step 6), at Section D Step 3 and Step 7, and at Section F. They never change the PR's head.
- Every run closes the worktree when it ends (Section 4 item 6): Section F once the PR is raised, and
  any halt or early stop before it. The next run, or the resume, adds it again.
- Every story-branch commit first passes the Docs Isolation Check (Section 4 item 4).

---

## MANDATORY: Audit Entry Format for this Workflow — TRACKER ITEM on EVERY entry

**EVERY audit entry written during a `dev-implement` run — from Story Selection through the Story Branch
checkpoint, planning, code generation, the test gates, Code Review, remediation and the PR — MUST include
the `**User Email**:`, `**TRACKER ITEM**:`, `**Epic Link**:` and `**AIRE VERSION**:` fields.**

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO timestamp]
**User Email**: [current session email — read live from the session context]
**User Input**: "[Complete raw user input - never summarized]"
**TRACKER ITEM**: "[Complete tracker item (ADO work item) that was implemented]"
**Epic Link**: "[Full Parent Epic URL as a clickable link, from ## Tracker in runtime-artifacts/aire-state.md — or "none"]"
**AIRE VERSION**: "[Framework version [N] read from the "AIRE Framework Version" line in CLAUDE.md — do not hardcode]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

- **AIRE VERSION**: read at runtime from the canonical "AIRE Framework Version" line in `CLAUDE.md`. Never omit it and never hardcode a literal version.
- **Epic Link**: the FULL Parent Epic URL from `## Tracker` in `runtime-artifacts/aire-state.md`, written as a clickable Markdown link. If `## Tracker` records `Parent Epic: none`, write `none` — the field itself is never dropped.
- **TRACKER ITEM**: a clickable Markdown link to the work item (`[4821](https://dev.azure.com/<org>/<project>/_workitems/edit/4821)`) — never bare text.

## PARALLEL-SAFE STATE — THIS STORY WRITES ONLY ITS OWN FRAGMENT (`common/parallel-work-state.md`)

Several developers run `dev-implement` on different stories at once, each on its own story branch, all
pushing documents to the same epic branch. So that they never conflict on the framework's bookkeeping,
**this workflow never writes the shared `runtime-artifacts/audit.md` or `runtime-artifacts/aire-state.md`**:

- **Every audit entry this file tells you to log goes to `runtime-artifacts/stories/story-<N.M>/audit.md`**
  (same entry format, plus `**Story**: "story-<N.M>"`). Entries logged before the story is chosen (the
  selection prompt) are held and written there, with their original timestamps, as soon as the story is
  known.
- **Every write to this story's `## Story Tracker` row, its progress or its SH counters goes to
  `runtime-artifacts/stories/story-<N.M>/state.md`** — the claim (`ToDo → In Progress`, Start,
  assignee), the PR URL, `Merged = no`, `Recorded`.
- Reads (Doability Gate, the Epic "first story" check, resume) use the resolved view — shared files
  plus every fragment on the epic branch, pulled into `.aire-docs/` (`common/parallel-work-state.md`
  Section 4).
- **State Isolation Check before every docs commit**, run inside `.aire-docs/`: every changed path
  under `runtime-artifacts/` must be inside `runtime-artifacts/stories/story-<N.M>/`; anything else is
  moved into the fragment and the shared file restored to the merge-base
  (`common/parallel-work-state.md` Section 5.5).

---

## Step 1 — Keyword Behavior (on invocation)

0. **Open the docs worktree FIRST — before anything else reads a document**: execute
   `common/branching-strategy.md` Section 4 item 1 (add `.aire-docs/` on the epic branch; one still
   present from an earlier run is removed automatically first). From here on every document path resolves into `.aire-docs/` (see "Docs
   Worktree" above).
1. **Read `## Branching`** from `.aire-docs/runtime-artifacts/aire-state.md` (Base Branch + Epic Branch). If missing, run `common/branching-strategy.md` Section 1 now (create the epic branch) before proceeding.
1.5. **No bulk status reconciliation**: dev-implement never moves any story past `In Progress` and never merges a PR. Dependency readiness is verified live, per prerequisite, inside the Doability Gate (Step 2 → `implementation/story-selection.md` Step 4) when a story with `requires` is picked:
   - Each prerequisite's PR is checked directly (`common/repo-host.md` RH-2 — state, merged date, target branch, draft, review decision, mergeable, author) unless its status, read live, is already `Ready for Testing` or beyond.
   - **Merged into the Base Branch (or already `Ready for Testing` or beyond)** → that prerequisite is doable; proceed.
   - **Anything else — OPEN (approved or not), draft, conflicted, blocked by checks, CLOSED (not merged), or no PR yet** → the Doability Gate BLOCKS with a clear message naming the unmerged prerequisite and its PR, and the run STOPS. When the PR is already approved, the stop message says so, so the user knows merging it is all that's left.
1.7. **SINGLE-SESSION EXECUTION (MANDATORY — on EVERY invocation, before Story Selection)**: `dev-implement` runs from start to finish in the session where the user typed it.
   - **Never delegate** the workflow or any step of it to an Agent-tool fork, a subagent, the Workflow tool, a background or remote agent, a second Claude Code session, or a `claude -p` subprocess. Every step is performed by this session's own tool calls.
   - The `agents/*.md` files this workflow loads (`code-security-review-agent.md`, `ve-implement-agent.md`) are procedures executed inline in this session. The Code Review pass (Section A) is kept read-only by discipline — no `Edit`/`Write` on `src/**` or `tests/**` during that pass. The skills this workflow invokes run inline via the Skill tool.
   - Long-running suites run through this session's own shell. A command may run in the background only if this session waits for it to finish and reads its result before advancing.
   - **If this run is itself executing inside a fork or a subagent** → HALT NOW, before Story Selection. Change nothing (no tracker move, no branch, no baseline) and output:
     ```
      dev-implement MUST RUN IN YOUR OWN SESSION
        This run is executing inside a [fork | subagent]. dev-implement never runs delegated —
        every step, from story selection to the PR, happens in the session you typed it in.
        Nothing was changed: no story was claimed, no branch was created, nothing was committed.
     Type dev-implement in your main Claude Code session.
     ```
     Record the halt in the audit trail.
1.75. **Sequential-development banner (MANDATORY — show on EVERY invocation, before Story Selection)**: display this note to the user verbatim, then continue:
   ```
    Note: stories are NOT to be developed in parallel in this session — dev-implement builds ONE story at a time, sequentially (each story branch is cut from the base branch).
   To develop stories in parallel, open a NEW folder/clone of this same repo, check the Dependency Graph, and run dev-implement there on an INDEPENDENT story.
   ```
1.8. **▶ RESUME AFTER A HALT (MANDATORY — before Story Selection)**: if a story in this clone has a `HALTED —` record in its `## Progress` (`.aire-docs/runtime-artifacts/stories/story-<N.M>/state.md`) and its story branch is checked out (or it is the only halted story), this invocation is the developer **handing the work back**: follow the resume protocol in `common/self-heal-limit-guidance.md` Section 4 — skip Story Selection, branch creation and the baseline, and re-run from the first code gate (Step 6) through every later gate to Section F. More than one halted story and none checked out → list them and ask which one to resume. An R6 halt (`HALTED — R6 conflict with Story X.Y`) resumes differently: confirm Story X.Y is now MERGED (`common/repo-host.md` RH-2) — if not, repeat the stop message and end — then restart at Section D Step 2.5. No halted story → continue to Step 2.
2. **Story Selection + Doability Gate**: execute `implementation/story-selection.md` in full — it asks which story (Story ID / number, title, or Tracker ID), reads it from the local Story Tracker / `stories.md` (or resolves the Tracker ID), runs the Doability Gate, and moves the story from `ToDo` to `In Progress` automatically (picking the story is the claim — the tracker and the Story Tracker are both updated without asking, the transition verified, and the work item assigned to the operator who invoked `dev-implement` per `common/tracker-sync.md` Section 5, verified, non-blocking on failure), then commits and pushes the claim through `.aire-docs/`. If the story is already past `ToDo`, it is reported and the ID re-asked — it may be claimed by another developer. Do NOT re-implement the prompt or the gate here.
3. **Story Branch checkpoint (MANDATORY — immediately after story selection)**: create the story branch per Step 1.5 below. Do NOT begin Code Generation until the story branch is created and active.
4. Only once the Doability Gate passes and the story branch is active and the baseline regression has been captured (Step 1.5 Item 4.5), proceed with Code Generation.

---

## Step 1.5 — Story Branch checkpoint (MANDATORY)

Runs after Story Selection resolves the story (Doability Gate passed, story marked `In Progress` on BOTH the external tracker and the fragment, assignee set, and the fragment's `## Claim` block written from the verified calls — `implementation/story-selection.md` Steps 5–6; no `## Claim` block, no branch) and before Code Generation Part 1. Execute `common/branching-strategy.md` Section 3 — Story Branch Creation in full. Summary (the strategy file is authoritative):

1. **Log the step** in the audit trail (ISO 8601 timestamp).
2. Derive the branch name automatically — `story/<N.M>-<kebab-case-story-title>` (the Story ID `N.M` is the prefix; the Tracker ID goes in the PR body — `common/tracker-sync.md` Section 11) — and create it without asking. Announce it (` Story branch: <name> (cut from <base>)`). On a name collision, append a short disambiguating suffix automatically and announce that too.
3. **Refresh** (`git fetch origin`), then run the dependency-merge check on the story's `requires`:
   - All prerequisites merged into the Base Branch (or none) → cut the story branch from `origin/<base>` (never from the epic branch, never from a dependency's branch).
   - Any prerequisite NOT merged → WARN AND STOP with the Case B message from branching-strategy.md Section 3: tell the user to get the prerequisite's PR approved and merged into the Base Branch first, do NOT create a story branch, revert the story to `ToDo` (external tracker, verified), record the revert in the fragment and push it through `.aire-docs/` (the claim was already pushed), and END this run — the user re-invokes it after the merge.
4. **Record in the audit trail**: the story branch name and the base it was cut from.
4.5. **BASELINE Regression Run (MANDATORY, AUTOMATIC — BEFORE any code is generated)**: on the freshly cut story branch, run the ENTIRE test suite (`tests/unit/` and `tests/api/`, not just this story's area), save the raw runner output to `reports/unit-test-evidence/story-[N.M]/baseline-regression.log`, and record the baseline SHA, the pass/fail counts and the full list of failing tests in the audit trail. This is the reference point Step 6.3 diffs against. No user prompt — capture it and continue.
   - Any failures here were already present on the Base Branch. Logging them is all that is required — do not fix them, and do not block on them.
   - If the repo has no test suite yet, record that explicitly — Step 6.3 then covers only this story's new tests.
   - In the same moment, capture the static eval baseline that Step 6.4 diffs against (`implementation/code-generation.md` Step 11c.5, item 1).
5. Carry the story branch forward — it is the target branch for the commit/push/PR step after review. Do NOT proceed to Code Generation until the branch is confirmed active (`git branch --show-current` matches).

> **Multiple developers**: each developer independently runs `dev-implement` and selects a different ready story (the Dependency Graph's suggested lanes split them across the pod). The Dependency Graph (`requires` on each story) plus the Doability Gate ensure no two developers pick stories with unresolved dependencies, and R6 guarantees that stories built at the same time never change the same file — so their PRs cannot conflict.

> **Design context**: `implementation/code-generation.md` Overview (Note on design context); its `spec/plans/` resolves into `.aire-docs/spec/plans/`.

---

# Code Generation (per-story)

**Runs once per story selected via `dev-implement`.** Two parts, preceded by Story Selection + Story
Branch checkpoint: Part 1 — Planning (implementation steps per layer, then the mandatory Unit Test &
Coverage step) and Part 2 — Generation (execute the plan, then the test gates in the same run).

**Execution**:
1. **MANDATORY**: Log any user input during this stage in the audit trail.
2. Load all steps from `implementation/code-generation.md`.
3. **Story Selection and the Story Branch checkpoint** (Step 1 item 2 and Step 1.5) have run; Part 1 starts only once the branch is active.
4. **PART 1 - Planning**: execute `code-generation.md` Part 1, Steps 1–9 — the checkboxed plan, implementation steps per layer, ending with the mandatory Unit Test & Coverage step. Part 1 is the home of the planning rules: the fallback coverage verification and the requirement text as planning input (Step 1), design reference grounding (Step 1.5 — `common/design-reference-grounding.md` DR-5, DR-6 and DR-8, automatic, no question), the UI/UX design standards (Step 1.6), exact-match Figma designs (Step 1.7), the team's coding guidelines (Step 1.8), every step grounded in the previously generated docs and tagged with its REQ-ID(s)/AC(s) (Step 2), and the trace completeness self-check before the plan is announced (Step 4, `common/requirements-traceability.md` Rule 5). This workflow adds:
   - **Change Request story**: when the story's `stories.md` entry carries a `**Change Request**:` field, its bundle's `change-request.md` Section 6 is the plan (write it to the plan file as-is), and Section 5b is the Test Change Authorization list for Step 6.7 (`workflows/epic-change-request.md` "CR bundle format").
   - **Stay inside the story's touch set** (`planning/dependency-graph-generation.md` R6): every file the plan creates or changes is in the story's `**Touches**:` line, or is touched by no independent story that is still unmerged. A planned file that an independent unmerged story also touches is resolved now with the R6 build-time rules (edge when that story has not started; HALT when it is in flight) — before any code is written.
4.1. **WRITE THE PLAN TO DISK (MANDATORY)**: `code-generation.md` Step 4 — the plan file `spec/spec-generation/story-N.M-code-generation.md`, re-read from disk before the plan is announced.
4.2. **Announce the plan and execute it immediately — there is no approval step**: `code-generation.md` Steps 5–8.
5. **PART 2 - Generation**: execute the announced plan (item 4.1's plan file, or the plan document a calling workflow names in its place) per `code-generation.md` Part 2, Steps 10–13 — code and test locations per Step 11 and the Code Location Rules, plan fidelity, recorded deviations and no emoji in code or tests per the Generation Phase Rules.
6. **UNIT TEST & COVERAGE GATE — SH-LOOP-1 (MANDATORY, same run)**: execute `code-generation.md` Step 11a in full, with the evidence in `reports/unit-test-evidence/story-[N.M]/` (`common/story-artifacts.md` E1). Capped at 3 remediation attempts (SH-1); on exhaustion apply SH-4.
6.1. **API CONTRACT TESTS — SH-LOOP-8 (MANDATORY WHEN APPLICABLE, AUTOMATIC)**: execute `code-generation.md` Step 11a.5 in full. `N/A` when the story adds or changes no endpoint, recorded with that reason. Capped at 3 attempts; on exhaustion apply SH-4.
6.2. **TEST PLACEMENT CHECK — SH-LOOP-2 (MANDATORY, AUTOMATIC)**: execute `code-generation.md` Step 11b in full, diffed against the baseline SHA from Step 1.5 Item 4.5. Capped at 3 attempts; on exhaustion apply SH-4.
6.3. **FULL REGRESSION GATE — SH-LOOP-3 (MANDATORY, AUTOMATIC)**: execute `code-generation.md` Step 11c in full, diffed against the `baseline-regression.log` from Step 1.5 Item 4.5. Capped at 3 attempts; on exhaustion apply SH-4. Proceed only once the diff is clean.
6.4. **STATIC EVALS — SH-LOOP-9 (MANDATORY, AUTOMATIC)**: execute `code-generation.md` Step 11c.5 in full, diffed against the static baseline from Step 1.5 Item 4.5. Capped at 3 attempts; on exhaustion apply SH-4.
6.5. **JUDGE SCORE CHECKPOINT (J1, J2) — SH-LOOP-10 (MANDATORY, AUTOMATIC)**: execute `code-generation.md` Step 11c.6 in full, against `spec/plans/judge-rubrics.md` in `.aire-docs/`, then write the eval scorecard (Step 11c.7) to `reports/eval-evidence/story-[N.M]/`. Capped at 3 attempts; on exhaustion apply SH-4.
6.6. **TEST PLAN CHECK (MANDATORY)**: execute `code-generation.md` Step 11d in full — this story's plan is at `test-plans/<cycle>/<TICKET-ID>-<title>/`, read from the Base Branch or the cycle's open `[TEST]` PR, and a backfill is published through that `[TEST]` PR.
6.7. **TEST IMPACT RECONCILIATION — SH-LOOP-6 (Change Request stories only)**: when the story carries a `**Change Request**:` field, run `workflows/epic-enhancement.md` Step 12 against the bundle's Section 5b list before Code Review. Any other story: not applicable, skip silently.
7. **The story stays `In Progress`** through Code Review (Section A), remediation (Section C), the commit/push/PR (Section D) and the PR review (Section E). Raising the PR does NOT move it; after two approvals, a human merge into the Base Branch and the DEV deploy, the developer moves it to `Ready for Testing` on the board (`common/status-model.md` S4). Record the developed ticket in the audit trail as a full tracker hyperlink (per the Audit Entry Format above).
8. **Update Dependency Graph**: after a story's PR merges into the Base Branch, stories whose `requires` are all merged become selectable.
9. **MANDATORY**: Present the code-generation completion announcement defined in `code-generation.md` Step 14. It announces completion only — it asks nothing.
10. **Auto-trigger Code Review**: proceed straight into the Post-Code-Generation Automation section below. The user is NOT asked whether to run it.
11. **MANDATORY**: Log every user response in this stage in the audit trail with complete raw input.

---

# Post-Code-Generation Automation — Auto Code Review → (Remediate) → Commit / Push / PR

**Runs automatically once Code Generation Part 2 completes for the story.** The target branch for the commit/push/PR is the story branch from Step 1.5.

## A. Auto Code Review (MANDATORY, automatic)
1. **Log** that automated Code Review is starting for Story [N.M] (ISO 8601 timestamp).
2. **Run Code Review for this story**: load and execute `workflows/code-review.md` scoped to this specific story (target = "story [N.M]"), as a read-only review run inline in this session (Step 1.7). It produces the versioned report `reports/reviews/story-[N.M]-code-review-v[X].md`. Code Review does NOT change the tracker status.
   - **No test re-run**: Steps 6–6.5 already ran the unit and API contract tests, measured coverage, diffed the full suite, ran the static evals and scored J1/J2 in this run, with the evidence under `reports/unit-test-evidence/story-[N.M]/`. Pass that evidence into the review — Code Review verifies test existence and AC coverage statically and cites the stored evidence; it never re-executes the tests or restates unverified numbers.
3. **Automated security review (inside this review pass)**: the review's Phase 2.5 runs the `agents/code-security-review-agent.md` procedure against this story's diff, checking all 16 Security Baseline rules on the changed files and the attack surface they reach, and writes `reports/code-security-reviews/story-[N.M]-security-review-v[X].md`. Its Critical / High findings on the changed surface become `SEC-ISS-XXX` findings in the review's issue list — so they route through Section B like AC findings and are auto-remediated by Section C (SH-LOOP-4). Medium/Low findings and any pre-existing violation on lines this story didn't touch are advisory only (reported, never remediated here; recommend `/raise-defect`). Never suppress a finding instead of fixing it; never let the security pass go repo-wide.
4. **MANDATORY — audit the complete review log**: the `**TRACKER ITEM**:` and `**Epic Link**:` fields, report path, verdict, and the complete list of findings by severity (Blocker / High). Do not summarize away findings.
5. Proceed to B. Review Verdict Routing.

## B. Review Verdict Routing (AUTOMATIC — no question)

The review's own verdict decides what happens next. **Do NOT present a choice and do NOT wait for the
user.** Announce the verdict, then route:

```
 Automated Code Review complete for Story [N.M].
   Report: reports/reviews/story-[N.M]-code-review-v[X].md
   Verdict: [clean — all ACs Met / findings: Blocker X, High Y]
[Proceeding to commit + PR. | Findings found — remediating them automatically now (round [n]).]
```

1. **Verdict clean — zero Blocker, zero High** → go straight to D. Commit, Push & Raise PR.
2. **Any Blocker or High finding** → go to C. Auto-Remediate Loop (SH-LOOP-4).
3. **MANDATORY**: log the routing decision under a plain heading
   (`## Review Verdict — Clean, Proceeding to PR (Story N.M)` or
   `## Review Verdict — Findings, Auto-Remediating (Story N.M)`), with the full findings list by severity.

## C. Auto-Remediate Loop — SH-LOOP-4 (AUTOMATIC — max 3 rounds)

**Entered whenever the review verdict reports findings. Every round is automatic — no prompts. One round =
one attempt, maximum 3.**

1. **Check the SH-LOOP-4 counter BEFORE starting a round.** If 3 attempts have already been spent, go
   directly to Step 8 (Exhaustion).
2. **Log** that remediation round `[n] of 3` is starting, naming the review report, the findings in scope,
   and the root cause of each (SH-3, SH-7).
3. **Run Remediate**: load and execute `workflows/remediate.md` scoped to this story's review report
   (`story-[N.M]-code-review-v[X].md`). It fixes findings (fix → unit test → green) and annotates the
   report in place. Its scope-confirmation prompt is SKIPPED in this mode — every Blocker and High finding is
   in scope, and nothing is deferred.
4. **Re-run the full regression** (Step 6.3's diff vs `baseline-regression.log`), the static evals
   (Step 6.4) and the judge score checkpoint (Step 6.5) if the remediation touched non-test code, fixing any NEW
   failure, finding or below-minimum score in the same round. Per SH-2, this re-entry continues the
   SH-LOOP-3, SH-LOOP-9 and SH-LOOP-10 counters.
5. **MANDATORY — audit the complete remediate log**: the round number (`[n] of 3`), which findings were
   fixed (by severity), the files changed, unit-test evidence, and the regression comparison.
6. **Re-review automatically**: return to A. Auto Code Review, producing report version `v[X+1]`, then
   B again.
7. **Loop control**:
   - **Verdict clean** → D. Commit, Push & Raise PR.
   - **Findings remain AND attempts spent < 3** → increment the counter and return to step 1.
   - **Findings remain AND attempts spent = 3**, or a stall (SH-5) (no code change and an identical
     finding set) → step 8.
8. **Exhaustion (SH-4) — HALT, do not raise a PR.** Do not run a 4th round, commit, push, raise a PR, or
   change any tracker. Emit the Self-Heal Limit message for `SH-LOOP-4`, listing every unresolved finding
   with its ID, severity, file:line, and why automatic remediation failed on it; log the same under
   `## Self-Healing Retry Limit Reached — SH-LOOP-4 (Story N.M)`, and wait for the developer's hand-back.
   Never silence a finding by deleting it from the report or weaken the review scope to manufacture a
   clean verdict.

## D. Commit, Push & Raise PR (on a clean review verdict) — FULLY AUTOMATIC

**A clean review verdict is the ONLY thing that triggers this section.** Everything below — the
evidence check, the commit, the branch push, the PR, the labels, the tracker update and the auto PR
review (Section E) — runs automatically, with no prompts of any kind. Announce what you are doing;
never ask whether to do it.

1. **Log** that the review verdict came back clean and the commit/push/PR step is starting, naming the target branch.
2. **Evidence check**: run `common/story-artifacts.md` Section 4 for `story-[N.M]`. A missing or
   malformed file is fixed from its real output, or its gate is re-run (that gate's loop, counter
   continuing). Nothing is committed until the check is clean.
2.5. **CONFLICT-FREE CHECK — R6-B (MANDATORY, AUTOMATIC)**: run the build-time check in
   `planning/dependency-graph-generation.md` (R6 — Conflict-Free Independence) on this story's diff.
   Clean → continue. An overlap with a story that has not started → add the R6 edge to this story's
   fragment and continue. An overlap with a story already in flight → HALT before the commit with
   that section's message; nothing is committed, pushed or raised. Independent stories never conflict
   in their PRs — this is a hard constraint, never skipped or weakened.
3. **Commit — code to the story branch, documents to the epic branch**:
   - Verify the active branch is the story branch from Step 1.5 (`git branch --show-current`); if not, switch to it automatically and announce the switch.
   - **Code commit (story branch)**: stage the generated/remediated application code and the unit tests only — do NOT commit unrelated changes. Run the Docs Isolation Check (`common/branching-strategy.md` Section 4 item 4) on the staged set and commit only when it prints nothing.
   - **Docs commit (`.aire-docs/`, epic branch)**: stage the evidence under `reports/` and this story's state fragment (`runtime-artifacts/stories/story-[N.M]/`) — **never the shared `runtime-artifacts/audit.md` / `aire-state.md`**: run the State Isolation Check (`common/parallel-work-state.md` Section 5.5) first. Commit and push per branching-strategy.md Section 4 item 3.
   - Both commit messages carry an `AIRE-Version:` trailer on its own line at the end, `[N]` read at runtime from the "AIRE Framework Version" line in `CLAUDE.md`:
     ```
     git add <code and unit-test files>
     git commit -m "[Story N.M / TRACKER-ID] <concise summary of the implemented story>" -m "AIRE-Version: [N]"
     ```
   - Record both commit hashes in the audit trail.
4. **PULL BEFORE PUSH (AUTOMATIC)** — the one procedure every implement flow runs before it pushes
   (`bug-fix-implement`, `enhancement-implement`, `epic-enhancement`, `epic-bugfix` and `pr-fix` run this step
   too). Other developers may have pushed to this branch, or merged into the PR's target branch, since
   this branch was cut.
   1. Run `git fetch origin`. Then merge in each of these refs that HEAD does not already contain
      (`git merge-base --is-ancestor <ref> HEAD`), in this order:
      - `origin/<this branch>`, when it exists on origin (someone else pushed to it — e.g. a Verification
        Engineer's `ve-list-work` Option C test-plan change on a bug or enhancement branch);
      - `origin/<target branch>` — the branch the PR merges into: the Base Branch, for a story, a bug or
        an enhancement alike. When the developer picks another target at the PR, `pr-generator` re-runs
        this step against it.
   2. Merge with `git merge --no-ff <ref>`. Never rebase, never force-push.
   3. **On a conflict, keep both functionalities.** The other change's code and tests and this story's
      changes must all survive. Never take one side wholesale, and never delete or weaken the other
      change's code or tests.
   4. When a merge brought in any change under `src/` or `tests/`, run the full test suite and the static
      evals once on the merged result. A new failure is fixed under the full-regression loop (SH-LOOP-3),
      a new finding under the static-eval loop (SH-LOOP-9), each on its current counter.
   5. Commit the merge (and any fix) with the `AIRE-Version: [N]` trailer. Log the merged commits and how
      each conflict was combined in this story's audit fragment.
5. **Push & raise the PR via the `pr-generator` skill (used as-is)**:
   - Invoke `pr-generator` in WORKFLOW mode, passing the Base Branch from `## Branching` as the proposed target and the story's Tracker ID as the work item to link (`common/repo-host.md` RH-12). It asks the developer which branch the PR goes into (its Phase 1 Step 2) and raises it there — never into the epic branch, which holds documents only. A target other than the Base Branch is shown in the Section F handoff; dependents still unblock only once the code reaches the Base Branch (Step 8). The skill drafts the title (with the `[STORY]` prefix) and body, pushes the branch, ensures the `ai-generated` and `aire-anx-v[N]` labels, and opens the PR. Its Phase 5 confirmation is skipped in workflow mode — never ask whether to push or open the PR.
   - The PR body carries the Tests & Review block pr-generator builds from this story's evidence: unit tests X/X passing, changed-line coverage %, full regression (new failures: 0), the code review verdict and version, and security review findings by severity, with the evidence paths.
   - **Verify it landed**: read the PR body back (`common/repo-host.md` RH-2) and confirm the Tests & Review block is present and its figures match the evidence. If not, edit the PR and re-verify. Record only what reading the body actually showed.
5.5. **R6 re-check after the PR opens**: run step 6 of the R6 build-time check (`planning/dependency-graph-generation.md`) against the open `[STORY]` PRs into the Base Branch — an independent story's overlapping PR opened in the meantime gets the edge, the PR comment and a line in the handoff.
6. **MANDATORY**: Record the PR outcome returned by pr-generator (branch pushed, target branch chosen, PR URL, labels applied — `ai-generated` + `aire-anx-v[N]`, work item linked or the RH-12 warning), with the `**TRACKER ITEM**:` and `**Epic Link**:` fields.
7. **Store the PR and keep the story `In Progress`**:
   - In this story's fragment `.aire-docs/runtime-artifacts/stories/story-[N.M]/state.md` `## Story Tracker Row`, set PR → the PR URL, Merged → `no`, Recorded → current timestamp, then commit and push it through the docs worktree (branching-strategy.md Section 4 item 3) — the fragment is on the epic branch, so this never changes the PR's head. The merge happens later, outside this run; readers resolve `Merged: no` live (`common/parallel-work-state.md` Section 4.6). Do NOT change Status.
   - **Do NOT transition the tracker** and do NOT set `End` — the move to `Ready for Testing` is the developer's, on the board, after the merge and the DEV deploy (`common/status-model.md` S4).
   - Record in the audit trail the developed ticket as a full tracker hyperlink, the PR URL, and that the story stays `In Progress` pending approval and merge (Merged=no).
8. **Ready set unchanged**: this story's PR is not merged yet, so it does not unblock dependents. Dependents become selectable as soon as it merges into the Base Branch (the Doability Gate checks the merge live).
9. **No Epic move here.** The Parent Epic moves to `Closed` only when every story is `Closed`, offered confirm-first by `ve-list-work` (`common/status-model.md` Section 4) — never from this workflow.
10. Proceed to E. Auto PR Review.

## E. Auto PR Review (MANDATORY, automatic — the story is still `In Progress`)
1. **Log** that automated PR Review is starting for Story [N.M], naming the PR URL/number.
2. **Invoke the `pr-review` skill** in its AUTO MODE, passing the PR just raised so it does not need to ask which PR. It reads the diff, grounds itself in the resolved state and audit trail, and drafts inline comments + a summary review.
3. **AUTO MODE posts automatically, comments only, no prompt** — a plain COMMENT review, NEVER a formal verdict — no GitHub `APPROVE`/`REQUEST_CHANGES`, no Azure Repos vote (the same identity raised the PR, so a formal self-review is meaningless; `common/repo-host.md` RH-8). Do not re-introduce a prompt around the skill.
4. **MANDATORY**: Record the outcome — review posted (AUTO MODE, comment-only), the review URL, findings summary, and the `**TRACKER ITEM**:` and `**Epic Link**:` fields.
5. Proceed to F. Next-Action Handoff — this run is NOT complete until that message is shown.

## F. Next-Action Handoff (MANDATORY — the LAST thing this run outputs)

**This message closes every `dev-implement` run that raised a PR.** It states that the PR is ready, that
it is reviewed by the Developer and the Verification Engineer together, that **approval and merge are
manual** — the framework never approves or merges a pull request — and the ONE keyword to type next. Do
not tell the user to check out or switch branches — the next workflow does that itself.

1. **Determine the remaining work first** — count the stories in the resolved `## Story Tracker` that are
   still `ToDo` (`[K]`), and whether this story was the last one (no story is `ToDo` and no other
   story is `In Progress` with an unmerged PR).
2. **Log, push and close the docs worktree — before the block is shown**: log which case is about to be
   presented and the keyword the user will be told to type, commit and push the fragment (branching-strategy.md
   Section 4 item 3), then close the worktree (Section 4 item 6). Nothing after the block writes a document.
3. **Present EXACTLY ONE of the two blocks below, verbatim, every placeholder substituted** (`<PR URL>`,
   `<base>`, `<base-branch>`, `<stitch-command>`, `<epic-branch>`, `[N.M]`, `[story title]`, `[EPIC-ID]`).
   Here `<base>` is the branch the PR was raised into — the Base Branch unless the developer chose another
   at Section D Step 5 — and `<base-branch>` is the recorded Base Branch. `<stitch-command>` is
   `/stitch-delta-local` when `## Existing-System Context` records `Source: local-generation` or
   `local-re`, otherwise `/stitch-delta`. A greenfield cycle (no `## Existing-System Context` source)
   drops the stitch step and renumbers the rest.

   **Case 1 — more stories remain (`K > 0`)**:
   ```
   Story [N.M] — [story title] is ready for review.

      Pull request   <PR URL>   ([STORY] → <base>)
      Status         In Progress — it stays here until the PR is merged and deployed to DEV.
      Evidence       The test and review summary is in the PR description; the full evidence
                     is under reports/…/story-[N.M]/ on <epic-branch>.

   NEXT STEPS
      1. Review the pull request — it is approved and merged manually.
      2. Merge the pull request into <base> — approving and merging are manual steps.
         The framework never approves or merges a pull request on anyone's behalf.
         Changes needed? Leave review comments on the PR, then type:  pr-fix <PR URL>
      3. Once CI/CD has deployed it to DEV, move Story [N.M] to Ready for Testing on the board.
      4. Once it has merged into <base-branch>, on <base-branch> type:  <stitch-command>
         It updates the existing-system docs with this story's code, so the next epic, or one
         running in parallel, works from the code as it is now.
      5. Continue with the next story. Type:  dev-implement

   Please type the keyword exactly as shown — other phrasing does not start a framework workflow.
   ```

   **Case 2 — this was the LAST story of the epic**:
   ```
   Story [N.M] — [story title] is ready for review. This is the last story of epic [EPIC-ID].

      Pull request   <PR URL>   ([STORY] → <base>)
      Status         In Progress — it stays here until the PR is merged and deployed to DEV.
      Evidence       The test and review summary is in the PR description; the full evidence
                     is under reports/…/story-[N.M]/ on <epic-branch>.

   NEXT STEPS
      1. Review the pull request — it is approved and merged manually.
      2. Merge the pull request into <base> — approving and merging are manual steps.
         The framework never approves or merges a pull request on anyone's behalf.
         Changes needed? Leave review comments on the PR, then type:  pr-fix <PR URL>
      3. Once CI/CD has deployed it to DEV, move Story [N.M] to Ready for Testing on the board.
      4. Once it has merged into <base-branch>, on <base-branch> type:  <stitch-command>
         It updates the existing-system docs with this story's code, so the next epic, or one
         running in parallel, works from the code as it is now.
      5. Verification Engineer: move each story to In Testing on the board as you pick it up,
         then type:  ve-list-work  (Option B closes a story or sends it to Bug fixing).
         When every story is Closed, you are offered the Parent Epic move to Closed.

   Please type the keyword exactly as shown — other phrasing does not start a framework workflow.
   ```
4. **Say nothing after this block, and put nothing before it in the same message** — no free-form
   summary, no gap list, no options menu. A run with a gap never reaches Section F — it halted with the
   Self-Heal Limit message.

---

## Tracker Sync Rule (reminder)

The Tracker Sync Rule in `CLAUDE.md` (mechanics in `common/tracker-sync.md` Sections 4 and 5) applies at every status change:
- **Every status change** transitions the ADO work item AND the local Story Tracker, and verifies the transition. Never silently update only one side.
- **The claim is automatic**: `ToDo → In Progress` at story pick is applied to the board AND the local Story Tracker without asking, verified and announced, and the work item is assigned to the operator who typed `dev-implement` (unresolvable identity → leave unassigned, warn, continue).
- **Nothing past `In Progress`** is ever made by this workflow — `Ready for Testing` is the developer's manual board move after the merge and DEV deploy; every later move is listed in `common/status-model.md`.
- **Epic status sync**: when the FIRST story is claimed, the Parent Epic moves to `In Progress` automatically (Story Selection Step 5); when every story is `Closed`, `ve-list-work` offers a confirm-first move of the Epic to `Closed`. Both verified and logged.

---

## Critical Rules

- **Code and test locations** follow `code-generation.md` Step 11 and its Code Location Rules.
- **The story's ACs, its `Covers` REQ-IDs in `requirements.md`, `spec/plans/architecture.md` and its approved test plan are its inputs** — no per-story requirements, architecture or constraints document is written.
- **Self-healing is capped at 3 attempts per loop** (SH-1 … SH-7). On exhaustion HALT at that gate, emit the Self-Heal Limit message and wait; never start a 4th attempt, never skip or weaken a failing gate.
- **Every audit entry carries `**User Email**:`, `**TRACKER ITEM**:`, `**Epic Link**:` and `**AIRE VERSION**:`**; every story commit carries the `AIRE-Version: [N]` trailer, read live from `CLAUDE.md`.
- **Parallel-safe state**: this story writes only `runtime-artifacts/stories/story-<N.M>/` (in `.aire-docs/`); every docs commit passes the State Isolation Check, and every story-branch commit passes the Docs Isolation Check — the story branch carries code and unit tests only.
- **Single-session execution** (Step 1.7): never hand any step to a fork, subagent, Workflow-tool run, background/remote agent, second session or `claude -p` subprocess. A run inside a fork or subagent HALTS before Story Selection.
- **Always show the sequential-development banner** (Step 1.75) before Story Selection.
- **A change to work the epic already built is not a `dev-implement` run** — new or changed behaviour, or a bug in an earlier story, is delivered with `epic-enhancement`, `epic-bugfix` or `epic-change-request`, which update the affected stories' ACs, test plans and unit tests under a Test Change Authorization list and then run this workflow's gate chain. `dev-implement` never edits an earlier story's tests to fit new behaviour.
- **A rejected story PR is fixed with `pr-fix`**, not by re-running `dev-implement` (which would cut a second branch and a second PR).
- **Never guess which story to implement** — always ask and wait.
- **No approvals after the story key**: no plan approval, no review decision, no question about pushing, the PR, its title/body/labels. Announce each action; never ask mid-run. The Doability Gate and the branch-cut dependency-merge check are machine stops, not approvals.
- **Plan guardrail and REQ-ID thread** (Execution items 4–5): `code-generation.md` Part 1 (Steps 1, 2 and 4, Planning Phase Rules) and its Generation Phase Rules.
- **The story branch** is cut from the refreshed Base Branch (`origin/<base>`), named and created automatically, before any code; any prerequisite not merged into the Base Branch → WARN AND STOP.
- **The Doability Gate is never bypassed and never merges a PR** — not automatically, not with confirmation, not even an approved one.
- **Statuses come from `common/status-model.md`.** The story stays `In Progress` through the PR raise and PR review; at Section D the PR URL is stored (`Merged=no`).
- **The test gates and the judge score checkpoint run in order, every run**: baseline, regression and static (Step 1.5 Item 4.5) → unit tests + coverage ≥ 90% on changed lines (Step 6) → API contract tests (Step 6.1) → test placement (Step 6.2) → full regression vs baseline (Step 6.3) → static evals vs baseline (Step 6.4) → judge score checkpoint J1/J2 (Step 6.5) → test plan check (Step 6.6). Never delete, skip or weaken a failing test to go green, and never hand a new failure back to the user.
- **Evidence is the tools' real output** (`code-generation.md` Testing Rules and Step 11a).
- **Code Review runs automatically after code generation, with its diff-scoped security review**; the verdict — not the user — decides the route. Any Blocker/High finding → auto-remediate (SH-LOOP-4) → re-review, until clean or the budget is exhausted; never raise the PR on an unclean verdict.
- **The commit, push and PR are automatic once the verdict is clean** — via `pr-generator` (workflow mode, it asks which branch the PR goes into with the Base Branch proposed, `[STORY]` prefix), then `pr-review` in AUTO MODE.
- **Every run that raises a PR ends with the Section F handoff**; nothing is output after it.
- **The only story transition this workflow makes is the automatic claim.** Any other tracker transition (e.g. the Parent Epic moves) is confirm-first. Verify every transition, log it, and update the Story Tracker row and `Recorded` timestamp on every status change.
