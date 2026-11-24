# WORKFLOW: `bug-fix-implement` (Bug/Defect — Code Fix)

**Purpose**: Implement the fix for the defect prepared by `bug-fix`. Normally entered from `bug-fix` Step 9's Verification Engineer Handoff Break — the user answers `yes` there and this workflow runs in the same session (the keyword is only typed to resume a session that answered `no` or ended after analysis). Sibling of `dev-implement`, but: it works directly on the existing bug branch (no story selection, no doability gate, no story branch), it runs a baseline regression pass before touching code, a full-repo regression gate after the fix, and its PR targets the base branch with the `[BUG]` prefix — after which the operator runs the cycle archive manually (Step 12).

## READ FIRST — THE NON-NEGOTIABLES OF EVERY `bug-fix-implement` RUN

Observed in a real run: a fix shipped a PR with gates never run and the tracker claim made only
locally, "disclosed" as a scope call to keep the session moving, and ended on a free-form summary.
Every one of those is forbidden:

1. **Every gate runs.** No gate is skipped, deferred or "scoped out" to finish sooner. A gate ends only as
   `PASS`, or `N/A` for a reason `implementation/code-generation.md` Step 11a allows. A gate that truly
   cannot run is an `ERROR` that HALTS the run. "Not run this session", "scope call" and "to keep the
   session moving" are forbidden.
2. **Every gate passes before the commit** — unit tests + coverage, API contract tests, test placement,
   full regression, static evals, the J1/J2 judge score checkpoint and a clean code review (security review included). Anything else means no commit and no PR: HALT with
   the Self-Heal Limit message.
3. **The claim holds on the board too, before any code.** The
   ticket is `Active` and assigned to the operator (`common/status-model.md` B2; `common/tracker-sync.md`
   Sections 4 and 5) — made at `bug-fix` Step 1 item 5, re-checked live at Step 2 — verified by
   re-fetching, with the results in the fragment's `## Claim` block. Updating only the local fragment is
   a defect.
4. **Disclosing a gap does not make it acceptable.** The moment you notice a gate unrun, a transition
   unmade or a file missing is the moment to do the work — or to HALT with the Self-Heal Limit message.
   Never raise a PR with "disclosed gaps", and never ask the user whether to skip.
5. **The run ends with its exact end message.** A successful run's final output is the Step 12 Archive Handoff block,
   verbatim, every placeholder substituted, and nothing else in that message — no free-form summary
   before it, no gap list, no suggestions after it. Progress lines earlier in the run are fine; the last
   message is the block. A halted run ends with the Self-Heal Limit message instead, also verbatim.

---

## MANDATORY: Rule Details Loading

May be invoked standalone in a fresh session. Resolve `aire-workflow/` and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`
- `common/branching-strategy.md` — Bug Branch Model section
- `common/story-artifacts.md` — the complete evidence set this run must leave behind (paths, the `evidence-manifest.md` format, keyed review and security-review names)
- `common/self-heal-limit-guidance.md` — the Self-Heal Limit message, the per-gate manual-fix playbook and the hand-back (resume) protocol used when a self-healing loop exhausts its budget or a tool cannot be installed
- `implementation/code-generation.md` (planning/generation/coverage mechanics — story selection and story-branch steps do NOT apply here). Follow the Guardrail defined there (Generation Phase Rules) for any generated code.
- **Do NOT pre-load** `implementation/test-plan.md` — Step 7.5 reaches it only by invoking the `ve-implement` skill in WORKFLOW MODE, which loads its own rule files.
- `workflows/code-review.md` (auto-run after the fix) and `workflows/remediate.md` (on the Remediate path)
- Story key for this flow: `bug-[TICKET-ID]`

**GUARDRAIL — `code-review` and `remediate` are WORKFLOW RULE FILES, NOT Claude skills.** Whenever this workflow "runs Code Review" or "runs Remediate", you MUST `Read` and follow `workflows/code-review.md` / `workflows/remediate.md` (which pull their detailed steps from `implementation/code-review.md` / `implementation/remediate.md`) as instructions. There is NO Claude skill named `code-review` or `remediate` — NEVER invoke one via the Skill tool.

**The converse guardrail — these ARE real Claude skills, INVOKED via the Skill tool, never re-implemented inline**: `ve-implement` (Step 7.5, WORKFLOW MODE with the ticket passed in, only to backfill a missing test plan), `pr-generator` (Step 9, workflow mode), and `pr-review` (Step 11, AUTO MODE).

Skills used **as-is — NEVER edit them**: `pr-generator` (pass the Base Branch as the proposed target — it asks which branch the PR goes into; PR type `[BUG]`), `pr-review` (AUTO MODE after the PR), and `archive-epic` in bug mode (NEVER auto-invoked by this workflow — the operator runs it manually after all Verification Engineer work has landed on the bug branch; see Step 12).

## MANDATORY: Audit Entry Format

Every runtime-artifacts/audit.md entry in this workflow carries the `**TRACKER ITEM**:` field (the defect ticket as an ADO work item hyperlink) — same format as `bug-fix.md` — AND the `**AIRE VERSION**:` field, exactly as `dev-implement` does:

```markdown
**AIRE VERSION**: "[Framework version [N] read from the "AIRE Framework Version" line in CLAUDE.md — do not hardcode]"
```

The version is read at runtime from the canonical "AIRE Framework Version" line in `CLAUDE.md` — it records which framework version the bug fix was developed with. Never omit it and never hardcode a literal number. Append-only, ISO 8601 timestamps, complete raw user input.

## PARALLEL-SAFE STATE — THIS WORKFLOW WRITES ONLY ITS OWN FRAGMENT (`common/parallel-work-state.md`)

The Verification Engineer works in parallel on `ve/…` branches whose PRs merge into this same bug branch, and
`pr-fix` may later add commits to this PR. So that none of them conflict on the framework's bookkeeping,
**this workflow never writes the shared `runtime-artifacts/audit.md` or `runtime-artifacts/aire-state.md`**:

- Every audit entry this file tells you to append to `runtime-artifacts/audit.md` goes to
  `runtime-artifacts/stories/bug-<TICKET-ID>/audit.md` (same format, plus `**Story**: "bug-<TICKET-ID>"`).
- Every write to the ticket's Story Tracker row, its progress or its SH counters goes to
  `runtime-artifacts/stories/bug-<TICKET-ID>/state.md` (`## Story Tracker Row`, `## Progress`,
  `## Self-Healing Counters`).
- This overrides every mention of those two shared paths below. Reads use the resolved view
  (`common/parallel-work-state.md` Section 4); a `PR: pending` is resolved live from the branch.
- **State Isolation Check before every commit** (Step 9): every changed
  path under `runtime-artifacts/` must be inside `runtime-artifacts/stories/bug-<TICKET-ID>/`; anything else is
  moved into the fragment and the shared file restored to the merge-base (Section 5.5).
- Do not push a commit only to record the PR URL — it rides the next commit (Section 4.6).

## THIS WORKFLOW IS FULLY AUTOMATIC — IT HAS NO APPROVAL GATES

**Entering this workflow (the `yes` at `bug-fix` Step 9's Verification Engineer Handoff Break, or typing
`bug-fix-implement` to resume) is the ONLY user decision; the one question after it is which branch
the `[BUG]` PR goes into (Step 9).** Everything after it — the fix plan, the
code, the unit-test/coverage gate, the regression gates, the automated Code Review, **the
remediation of any findings it reports**, the commit, the push, the `[BUG]` PR and the PR review —
runs without a single approval prompt.

- The fix plan is built, announced and executed — never put up for approval.
- A review with findings is remediated automatically, then re-reviewed, **looping until the verdict
  is clean** — never an Approve/Remediate question.
- **Never write the word "GATE" into an audit heading from this workflow.** Plan and review
  outcomes are logged as auto-approved decisions under plain headings.
- The stage approvals inside `bug-fix.md` (requirements, the single story, the test plan) belong to
  that file.
- **Automatic does not mean unbounded.** Every self-healing loop in this workflow is capped at
  3 remediation attempts by the Self-Healing Retry Policy (SH-1 … SH-7) below. When a loop
  exhausts its budget the run HALTS at that gate, emits the Self-Heal Limit message
  (`common/self-heal-limit-guidance.md`) and waits for the developer's manual fix. A failing gate is never passed, skipped, weakened, or carried forward.

---

## SELF-HEALING RETRY POLICY (SH-1 … SH-7) — BINDING ON EVERY AUTOMATIC LOOP IN THIS WORKFLOW

Any gate in this workflow that detects a failure and fixes it without user input is a **self-healing
loop**. Every such loop is bounded by the rules below. **These rules override any wording elsewhere in
this file that describes a loop as uncapped, unbounded, or repeating "until clean" with no limit.**

**Governed loops — each has its own independent attempt counter:**

| ID | Loop | Defined in | Verification that must pass to exit the loop |
|---|---|---|---|
| **SH-LOOP-1** | Unit Test & Coverage | Step 6 | All unit tests green **and** coverage on new/changed lines ≥ 90% (`implementation/code-generation.md` Step 11a) |
| **SH-LOOP-8** | API Contract Tests — only when the fix adds or changes an endpoint | Step 6.2 | Every API contract test passes (`implementation/code-generation.md` Step 11a.5) |
| **SH-LOOP-2** | Test Placement | Step 6.5 | Zero misplaced test files |
| **SH-LOOP-3** | Full Regression | Step 7 | Zero NEW failures versus the Step 3 baseline |
| **SH-LOOP-9** | Static Evals | Step 7.2 | Zero NEW findings on changed files versus the Step 3 static baseline (`implementation/code-generation.md` Step 11c.5) |
| **SH-LOOP-10** | Judge Score Checkpoint (J1, J2) | Step 7.3 | J1 and J2 each ≥ 0.85, or `N/A` (`implementation/code-generation.md` Step 11c.6) |
| **SH-LOOP-4** | Auto-Remediate (code review + security findings) | Step 8c | Review verdict clean — zero Blocker and zero High |
| **SH-LOOP-7** | Figma Fidelity — only when an exact-match Figma design governs the fix | `implementation/code-generation.md` Step 1.7 | Zero remaining differences between every governing frame and the built code |

**SH-1 — Attempt budget.** Each loop is allowed a maximum of 3 remediation attempts. One attempt
is one complete `fix → re-verify` cycle. The initial verification run that first detects the failure
is not an attempt (it is attempt 0). Attempts are numbered 1, 2, 3.

**SH-2 — Counters are per-loop, independent, and never silently reset.** Maintain a separate counter
per SH-LOOP ID. A counter is never shared between loops, never reset by another loop's success, and
never reset by advancing to a later gate. When a later loop's remediation forces re-entry into an
earlier loop (for example Step 8c re-running the Step 7 regression comparison), that re-entry **continues the earlier loop's existing
counter** — it does not grant a fresh budget of 3. The only reset is the one the user grants
explicitly under SH-4 step 5.

**SH-3 — Every attempt is recorded.** Before an attempt, log to `runtime-artifacts/audit.md` and to that loop's evidence
manifest: the loop ID, the attempt number (`n of 3`), the exact failures being addressed, the
identified root cause, and the planned fix. After the attempt, log the files changed, the exact
verification command re-run, and its result. An unrecorded attempt is a process violation.

**SH-4 — Exhaustion halts the workflow.** When attempt 3 completes and the loop's verification still
fails, the loop is exhausted. Immediately:
1. Stop the loop. Do not begin a 4th attempt.
2. Stop the workflow at this gate. Do not advance to the next gate, do not commit, do not
   push, do not raise or update a PR, and do not change the local Story Tracker or the
   external tracker. The ticket stays `Active` on its bug branch. The attempted fixes stay in the working tree for inspection.
3. Record the halt in the story's `## Progress` (`HALTED — …`, `common/self-heal-limit-guidance.md`
   Section 1) and emit the Self-Heal Limit message (the Retry-Limit Report —
   `common/self-heal-limit-guidance.md` Section 2, with the "HOW TO FIX IT YOURSELF" steps taken from the
   Section 3 playbook row for this loop) as the run's final output.
4. Append the same content to `runtime-artifacts/audit.md` under the heading
   `## Self-Healing Retry Limit Reached — [SH-LOOP-ID] (Bug [TICKET-ID])`, carrying the standard
   `**TRACKER ITEM**:` and `**Epic Link**:` fields.
5. **HALT and wait for the developer's manual fix.** Do not resume, re-attempt, reroute, or skip the gate on your own
   initiative. The developer fixes the problem manually and types `bug-fix-implement` again; that hand-back
   is the only way the run resumes, and it grants a fresh 3-attempt budget for the halted loop only, via
   the resume protocol in
   `common/self-heal-limit-guidance.md` Section 4 — which checks the manual change, rejects
   forbidden shortcuts, never reverts the developer's code, and re-runs every gate from the right place.

**SH-5 — A stall ends the budget early.** If an attempt produces no code change at all AND
re-verification returns output identical to the previous verification, the loop cannot make
progress. Treat it as exhausted under SH-4 immediately, regardless of attempts remaining, and state in
the report that the budget ended early on a stall rather than on attempt 3.

**SH-6 — Forbidden shortcuts, on every attempt.** No attempt may produce a pass by weakening the
check. Explicitly forbidden: deleting, skipping, `xfail`-ing or weakening a failing test; suppressing a
finding (`eslint-disable`, `# nosec`, `# type: ignore`, ignore-list entries); lowering the coverage
minimum; adding trivially-true tests; deleting a finding from a review report; narrowing a gate's
declared scope. Reaching SH-4 honestly is the required outcome; passing the gate dishonestly is
not an outcome at all.

**SH-7 — Diagnose before spending an attempt.** An attempt that repeats a previous attempt's change,
or applies a speculative fix with no stated root cause, wastes budget. State the root cause in the
attempt log before making the change. If the root cause cannot be established from the available
evidence, stop and report under SH-4 rather than spending an attempt on a guess.

### Self-Heal Limit message (Retry-Limit Report) — `common/self-heal-limit-guidance.md`

At SH-4 emit the message in `common/self-heal-limit-guidance.md` Section 2 verbatim, every bracket
substituted from this run's evidence, with:
- **Story** = this ticket, Branch = the branch it stays on (on its bug branch);
- **HOW TO FIX IT YOURSELF** steps 1, 2, 4, 5 and Please do NOT taken from the Section 3 playbook row
  for the exhausted SH-LOOP, with real commands from the project's own build files and real evidence
  paths;
- **resume keyword** = `bug-fix-implement`.

It tells the developer exactly what is failing, why the framework stopped, what the three attempts
changed (left in the working tree), how to reproduce and fix it themselves, what the gates will reject,
and how to hand the work back. It asks the developer to fix it manually and offers no options. The
hand-back grants a fresh budget for the halted loop only; every other loop keeps the counter it already
held.

---

## Step 1 — Preconditions

1. Read `runtime-artifacts/aire-state.md`. Require `## Tracker` with `Workflow Type: bug` + `Parent Ticket`, and `## Branching` with `Bug Branch`. If missing, STOP: tell the user to run `ticket-implement <TICKET-ID>` first — this workflow only implements a prepared fix.
2. Verify the state records `Design complete — awaiting bug-fix-implement` (or later). If Planning is incomplete, STOP and say which stage is pending.
3. **Switch to the bug branch**: `git fetch origin`, checkout the recorded Bug Branch, `git pull --ff-only` if it has an upstream. Confirm with `git branch --show-current`. All work happens on this ONE branch — never cut another branch.
4. Read `spec/plans/impact-analysis.md` and `spec/plans/bug-brief.md` — they drive the plan.
5. **▶ Resume after a halt**: if `runtime-artifacts/stories/bug-<TICKET-ID>/state.md` `## Progress` holds a `HALTED —` record (a self-healing limit or a tool-installation halt from an earlier run), this invocation is the developer handing the work back — follow `common/self-heal-limit-guidance.md` Section 4 (check the manual change, reject forbidden shortcuts, keep the developer's code, fresh budget for the halted loop only), skip Steps 2–4 (the ticket is already claimed, the baseline and the fix plan already exist), and re-run from the first code gate (Step 6) through Step 12.

## Step 2 — Ticket Claim Check (automatic)

The ticket was claimed when the analysis started (`bug-fix` Step 1 item 5). Without asking, confirm it still holds, per `common/tracker-sync.md` Section 4/Section 5/Section 9:
1. Story Tracker (single row, in the fragment): Status → `Active` (`In Progress` for a Story/Task-type ticket), Start + Recorded timestamps set.
2. Read the ticket's status live. `Active` → nothing to move. `New` or `In-Revision` (a standalone resume, or a ticket confirmed valid after In-Revision) → move it to `Active` (`common/status-model.md` B2 / B4) through the Status Map — verify it landed, announce it, log in runtime-artifacts/audit.md. `Resolved` or `Closed` → STOP: the ticket is not open for a fix.
2.2. **Assign the ticket to the operator (automatic — same claim)** — then write the fragment's `## Claim` block (`common/parallel-work-state.md` Section 3.2) from the verified transition and assignment results: the developer who typed `bug-fix-implement` claims the fix, so set them as the assignee without asking, per `common/tracker-sync.md` Section 5 — read the session email LIVE from the session context (the same one stamped as `**User Email**:` in runtime-artifacts/audit.md), then `az boards work-item update --assigned-to "<session-email>"` directly. Verify by fetching the work item back. If the identity resolves to no (or ambiguous) account, leave the assignee unchanged, warn the user, and continue — assignment failure is NON-blocking. Announce and log in runtime-artifacts/audit.md.
2.5. **Add the AIRE version label to the ticket** (mirrors dev-implement's version stamping — the defect ticket was raised by the Verification Engineer, not by the framework, so it doesn't carry the label yet), per `common/tracker-sync.md` Section 9: add `aire-anx-v[N]` to `System.Tags`. `[N]` is the FULL framework version (including the minor, e.g. `1.0` → `aire-anx-v1.0` — never the major only, never `aire-anx-v1`), read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` (never hardcoded). If the label is already present, skip. Verify, announce, log in runtime-artifacts/audit.md.
3. Skip all Parent-Epic sync steps — `## Tracker` records `Parent Epic: none` in the bug flow.

## Step 3 — BASELINE Regression Run (BEFORE any change)

**Purpose**: know what was already broken so post-fix failures are attributed correctly — a fix must never be blamed for (or silently hide) pre-existing failures.

1. Discover and run the entire repo's test suite (all modules, `tests/unit/` and `tests/api/`) with no code changes made yet. In the same moment, capture the static eval baseline (`implementation/code-generation.md` Step 11c.5, item 1).
2. Save the raw runner output to `reports/unit-test-evidence/bug-<TICKET-ID>/baseline-regression.log` (`common/story-artifacts.md` E1), record the baseline SHA (`git rev-parse HEAD` — Step 6 measures changed-line coverage against it), and record the baseline in `reports/ticket-summary/bug-<TICKET-ID>-summary.md`:
   ```markdown
   ## Baseline Regression (pre-fix)
   - Command(s): [exact commands]
   - Result: [X passed / Y failed / Z skipped]
   - Pre-existing failures: [list each failing test, or "none"]
   ```
3. Pre-existing failures are logged, not fixed — they are out of scope UNLESS a failing test is itself the defect under fix (note it if so). Log the baseline in runtime-artifacts/audit.md.
4. If the repo has no test suite at all, record that explicitly — the post-fix regression gate then covers only the new tests.

## Step 4 — Fix Plan ( announced, not gated)

1. Build the fix plan from `spec/plans/impact-analysis.md` + the design artifacts, using `code-generation.md`'s Part 1 planning format (checkboxed steps), including its Step 1.6 UI/UX design standards when UI/UX Mockups is enabled and the fix touches the interface and its Step 1.8 coding guidelines, ending with the mandatory Unit Test & Coverage step, the API Contract Tests (Step 6.2), the Test Placement check (Step 6.5), the Full Regression Gate (Step 7), the Static Evals (Step 7.2) and the Judge Score Checkpoint (Step 7.3). ** TRACE THREAD (bug variant, `common/requirements-traceability.md` Rule 7)**: tag every plan step with the `spec/plans/bug-brief.md` expected-behavior statement(s) and `spec/plans/impact-analysis.md` entry it addresses, and self-check that every expected-behavior statement and every impact-analysis touch point appears in ≥1 step before presenting the plan.
2. **Re-validate the impact analysis against current code.** If the plan must touch files NOT in the impact analysis: add them to `spec/plans/impact-analysis.md` and re-run the Defect Provenance Analyst (`agents/defect-provenance-analyst.md`, per bug-fix Step 5b) on the newly implicated defective lines — same line-level procedure (trace each defective line to its introducing commit); if any is AI-generated and the ticket isn't labeled yet, apply the `ai-generated-defect` label automatically, exactly as bug-fix Step 5b does (positive evidence only, verified, announced, logged). Also run bug-fix Step 5c on any newly resolved originating work item IDs — create the causation link (Related link + causation comment) automatically (no confirmation), skipping items already linked, verified and logged.
3. ** Announce the plan and proceed — NO approval gate**:
   1. **Log the finalized plan** in `runtime-artifacts/audit.md` (ISO 8601 timestamp) under a plain heading — e.g. `## Fix Plan — Finalized (auto-approved, no gate) (Bug [TICKET-ID])` — with the plan path, the step count and the trace summary. The word "GATE" must NOT appear in the heading.
   2. Present the plan as an announcement (NOT a question):
      ```
       Fix plan ready for Bug [TICKET-ID] — [N] steps.
      Plan: spec/spec-generation/Bug-generation.md
      Generating the fix now (Step 5).
      ```
   3. **Do NOT wait for a response** — go straight to Step 5. If the user volunteers a change to the plan, apply it, update the plan document, announce the revision, log it, and continue (an interrupt, not a gate).

## Step 5 — Generate the Fix

Execute the announced plan step by step on the bug branch, marking each checkbox `[x]` in the same interaction it completes. ** All application code goes into `src/`** (or the recorded `## Code Root` — `common/directory-structure.md`) and nothing into `spec/`. UNIT TESTS GO IN THE REPO-ROOT `tests/unit/` TREE AND API CONTRACT TESTS IN `tests/api/`, both mirroring `src/` — NEVER UNDER `src/` AND NEVER UNDER THE CODE ROOT. The `## Code Root` remapping applies to application code ONLY — a brownfield repo whose code lives in `app/` or `packages/api/src` still writes its tests to the repo-root `tests/`, never `app/tests/` or `packages/api/src/tests/`. ** PLAN FIDELITY**: implement EXACTLY the announced plan — no unplanned files, features, refactors, or scope drift; keep the fix consistent with the impact analysis and design docs the plan was grounded in. If mid-coding you discover the plan must change, revise the plan document, announce the revision (what changed and why) in your output and in runtime-artifacts/audit.md, and continue — never apply a deviation silently, and never ask for approval. No emoji in code or tests (`implementation/code-generation.md` Generation Phase Rules). Write code to the workspace root per the existing project structure. Log progress in runtime-artifacts/audit.md.

## Step 6 — Unit Tests + Coverage Gate (`implementation/code-generation.md` Step 11a)

1. Write unit test(s) that reproduce the defect — they must exercise the exact failure scenario from the bug-brief (ideally shown to fail against the pre-fix logic) — plus tests covering all new/changed code.
2. RUN them; fix failures; measure coverage on the new/changed lines against the Step 3 baseline SHA exactly as Step 11a defines; iterate in the SAME run until it is met. This is SH-LOOP-1 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT, emit the Retry-Limit Report, and do NOT proceed below the threshold.
3. Capture the evidence in `reports/unit-test-evidence/bug-<TICKET-ID>/` exactly as `common/story-artifacts.md` E1 defines — `unit-test-run.log`, `coverage/` (the tool's machine-readable report plus `changed-lines-coverage.json`) and `evidence-manifest.md` — and record tests X/X passing + the measured changed-lines coverage in `bug-<TICKET-ID>-summary.md` and the audit trail.

## Step 6.2 — API Contract Tests (`implementation/code-generation.md` Step 11a.5)

Execute Step 11a.5 in full for every endpoint the fix adds or changes, with the evidence in `reports/api-contract-test-evidence/bug-<TICKET-ID>/`. When the defect is in an endpoint, at least one API contract test reproduces it. `N/A` when the fix touches no endpoint. This is SH-LOOP-8 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 6.5 — Test Placement Check (`implementation/code-generation.md` Step 11b)

Run the test placement check over the files this fix added or changed (diff vs the Step 3 baseline SHA). A misplaced test file is moved to its mirrored path under `tests/unit/` or `tests/api/`, its imports fixed, and re-run. This is SH-LOOP-2 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report. Save `test-placement-check.log` to `reports/unit-test-evidence/bug-<TICKET-ID>/`.

## Step 7 — FULL Regression Gate (after the fix)

1. Re-run the entire repo's test suite (all existing unit and API tests + the new bug tests).
2. **Compare against the Step 3 baseline**:
   - **New failures** (passing at baseline, failing now) → caused by the fix. BLOCKING: fix them and re-run until zero new failures.  This is SH-LOOP-3 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.
   - **Pre-existing failures** (already failing at baseline) → not blocking; list them as pre-existing.
3. Save the raw output to `reports/unit-test-evidence/bug-<TICKET-ID>/full-regression.log` and add the baseline vs post-change counts to that folder's `evidence-manifest.md` (E1); append the complete outcome to `bug-<TICKET-ID>-summary.md`:
   ```markdown
   ## Full Regression (post-fix)
   - Command(s): [exact commands]
   - Result: [X passed / Y failed / Z skipped]
   - New failures caused by the fix: [none — required to proceed]
   - Pre-existing failures (unchanged from baseline): [list or "none"]
   - New bug tests: [N] — all passing | Coverage on changed code: [NN]%
   ```
4. Log the full comparison in runtime-artifacts/audit.md. Do NOT proceed with new failures outstanding.

## Step 7.2 — Static Evals (`implementation/code-generation.md` Step 11c.5)

Execute Step 11c.5 in full, diffed against the Step 3 static baseline, with the evidence in `reports/eval-evidence/bug-<TICKET-ID>/static/`. This is SH-LOOP-9 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 7.3 — Judge Score Checkpoint (J1, J2) (`implementation/code-generation.md` Step 11c.6)

Execute Step 11c.6 in full against `spec/plans/judge-rubrics.md` (written at `bug-fix.md` Step 8.5), with the evidence in `reports/eval-evidence/bug-<TICKET-ID>/judge/`, then write the eval scorecard (Step 11c.7). This is SH-LOOP-10 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 7.5 — Test Plan Check (`implementation/code-generation.md` Step 11d)

`test-plans/<TICKET-ID>-<title>/` (the bug's Test Plan Folder, `common/branching-strategy.md` Section 7.4) was already written at `bug-fix.md` Step 8.5 Item 3 and is already committed on the bug branch, so the normal case here is a **check, not a run**: confirm the folder exists and covers this ticket's ACs, and record `Manual test plan: present (written at STOP CHECKPOINT)`. Only if it is genuinely absent invoke the `ve-implement` skill with this ticket and `mode: workflow` — per `agents/ve-implement-agent.md` Mode Detection it skips its story-picker, its `ve/…` branch, its Approve/Request-Changes checkpoint and its push/PR, and the generated files stay in the working tree to ride THIS fix's commit — and announce the backfill explicitly. Never regenerate or overwrite an existing test plan to match the code. Either way this is scope derivation, not the Verification Engineer's sign-off.

## Step 8 — AUTO Code Review →  Verdict Routing + Auto-Remediate Loop

Mirrors dev-implement Sections A–C, bug-scoped. The Code Review runs automatically, and so does everything that follows from it — the user is asked nothing.

### 8a. AUTO Code Review (MANDATORY, automatic)
1. **Log** in runtime-artifacts/audit.md that automated Code Review is starting for Bug [TICKET-ID] (ISO 8601 timestamp).
2. Auto-run `workflows/code-review.md` scoped to this fix (read-only — it MUST NOT edit source) → versioned report `reports/reviews/bug-<TICKET-ID>-code-review-v[X].md`. Pass in the Step 6/6.2/6.5/7/7.2/7.3 evidence — the review MUST NOT re-run the tests, re-measure coverage, re-run the static evals or re-score J1/J2; it cites the stored evidence.
2.4. ** AUTOMATED SECURITY REVIEW (MANDATORY, automatic — inside this review pass)**: the review's Phase 2.5 runs the `agents/code-security-review-agent.md` procedure against this fix's diff (all 16 Security Baseline rules, scoped to the changed files + the attack surface they reach) and writes `reports/code-security-reviews/bug-<TICKET-ID>-security-review-v[X].md` (keyed by this story and the review version — never the dated name, which parallel stories would collide on). Its Blocker/High findings on the changed surface become real `SEC-ISS-XXX` findings — routed by 8b and auto-remediated by 8c (SH-LOOP-4) until clean, within its 3-round budget, exactly like AC findings. Medium/Low and pre-existing violations on untouched lines are advisory only (`/raise-defect` for those). Never suppress instead of fixing; never widen the scan to the whole repo.
3. **MANDATORY — audit the complete review log**: the `**TRACKER ITEM**:` field, report path, verdict, and the complete list of findings by severity (Blocker / High). Do not summarize away findings.
4. Proceed to 8b.

### 8b.  Review Verdict Routing (AUTOMATIC — no question, no gate)

The review's own verdict decides what happens next. Do NOT present an A/B choice and do NOT wait for the user. Announce the verdict, then route:
   ```
    Automated Code Review complete for Bug [TICKET-ID].
      Report: reports/reviews/bug-[TICKET-ID]-code-review-v[X].md
      Verdict: [clean — all ACs Met / findings: Blocker X, High Y]
   [Proceeding to commit + [BUG] PR. | Findings found — remediating them automatically now (round [n]).]
   ```
1. **Verdict clean (zero Blocker and zero High)** → go to Step 9.
2. **Any Blocker or High finding** → go to 8c (SH-LOOP-4). The framework fixes its own findings within a budget of 3 remediation rounds; it hands them back to the user only when that budget is exhausted (SH-4), and then it HALTS instead of raising the `[BUG]` PR.
3. **MANDATORY**: log the routing decision in runtime-artifacts/audit.md under a plain heading (`## Review Verdict — Clean, Proceeding to PR (Bug [TICKET-ID])` or `## Review Verdict — Findings, Auto-Remediating (Bug [TICKET-ID])`) with the full findings list by severity. No "GATE" in the heading, and no user response to record.

### 8c. Auto-Remediate Loop — SH-LOOP-4 (AUTOMATIC — max 3 rounds)

**Entered whenever the review verdict reports findings. Every round is automatic — no prompts at any point. The loop is bounded by the Self-Healing Retry Policy: one round = one attempt, maximum 3.**
1. **Check the SH-LOOP-4 counter BEFORE starting a round.** If 3 attempts have already been spent, do not start another — go directly to step 7 (Exhaustion).
2. **Log** in runtime-artifacts/audit.md that automatic remediation round `[n] of 3` is starting for Bug [TICKET-ID], naming the review report being remediated, the findings in scope, and the identified root cause of each (SH-3, SH-7).
3. Run `workflows/remediate.md` scoped to that report (fix → unit test → green).  Its scope-confirmation prompt is SKIPPED — every Blocker/High finding is in scope and nothing is deferred. Re-run the FULL repo suite, the static evals (Step 7.2) and the judge score checkpoint (Step 7.3) if the remediation touched non-test code, comparing against the Step 3 baselines again — only NEW failures and findings, and scores below the minimum, block, and they are fixed in the same round. Per SH-2, this re-entry continues the SH-LOOP-3, SH-LOOP-9 and SH-LOOP-10 counters — it does not reset them.
4. **MANDATORY — audit the complete remediate log**: the round number (`[n] of 3`), which findings were fixed (by severity), files changed, unit-test evidence, regression comparison. Record the complete log, not a summary.
5. **Re-review automatically**: return to 8a (produces the next report version `v[X+1]`), then 8b again.
6. **Loop control**:
   - **Verdict clean** → the loop exits successfully → Step 9.
   - **Findings remain AND attempts spent < 3** → increment the counter and return to step 1.
   - **Findings remain AND attempts spent = 3** → exhausted → step 7.
   - **Stall (SH-5)** — a round produced no code change at all AND the next review returned an identical finding set → the loop cannot progress. Treat as exhausted immediately, regardless of attempts remaining → step 7, noting the early end.
7. ** Exhaustion (SH-4) — HALT, do not raise the `[BUG]` PR.** When the budget is exhausted (3 rounds, or an SH-5 stall):
   - Do not run a 4th round, do not commit, do not push, do not raise a PR, and do not change the local Story Tracker or the external tracker. The ticket stays `Active` and the remediation work stays in the working tree.
   - Emit the Retry-Limit Report (Self-Healing Retry Policy, above) with `[loop name]` = `Auto-Remediate (code review + security findings)` and `[SH-LOOP-ID]` = `SH-LOOP-4`, listing every unresolved finding with its ID, severity, file:line, and the reason automatic remediation failed on it.
   - Append the same content to runtime-artifacts/audit.md under `## Self-Healing Retry Limit Reached — SH-LOOP-4 (Bug [TICKET-ID])`.
   - **HALT and wait for the developer to fix it manually and hand it back.** Never silence a finding by deleting it from the report, never weaken the review scope to manufacture a clean verdict, and never let an exhausted loop pass unreported.

### 8d. Status
The ticket stays `Active` throughout review and remediation.

## Step 9 — Commit, Push & Raise the `[BUG]` PR —  FULLY AUTOMATIC

**A clean review verdict is the ONLY thing that triggers this step.** An exhausted SH-LOOP-4 (8c.7) does NOT reach it — that path HALTS at the gate and waits for the user. The commit, push,
PR creation, labels, tracker update (Step 10) and auto PR review (Step 11) run **automatically with
no prompts**. Announce each action; never ask whether to do it.

1. Verify the active branch is the Bug Branch (switch automatically and announce if not). Confirm the evidence set `common/story-artifacts.md` lists for `bug-<TICKET-ID>` exists — a missing file means its step did not run: re-run that step, never hand-write the file. Run the State Isolation Check (`common/parallel-work-state.md` Section 5.5), then stage and commit — together with the fragment `runtime-artifacts/stories/bug-<TICKET-ID>/` and never the shared `audit.md` / `aire-state.md` — the fix (code + tests + updated docs) and its evidence. The commit message MUST carry an `AIRE-Version:` trailer as the framework signature — exactly as dev-implement Section D does — where `[N]` is read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` (do not hardcode a number):
   ```
   git add <fix files>
   git commit -m "[BUG][TICKET-ID] <concise fix summary>" -m "AIRE-Version: [N]"
   ```
   The `AIRE-Version: [N]` trailer goes on its own line at the end of the message body (alongside any existing trailers). Record the hash in the fragment `runtime-artifacts/stories/bug-<TICKET-ID>/audit.md`.
1.5. **Pull before push**: run `workflows/dev-implement.md` Section D Step 4 with this branch = the Bug Branch and target = the Base Branch.
2. Invoke `pr-generator` (as-is) in WORKFLOW mode, passing the Base Branch from `## Branching` as the proposed target and `<TICKET-ID>` as the work item to link (`common/repo-host.md` RH-12); it asks which branch the PR goes into (its Phase 1 Step 2) and raises it there. The PR title carries the `[BUG]` prefix; the skill applies the `ai-generated` and `aire-anx-v[N]` labels (plus the `AIRE Framework: v[N]` line in the PR body).  Its Phase 5 confirmation is SKIPPED — this workflow has no gates; invoking it is the authorization. After the target answer it announces the draft and raises the PR without asking anything more. Never re-ask about pushing or opening the `[BUG]` PR.
3. Record the PR URL in the ticket's state fragment (`runtime-artifacts/stories/bug-<TICKET-ID>/state.md`, `## Story Tracker Row` → PR — never the shared `## Branching`; readers resolve it from there or live from the bug branch) and the full outcome in the audit trail — including the labels applied (`ai-generated` + `aire-anx-v[N]`) and the work item link (or the RH-12 warning).

## Step 10 — Tracker Update (NO status move)

1. Story Tracker: keep Status = `Active`; set End = today and Recorded = now; note the PR URL.
2. **Do NOT move the ticket to `Resolved`** (or any further state) — the ticket stays `Active` after the PR; the developer moves it to `Resolved` on the board after the merge and the DEV deploy (`common/status-model.md` B7). Add a comment on the ticket (automatic) linking the PR with evidence (tests passing, coverage %, regression clean vs baseline), per `common/tracker-sync.md` Section 10: `az boards work-item update --discussion`.
3. Log in runtime-artifacts/audit.md (with the TRACKER ITEM field).

## Step 11 — AUTO PR Review

Invoke the `pr-review` skill (as-is) in AUTO MODE against the just-raised PR: it posts a plain COMMENT review (summary + inline comments) automatically — no prompt, never a formal APPROVE/REQUEST_CHANGES. Record the outcome in runtime-artifacts/audit.md.

## Step 12 — Archive Handoff (MANUAL)

**RE-READ FIRST.** Before writing any part of this step's output, `Read` this Step 12 section from the file again. Do NOT reconstruct it from memory or from earlier in this session's context — "I already read this file at Step 1" does not satisfy this.

### The ordering invariant

| # | Action | Relative to the archive |
|---|--------|-------------------------|
| 1 | `ve/...` PR(s), if the Verification Engineer raised any, merge into `<bug-branch>` | BEFORE |
| 2 | `ve-list-work` Option C amendments pushed to `<bug-branch>` | BEFORE |
| 3 | **`archive-epic`** (bug mode) | **THE ARCHIVE** |
| 4 | **`[BUG]` PR** gets its two approvals and **merges into `<base-branch>`**; CI/CD deploys it to DEV | AFTER — completes the cycle |
| 5 | Developer moves the ticket to `Resolved` on the board (`common/status-model.md` B7) | AFTER |
| 6 | Verification Engineer retests on DEV — `ve-list-work` Option B: `Closed`, or back to `Active` (B8 / B9) | AFTER |

**`archive-epic` runs at row 3 — BEFORE the `[BUG]` PR merges (row 4).** Its cycle-close archive commit must reside in the still-OPEN `[BUG]` PR so the archive rides that PR onto `<base-branch>`. Merging the `[BUG]` PR completes the cycle; the next cycle pulls fresh current-system truth from Atlas via the Helix MCP. The retest (row 6) happens on DEV, after the merge, against the tracker — a failed retest puts the same ticket back to `Active`, and the developer fixes it in a new bug cycle with `ticket-implement [TICKET-ID]`.

**TWO DIFFERENT PRs appear here — never write "the PR" unqualified:**
- the `ve/...` PR → merges into `<bug-branch>`. The archive waits for this one.
- the `[BUG]` PR → merges into `<base-branch>`. The archive must precede this one.

"Wait until all Verification Engineer test-plan work has landed" means rows 1–2 only — never row 4.

**BANNED OUTPUT — each inverts the invariant. Never emit them, in any wording:**
- "archive runs post-merge" / "it runs post-merge only"
- "when the `[BUG]` PR merges, run `archive-epic`"
- "DO NOT invoke `archive-epic` manually now"
- any statement that the framework moves the ticket to `Resolved` or `Closed`

Do NOT invoke `archive-epic`, do NOT ask whether to invoke it, and do NOT add an options menu or any competing next-steps block. The block below is the entire output of this step.

### Emit this message VERBATIM (placeholders substituted)

The ONLY permitted modification is substituting `<url>`, `<bug-branch>`, `<base-branch>`, `[TICKET-ID]`, `<slug>` with real values from `## Branching` / the Step 9 PR. Never ship an unsubstituted placeholder; never add, remove, reorder, reword, or summarise a line:

```
Bug fix for [TICKET-ID] is ready for review.
   Pull request   <url>   ([BUG] → <base-branch>)
   Status         Active — you move it to Resolved on the board once the fix is merged and deployed to DEV.
   Note           The cycle archive was deliberately NOT run — it is yours to run, at step 4 below.

REVIEW THE PULL REQUEST — FIRST
   The [BUG] PR is approved and merged manually.
   Approval and merge are manual steps — the framework never approves or merges a pull request.
   Changes needed? Leave review comments on the PR, then type:  pr-fix <url>

NEXT ACTIONS (in this order):
   1.  If the Verification Engineer raised any `ve/...` PR(s) for [TICKET-ID], wait until they have MERGED into `<bug-branch>`
       (the Verification Engineer PR into the bug branch — NOT the [BUG] PR into `<base-branch>`)
   2.  On `<bug-branch>`: `git checkout <bug-branch> && git pull --ff-only`
       (pulls the merged `test-plans/<TICKET-ID>-.../` changes in, so they ride the [BUG] PR onto `<base-branch>`)
   3.  Verification Engineer, if a test plan needs a change: use the skill ve-list-work on `<bug-branch>`,
       Option C (commit + push to `<bug-branch>`, so it rides the [BUG] PR)
   4.  Use the skill archive-epic  on bug branch (bug mode → `aire-archives/bugs/<TICKET-ID>-<slug>/`)
       MUST happen while the [BUG] PR is still OPEN — its cycle-close archive commit rides that
          open PR onto `<base-branch>`. It writes this cycle's RE delta to
          `spec/plans/delta/<TICKET-ID>-<slug>/`, archives it, and then REMOVES the live spec/,
          reports/ and runtime-artifacts/ trees — never test-plans/, which merges with the fix.
          It never stitches.
   5.  ONLY NOW, approve and merge the [BUG] PR into `<base-branch>` manually: <url>
       Its CI/CD deploys the fix to DEV.
   6.  Developer: once the DEV deploy is done, move [TICKET-ID] to Resolved on the board.
   7.  On `<base-branch>`, after that merge, type: /stitch-delta
       It reads the delta from the cycle archive and publishes it to the deep dive on Atlas via the
       Helix MCP; its own PR is a single ledger row. The cycle is NOT closed until this lands —
       skipping it leaves Atlas a cycle stale.
   8.  Verification Engineer: retest [TICKET-ID] on DEV, then use the skill ve-list-work, Option B
       • pass → the ticket moves to Closed
       • fail → the ticket goes back to Active with a comment; the developer fixes it under the
         same ticket with: ticket-implement [TICKET-ID]

ORDER IS LOAD-BEARING: archive-epic (step 4) runs BEFORE the [BUG] PR merges (step 5).
   Merging first strands the cycle archive off the PR and forces a manual recovery.
Use the skill names EXACTLY as shown — do not describe what you want in your own words.
   Any other phrasing is not a framework trigger and the workflow will not advance.
```
---

## Critical Rules
- EVERY audit entry carries the `**TRACKER ITEM**:` field AND the `**AIRE VERSION**:` field (version read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` — never hardcoded).
- **A REJECTED `[BUG]` PR IS FIXED WITH `pr-fix`** (`workflows/pr-fix.md`): review comments while the `[BUG]` PR is open are fixed by `pr-fix <PR>` on the same bug branch — it re-runs this workflow's complete gate chain (Steps 3–11) and updates the same PR. Never re-run `bug-fix-implement` to raise a second PR.
- **NO GATES AT ALL** — the fix plan is announced and executed, and the review verdict routes the run automatically. Never present a plan-approval or Approve-&-continue/Remediate prompt, and never write "GATE" into an audit heading from this workflow.
- **THE FRAMEWORK FIXES ITS OWN FINDINGS, WITHIN A BOUNDED BUDGET** — any Blocker/High finding triggers the auto-remediate loop (8c, SH-LOOP-4): remediate → regression → re-review, looping until the verdict is clean or the 3-attempt budget is exhausted. On exhaustion (3 rounds, or an SH-5 stall — no code change + identical findings) the run **HALTS at the gate**: no commit, no push, no `[BUG]` PR, no tracker change; the Retry-Limit Report is emitted to the user and to runtime-artifacts/audit.md, and the run waits for the developer to fix it manually and hand it back.
- Mid-coding plan deviations are applied only after the plan document is revised and the change announced + logged — never silently, and never via an approval prompt.
- Version stamping mirrors dev-implement: the `aire-anx-v[N]` tag on the ticket (Step 2.5), the `AIRE-Version: [N]` trailer on the fix commit (Step 9), and the `aire-anx-v[N]` label on the `[BUG]` PR (via pr-generator) — all substituted live from CLAUDE.md.
- ONE branch — work on the recorded Bug Branch only; never create story branches; never commit to the base branch.
- ALWAYS run the BASELINE regression BEFORE any change, and the FULL regression AFTER the fix; only NEW failures (vs baseline) block; log both runs' complete output in `bug-<TICKET-ID>-summary.md`.
- The 8c auto-remediate loop (SH-LOOP-4) is capped at 3 rounds by the Self-Healing Retry Policy and fixes review and security findings.
- Unit tests must include at least one test reproducing the defect; coverage on new/changed lines ≥90% (`implementation/code-generation.md` Step 11a).
- **The ticket's manual test plan is verified at Step 7.5** — authored at `bug-fix.md` Step 8.5, so the normal case is a presence check; `ve-implement` is invoked in WORKFLOW MODE only to backfill a genuinely absent plan, announced.
- NEVER commit/push/raise the PR while the review verdict is unclean. An exhausted SH-LOOP-4 (8c.7) HALTS the run — it does NOT proceed to the PR. PR via `pr-generator` only, into the branch the developer names (the Base Branch is proposed), `[BUG]` prefix, `ai-generated` label. The chain is automatic apart from that one target question — pr-generator runs in workflow mode with Phase 5 skipped; asking whether to push or open the PR is a defect.
- The ticket stays `Active` after the PR — NEVER move it to `Resolved` yourself; the developer does that on the board after the merge and the DEV deploy, and the Verification Engineer then closes it (or sends it back to `Active`) with `ve-list-work` Option B, after retesting on DEV (`common/status-model.md` B7–B9). No Parent-Epic sync exists in this flow.
- **Test plan sign-off belongs to the Verification Engineer alone.** They run `/ve-implement` independently, on their own schedule, and only `ve-list-work` can approve/reject a test plan or close the ticket. A Step 7.5 backfill is scope derivation, never a sign-off.
- At Step 2, ALWAYS assign the ticket to the operator who invoked `bug-fix-implement` per `common/tracker-sync.md` Section 5 (automatic, verified, logged). Unresolvable identity → leave unassigned, warn, continue — assignment failure never blocks the fix.
- After the PR: AUTO `pr-review` (comment-only), then STOP — the archive is MANUAL. NEVER invoke `archive-epic` from this workflow. Re-read Step 12 before emitting its handoff, and emit that block VERBATIM with placeholders substituted — do not paraphrase it. The operator runs `archive-epic` once the Verification Engineer `ve/...` PR(s) (and any `ve-list-work` Option C amendments) have merged into the bug branch, and BEFORE the `[BUG]` PR merges into the base branch, so the cycle archive rides the open PR. The retest and the ticket's close happen after the merge and the DEV deploy. archive-epic writes the cycle's RE delta, archives it and then removes the live `spec/`, `reports/` and `runtime-artifacts/` (the archive is the only copy), but never stitches. After the `[BUG]` PR merges, the operator runs `/stitch-delta` on the base branch; it reads the delta from the archive and publishes it to Atlas (it touches no `spec/`) — the cycle is not closed until that lands. Never tell the user the archive runs post-merge (that inverts the invariant), and never tell them the stitch runs pre-merge (that inverts the other one).
