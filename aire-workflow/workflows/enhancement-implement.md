# WORKFLOW: `enhancement-implement <TICKET-ID>` (Enhancement — Analysis + Implementation in ONE flow)

## READ FIRST — THE NON-NEGOTIABLES OF EVERY `enhancement-implement` RUN

Observed in a real run: a change shipped a PR with gates never run and the tracker claim made only
locally, "disclosed" as a scope call to keep the session moving, and ended on a free-form summary.
Every one of those is forbidden:

1. **Every gate runs.** No gate is skipped, deferred or "scoped out" to finish sooner. A gate ends only as
   `PASS`, or `N/A` for a reason `implementation/code-generation.md` Step 11a allows. A gate that truly
   cannot run is an `ERROR` that HALTS the run. "Not run this session", "scope call" and "to keep the
   session moving" are forbidden.
2. **Every gate passes before the commit** — unit tests + coverage, API contract tests, test placement,
   full regression, static evals, the J1/J2 judge score checkpoint and a clean code review (security review included). Anything else means no commit and no PR: HALT with
   the Self-Heal Limit message.
3. **The claim happens on the board too, before any code.**
   Move the ticket to In Progress AND assign the operator (`common/status-model.md` S2;
   `common/tracker-sync.md` Sections 4 and 5),
   verify both by re-fetching, and write the results into the fragment's `## Claim` block. Updating only
   the local fragment is a defect.
4. **Disclosing a gap does not make it acceptable.** The moment you notice a gate unrun, a transition
   unmade or a file missing is the moment to do the work — or to HALT with the Self-Heal Limit message.
   Never raise a PR with "disclosed gaps", and never ask the user whether to skip.
5. **The run ends with its exact end message.** A successful run's final output is the Step 19 handoff block,
   verbatim, every placeholder substituted, and nothing else in that message — no free-form summary
   before it, no gap list, no suggestions after it. Progress lines earlier in the run are fine; the last
   message is the block. A halted run ends with the Self-Heal Limit message instead, also verbatim.

---

## MANDATORY: Rule Details Loading

May be invoked standalone in a fresh session. Resolve `aire-workflow/` and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md`
- `common/story-artifacts.md` — the complete evidence set this run must leave behind (paths, the `evidence-manifest.md` format, keyed review and security-review names)
- `common/self-heal-limit-guidance.md` — the Self-Heal Limit message, the per-gate manual-fix playbook and the hand-back (resume) protocol used when a self-healing loop exhausts its budget or a tool cannot be installed
- `common/branching-strategy.md` — Bug Branch Model section (the enhancement branch follows the same single-branch model, with the `enhancement/` prefix)
- `planning/workspace-detection.md`, `planning/reverse-engineering.md` (if RE runs), `planning/requirements-analysis.md`, `planning/workflow-planning.md`
- `implementation/code-generation.md` (planning/generation/coverage mechanics — story selection and story-branch steps do NOT apply here). Follow the Guardrail defined there (Generation Phase Rules) for any generated code.
- **Do NOT pre-load** `implementation/test-plan.md` — Step 8.5 and Step 14.5 reach it only by invoking the `ve-implement` skill in WORKFLOW MODE, which loads its own rule files.
- `workflows/code-review.md` (auto-run after the implementation) and `workflows/remediate.md` (on the Remediate path)
- Story key for this flow: `enhancement-[TICKET-ID]`

**Loaded on demand (not at start):** `implementation/architecture-doc.md` and
`implementation/test-plans-checkpoint.md` — loaded together at Step 8.5 (the STOP CHECKPOINT), exactly
like the epic flow loads them at its own STOP CHECKPOINT.

**GUARDRAIL — `code-review` and `remediate` are WORKFLOW RULE FILES, NOT Claude skills.** Whenever this workflow "runs Code Review" or "runs Remediate", you MUST `Read` and follow `workflows/code-review.md` / `workflows/remediate.md` (which pull their detailed steps from `implementation/code-review.md` / `implementation/remediate.md`) as instructions. There is NO Claude skill named `code-review` or `remediate` — NEVER invoke one via the Skill tool.

**The converse guardrail — these ARE real Claude skills, INVOKED via the Skill tool, never re-implemented inline**: `ve-implement` (Step 8.5, and Step 14.5 only to backfill a missing test plan — WORKFLOW MODE with the ticket passed in), `pr-generator` (Step 16, workflow mode), and `pr-review` (Step 18, AUTO MODE).
- Extensions per CLAUDE.md's Extensions Loading rules (Security Baseline is ALWAYS mandatory)

Skills used **as-is — NEVER edit them**: `pr-generator` (pass the Base Branch as the proposed target — it asks which branch the PR goes into; PR type `[ENH]`), `pr-review` (AUTO MODE after the PR), and `archive-epic` in cycle mode (NEVER auto-invoked by this workflow — the operator runs it manually after all Verification Engineer work has landed on the enhancement branch; archives under `aire-archives/enhancements/`; see Step 19).

Display the welcome message (`common/welcome-message.md`) once at start. All CLAUDE.md audit-logging rules apply: log EVERY user input verbatim in `runtime-artifacts/audit.md` (append-only, ISO 8601 timestamps).

## MANDATORY: Audit Entry Format — TRACKER ITEM on EVERY entry

Every runtime-artifacts/audit.md entry in this workflow carries the `**User Email**:` field (current session email, read live), the `**TRACKER ITEM**:` field (the enhancement ticket as a clickable ADO work item link), and — from Phase B onward — the `**AIRE VERSION**:` field (read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` — never hardcoded), exactly as `dev-implement` does.

## THIS WORKFLOW IS FULLY AUTOMATIC — IT HAS NO APPROVAL GATES

**The Implementation Checkpoint ("Ready to implement now? yes / no", between Phase A and Phase B) is
the ONLY user decision in Phase B; the one question after it is which branch the `[ENH]` PR goes into
(Step 16).** Everything after that `yes` — the implementation plan, the code,
the unit-test/coverage gate, the regression gates, the automated Code Review, **the remediation of any
findings it reports**, the commit, the push, the `[ENH]` PR and the PR review — runs **without a
single approval prompt**.

- The implementation plan is built, announced and executed — never put up for approval.
- A review with findings is remediated automatically, then re-reviewed, **looping until the verdict
  is clean** — never an Approve/Remediate question.
- The Implementation Checkpoint is deliberately unnumbered flow control (it also marks the
  Verification Engineer handoff), not a numbered approval gate.
- **Never write the word "GATE" into an audit heading from this workflow.** Plan and review
  outcomes are logged as auto-approved decisions under plain headings.
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
| **SH-LOOP-1** | Unit Test & Coverage | Step 13 | All unit tests green **and** coverage on new/changed lines ≥ 90% (`implementation/code-generation.md` Step 11a) |
| **SH-LOOP-8** | API Contract Tests — only when the enhancement adds or changes an endpoint | Step 13.2 | Every API contract test passes (`implementation/code-generation.md` Step 11a.5) |
| **SH-LOOP-2** | Test Placement | Step 13.5 | Zero misplaced test files |
| **SH-LOOP-3** | Full Regression | Step 14 | Zero NEW failures versus the Step 10 baseline |
| **SH-LOOP-9** | Static Evals | Step 14.2 | Zero NEW findings on changed files versus the Step 10 static baseline (`implementation/code-generation.md` Step 11c.5) |
| **SH-LOOP-10** | Judge Score Checkpoint (J1, J2) | Step 14.3 | J1 and J2 each ≥ 0.85, or `N/A` (`implementation/code-generation.md` Step 11c.6) |
| **SH-LOOP-4** | Auto-Remediate (code review + security findings) | Step 15c | Review verdict clean — zero Blocker and zero High |
| **SH-LOOP-7** | Figma Fidelity — only when an exact-match Figma design governs the enhancement | `implementation/code-generation.md` Step 1.7 | Zero remaining differences between every governing frame and the built code |

**SH-1 — Attempt budget.** Each loop is allowed a maximum of 3 remediation attempts. One attempt
is one complete `fix → re-verify` cycle. The initial verification run that first detects the failure
is not an attempt (it is attempt 0). Attempts are numbered 1, 2, 3.

**SH-2 — Counters are per-loop, independent, and never silently reset.** Maintain a separate counter
per SH-LOOP ID. A counter is never shared between loops, never reset by another loop's success, and
never reset by advancing to a later gate. When a later loop's remediation forces re-entry into an
earlier loop (for example Step 15c re-running the Step 14 regression comparison), that re-entry **continues the earlier loop's existing
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
   external tracker. The ticket stays `In Progress` on its enhancement branch. The attempted fixes stay in the working tree for inspection.
3. Record the halt in the story's `## Progress` (`HALTED — …`, `common/self-heal-limit-guidance.md`
   Section 1) and emit the Self-Heal Limit message (the Retry-Limit Report —
   `common/self-heal-limit-guidance.md` Section 2, with the "HOW TO FIX IT YOURSELF" steps taken from the
   Section 3 playbook row for this loop) as the run's final output.
4. Append the same content to `runtime-artifacts/audit.md` under the heading
   `## Self-Healing Retry Limit Reached — [SH-LOOP-ID] (Enhancement [TICKET-ID])`, carrying the standard
   `**TRACKER ITEM**:` and `**Epic Link**:` fields.
5. **HALT and wait for the developer's manual fix.** Do not resume, re-attempt, reroute, or skip the gate on your own
   initiative. The developer fixes the problem manually and types `ticket-implement <TICKET-ID>` again; that hand-back
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
- **Story** = this ticket, Branch = the branch it stays on (on its enhancement branch);
- **HOW TO FIX IT YOURSELF** steps 1, 2, 4, 5 and Please do NOT taken from the Section 3 playbook row
  for the exhausted SH-LOOP, with real commands from the project's own build files and real evidence
  paths;
- **resume keyword** = `ticket-implement <TICKET-ID>`.

It tells the developer exactly what is failing, why the framework stopped, what the three attempts
changed (left in the working tree), how to reproduce and fix it themselves, what the gates will reject,
and how to hand the work back. It asks the developer to fix it manually and offers no options. The
hand-back grants a fresh budget for the halted loop only; every other loop keeps the counter it already
held.

---

# PHASE A — Analysis (trimmed Planning + design)

## Step 1 — Ticket Capture

1. **Resume check first**: if `runtime-artifacts/aire-state.md` exists, read it. If `## Tracker` records a DIFFERENT ticket/epic, ask the user which to keep — NEVER silently overwrite. If it records this same ticket with `Workflow Type: enhancement`, resume from the recorded stage per `common/session-continuity.md`. If `## Tracker` doesn't exist yet, run ADO Project Resolution (`common/tracker-sync.md` Section 1) first — a pasted work-item URL gives the organization and project.
2. Per `common/tracker-sync.md` Section 8: parse the `<TICKET-ID>` from the invocation (work item ID or URL). If missing, ask in one line ` Azure DevOps work item ID (or URL)?` and wait. Fetch the ticket (`az boards work-item show`) — work item type Story or Task (a Bug should go through `bug-fix` instead — warn if it's a Bug and confirm before continuing). Save title, description, and acceptance criteria to `spec/plans/enhancement-brief.md`.
   The enhancement-brief is the intake brief: it defines WHAT to enhance and is the primary input to every later stage.
3. Record in `runtime-artifacts/aire-state.md`:
   ```markdown
   ## Tracker
   - Workflow Type: enhancement
   - Parent Ticket: 4850            (the enhancement being built — work item type: [Story/Task])
   - Ticket URL: https://dev.azure.com/<org>/<project>/_workitems/edit/4850
   - Organization: <org-url>
   - Project: <project>
   - Parent Epic: none              (enhancement flow — all Parent-Epic sync steps are skipped)
   ```
   `Workflow Type: enhancement` is the marker every resumed session reads FIRST — it routes execution to this workflow's rules.
4. **MANDATORY**: Log the invocation (complete raw input) and the ticket fetch in runtime-artifacts/audit.md.

## Step 2 — Workspace Detection + Enhancement Branch (branch FIRST, before requirements)

1. Execute `planning/workspace-detection.md` Steps 1–4 as written (workspace scan, brownfield/greenfield, RE-artifact search anywhere in the repo, state file creation). An enhancement is expected to be brownfield; if the workspace is empty, STOP and suggest the full epic flow instead.
2. **Create the ENHANCEMENT branch (automatic)** — same single-branch model as the bug flow (`common/branching-strategy.md` Bug Branch Model), with the `enhancement/` prefix:
   - Record the base branch (`git branch --show-current` — never assume `main`).
   - Create `enhancement/<TICKET-ID>-<kebab-case-ticket-title>` (whole name ≤ 60 chars; working tree must be clean, else show `git status` and ask).
   - Record in `runtime-artifacts/aire-state.md`:
     ```markdown
     ## Branching
     - Base Branch: develop
     - Enhancement Branch: enhancement/4850-export-to-csv
     - Test Plan Folder: test-plans/4850-export-to-csv/   (rides the [ENH] PR — `common/branching-strategy.md` Section 7)
     - Enhancement PR: (pending — raised at the end after code review approval)
     ```
   - **ALL work — docs and code — happens on this ONE branch.** No story branches are ever cut.
3. Log the branch creation (name, base) in runtime-artifacts/audit.md, then run the Atlas Artifact Sync Opt-In (`common/atlas-artifact-sync.md` Section 2 — chat-only, skipped when `## Atlas Artifact Sync` is already recorded); present the Workspace Detection completion message and proceed automatically.

## Step 3 — Reverse Engineering (CONDITIONAL — as-is)

Exactly per the epic flow: if RE artifacts exist anywhere in the repo (or restorable from `aire-archives/`), reuse them and skip. Otherwise run `planning/reverse-engineering.md` in full, with its approval gate. Log everything in runtime-artifacts/audit.md.

## Step 4 — Requirements Analysis (as-is, enhancement-scoped)

1. Execute `planning/requirements-analysis.md` with `spec/plans/enhancement-brief.md` as the primary input. Depth will usually be minimal/standard (the ticket defines the enhancement); use comprehensive only if it is genuinely complex or high-risk. Its Step 1.5 reads the `## Context Project` answer captured by `ticket-implement` (Step 3.5) and, if `Existing Knowledge: Yes`, uses only the recorded path as background context about the existing system — do NOT re-ask.
2. Extension opt-ins are presented as usual; Security Baseline is always enforced.
3. **Wait for explicit approval** of requirements.md.
4. On approval: commit the planning artifacts on the enhancement branch. Do NOT raise a PR here — the single `[ENH]` PR is raised at the end, after code review approval.
5. **MANDATORY**: Log the user's response verbatim in runtime-artifacts/audit.md.

## Step 5 — Impact Analysis (NO AI-Origin Detection)

**Purpose**: Find WHERE the enhancement lands — the files/components to change and the blast radius — for an accurate implementation plan.

1. Using the RE artifacts, the enhancement-brief, and code search (grep/glob/read), identify the **affected files/components**: where the new behavior plugs in, what must change, and the blast radius (callers, consumers, shared files, tests). Cite explicit `file:line-range` evidence per touch point.
2. Write `spec/plans/impact-analysis.md`:
   ```markdown
   # Impact Analysis — [TICKET-ID]
   ## Change Approach
   [Where the enhancement plugs in and why, with file:line evidence]
   ## Affected Files
   | File | Why it must change |
   |------|--------------------|
   ## Blast Radius
   [Callers/consumers/tests that could be impacted by the change]
   ```
3. ** AUTOMATIC — no approval gate.** Present the Impact Analysis summary as an announcement and proceed straight to Step 6 — do NOT ask for approval and do NOT block. The analysis is evidence-based (`file:line` citations), is re-validated against current code at Step 11.2, and is re-surfaced inside the announced implementation plan (Step 11). Log in runtime-artifacts/audit.md that it was completed and auto-approved, with the affected-file list. If the user volunteers a correction, update `spec/plans/impact-analysis.md`, re-announce, and continue (an interrupt, not a gate). This document is the primary planning input for the implementation phase.

## Step 6 — Single Story (replaces User Stories + Dependency Graph)

1. Write exactly ONE story to `spec/plans/stories.md`, derived from the ticket + requirements + impact analysis: story ID `1.1`, title = the enhancement, acceptance criteria from the ticket (plus regression-safe), and a `**Covers**: REQ-F-xx, …` line naming the REQ-IDs assigned in the enhancement-scoped `requirements.md` (`common/requirements-traceability.md` Rules 2 & 7) — coverage must be complete: every REQ-ID from that requirements.md maps to this one story. Do NOT ask team size, do NOT generate extra personas, do NOT ask about pushing to the tracker (the ticket already exists — no new work item is ever created), do NOT create `dependency-graph.yml`.
2. Populate the Story Tracker in `runtime-artifacts/aire-state.md` with the single row (Tracker ID column = the existing enhancement ticket — the Tracker Sync Rule applies to it at every status change):
   | Story | Title | Requires | Tracker ID | Status | Start | End | Recorded |
   |-------|-------|----------|------------|--------|-------|-----|----------|
   | 1.1 | [Enhancement title] | none | 4850 | ToDo | | | [timestamp] |
3. **Wait for explicit approval** of the story; log the response verbatim.

## Step 7 — Workflow Planning (as-is)

Execute `planning/workflow-planning.md`: determine which Implementation design stages EXECUTE/SKIP for this enhancement (small enhancements skip most design stages), generate the execution plan + visualization (validate Mermaid), announce it, and proceed automatically — that file's Step 9/10 are an announcement, not an approval gate. Each design stage the plan selects still runs its own approval when it executes.

## Step 8 — Implementation Design Stages (CONDITIONAL, as-is)

Run the system-level design stages the plan selected (Functional Design → NFR Requirements → NFR Design → Infrastructure Design), each per its rule file with its standardized 2-option completion message and approval gate. Scope each to the enhancement-brief + impact analysis.

`package-dependencies.md`, `architecture.md` and the enhancement's manual test plan are written at Step 8.5 (STOP CHECKPOINT),
immediately below, once the last design stage completes (or all were skipped).

## Step 8.5 — STOP CHECKPOINT: `package-dependencies.md` + `architecture.md` + the enhancement's manual test plan

**Purpose**: this enhancement gets the SAME design checkpoint the epic flow gets at its own STOP
CHECKPOINT (CLAUDE.md) — scoped to ONE enhancement instead of a whole epic. Load
`implementation/package-dependencies-doc.md`, `implementation/architecture-doc.md` and
`implementation/test-plans-checkpoint.md`.

1. **MANDATORY**: Log reaching this checkpoint in audit.md.
1.5. **`spec/plans/package-dependencies.md`** (ONE approval, before `architecture.md`) — write it per
   `implementation/package-dependencies-doc.md`, scoped to this ticket: the packages it adds or
   upgrades at exact versions looked up live, and the existing ones kept as they are. Present its
   2-option approval and WAIT — or, with nothing new to install, announce that and continue. Log the
   prompt and the complete raw response.
2. **`spec/plans/architecture.md`** — if absent, write it per `implementation/architecture-doc.md`,
   consolidating whichever Step 8 design stages ran (small enhancements skip most of them — say so
   explicitly, never invent a decision) plus the reverse-engineering/Atlas artifacts as the
   existing-system baseline. Version it and log it in audit.md. Then write
   `spec/plans/judge-rubrics.md` when it is absent or its version differs
   (`implementation/architecture-doc.md` Section 6).
3. **THE ENHANCEMENT'S MANUAL TEST PLAN (MANDATORY — automatic, before any code)** per
   `implementation/test-plans-checkpoint.md` (UI/UX mockups run first when that extension is enabled).
   These are the LAST design artifacts of the cycle and the last thing written before any code exists.
   For this one ticket:
   - `test-plans/<TICKET-ID>-<title>/` — the enhancement's Test Plan Folder on the enhancement branch
     (`common/branching-strategy.md` Section 7.4) — by invoking the `ve-implement` skill in WORKFLOW MODE
     with this ticket (`agents/ve-implement-agent.md` Mode Detection — no story-picker, no `ve/…`
     branch, no approval checkpoint, no push/PR). Never re-implement its steps inline. The generated
     files ride the Verification Engineer HANDOFF BREAK commit (Item 1 there), and later the `[ENH]` PR
     into the Base Branch.
   - **Blocking coverage check**: every acceptance criterion has ≥ 1 manual test case. A gap is fixed
     here, not deferred.
   - **Then proceed straight to the Verification Engineer HANDOFF BREAK** — it pushes the plan on the
     enhancement branch and its message tells the Verification Engineer to review it there. Ask nothing.
   This is scope derivation, NOT the Verification Engineer's sign-off — the Verification Engineer
   changes the plan with `ve-list-work` Option C, and only `ve-list-work` can close the ticket.

---

# Verification Engineer HANDOFF BREAK → Implementation Checkpoint (ask, don't stop)

After the design stages complete (or are all skipped), mark in `runtime-artifacts/aire-state.md`: `Analysis complete — awaiting implementation approval`, log in runtime-artifacts/audit.md.

**This is a deliberate BREAK in the flow.** The analysis + design artifacts are everything the Verification Engineer needs, and the Verification Engineer must not have to wait for the code. So before Phase B:

1. **Commit + push the analysis, design and STOP CHECKPOINT artifacts on the enhancement branch (automatic — this is what unblocks the Verification Engineer)**: stage `spec/**` (enhancement-brief, requirements, impact analysis, the single story, `package-dependencies.md`, `architecture.md`), Step 8.5 Item 3's `test-plans/<TICKET-ID>-<title>/`, the updated `runtime-artifacts/aire-state.md` and `runtime-artifacts/audit.md`; commit on the enhancement branch with an `AIRE-Version: [N]` trailer (`[N]` read live from `CLAUDE.md`); push to origin. Announce the commit hash + pushed branch and log both in audit.md. If the push fails, say so explicitly and tell the user to push manually — the Verification Engineer cannot start until this branch is on origin. Still no `[ENH]` PR here.
2. Present the break message below and block on its yes/no.

```markdown
# Enhancement Analysis Done — Design Artifacts Pushed

 **Ticket**: [TICKET-ID] — [title]
 **Impact**: [N] files identified in spec/plans/impact-analysis.md
 Design stages: [list which ran vs were skipped]
 Manual test plan: `test-plans/[TICKET-ID]-[title]/`, written at this checkpoint, so the test
   plan exists before a line of the code does.
 Branch: enhancement/[TICKET-ID]-[title] (cut from [base branch]) — analysis + design **committed and pushed** ([commit hash])

> **<u>Verification Engineer — the manual test plan is pushed to `enhancement/[TICKET-ID]-[title]`.</u>**
> Review `test-plans/[TICKET-ID]-[title]/` on that branch. Changes needed? Run `/ve-list-work` and
> pick **C** — it updates the plan on the enhancement branch and pushes it (the `[ENH]` PR picks it
> up). Once the enhancement is merged, deployed to DEV and the ticket is `In Testing`, verify it by executing this
> test plan, then use `ve-list-work` to close the ticket or send it to `Bug fixing`.
[IF Novus Test Automation is enabled (`common/extensions-loading.md` Section 5):]
> To automate this ticket's manual cases in Novus, run `/novus-automate [TICKET-ID] --url <local or allowed URL>`.

> ** <u>**DEV — continue with the implementation plan and code generation**</u>**
> **Ready to implement now? (yes / no)**
> **yes** → everything below runs automatically, with no further questions:
> baseline regression and static eval baseline → implementation plan (announced) → code + unit
> tests (≥90% coverage) → API contract tests (when the enhancement changes an endpoint) → test
> placement → FULL regression → static evals (D1–D7) → J1/J2 judge score checkpoint (≥0.85) → eval
> scorecard → auto code review, with any findings
> auto-remediated and re-reviewed until clean (max 3 rounds) → `[ENH]` PR to
> [base branch] → auto PR review → then STOP (the cycle archive is MANUAL — you run
> `archive-epic` while the `[ENH]` PR is still open, then the PR is approved and merged).
> **no**→ I halt here; the state is saved. Resume any time with `ticket-implement [TICKET-ID]`
> (or `enhancement-implement [TICKET-ID]`) and it picks up at this checkpoint.

Use the keywords EXACTLY as shown — do not describe what you want in your own words. Any other
   phrasing is not a framework trigger and the workflow will not advance.
```

**Block until the user answers.** On no, halt here (state is saved — re-invoking `enhancement-implement <TICKET-ID>` or `ticket-implement <TICKET-ID>` resumes at this checkpoint). On yes, log the response verbatim and continue to Phase B. Substitute every placeholder (`[TICKET-ID]`, `[base branch]`, `[commit hash]`) with real values — never ship a placeholder to the user. Emit the Novus line only when that extension is enabled, and never emit the `[IF …]` marker itself. Present the message exactly as written and nothing else — no notes, caveats or summary before or after it; anything else worth keeping goes to `runtime-artifacts/audit.md`.

---

# PHASE B — Implementation (same flow, after "yes")

> **▶ Resume after a halt**: when `ticket-implement <TICKET-ID>` resumes this flow and
> `runtime-artifacts/stories/enhancement-<TICKET-ID>/state.md` `## Progress` holds a `HALTED —` record (a
> self-healing limit or a tool-installation halt), the developer is **handing the work back**: follow
> `common/self-heal-limit-guidance.md` Section 4 — check the manual change, reject forbidden shortcuts,
> keep the developer's code, fresh budget for the halted loop only — skip Steps 9–11 (already claimed,
> baselined and planned), and re-run from the first code gate (Step 13) through Step 19.


## PARALLEL-SAFE STATE — THIS PHASE WRITES ONLY ITS OWN FRAGMENT (`common/parallel-work-state.md`)

The Verification Engineer works in parallel on `ve/…` branches whose PRs merge into this same enhancement branch, and
`pr-fix` may later add commits to this PR. So that none of them conflict on the framework's bookkeeping,
**Phase B never writes the shared `runtime-artifacts/audit.md` or `runtime-artifacts/aire-state.md`**:

- Every audit entry this file tells you to append to `runtime-artifacts/audit.md` goes to
  `runtime-artifacts/stories/enhancement-<TICKET-ID>/audit.md` (same format, plus `**Story**: "enhancement-<TICKET-ID>"`).
- Every write to the ticket's Story Tracker row, its progress or its SH counters goes to
  `runtime-artifacts/stories/enhancement-<TICKET-ID>/state.md` (`## Story Tracker Row`, `## Progress`,
  `## Self-Healing Counters`).
- This overrides every mention of those two shared paths below. Reads use the resolved view
  (`common/parallel-work-state.md` Section 4); a `PR: pending` is resolved live from the branch.
- **State Isolation Check before every commit** (Step 16): every changed
  path under `runtime-artifacts/` must be inside `runtime-artifacts/stories/enhancement-<TICKET-ID>/`; anything else is
  moved into the fragment and the shared file restored to the merge-base (Section 5.5).
- Do not push a commit only to record the PR URL — it rides the next commit (Section 4.6).

(Phase A above ran before the Verification Engineer handoff, as the only writer on the enhancement branch, and wrote the
shared files; from Step 9 onward the fragment rule applies.)

## Step 9 — Ticket → In Progress (automatic)

The user's "yes" IS the claim. An enhancement ticket follows the story lifecycle (`common/status-model.md` Section 2). Without asking, per `common/tracker-sync.md` Section 4/Section 5/Section 9:
1. Story Tracker (single row): Status → `In Progress`, Start + Recorded timestamps set.
2. Read the ticket's status live. `ToDo` (or the board's initial state, through the Status Map) → move it to `In Progress` (S2). Already `In Progress` → nothing to move. `Ready for Testing`, `In Testing`, `Bug fixing` or `Closed` → STOP: the ticket is past development; a defect found in it is raised as a bug and fixed under that bug. Verify it landed, announce it, log in runtime-artifacts/audit.md.
3. **Assign the ticket to the operator (automatic — same claim)** — then write the fragment's `## Claim` block (`common/parallel-work-state.md` Section 3.2) from the verified transition and assignment results: assign and verify per `common/tracker-sync.md` Section 5 — the session email (read LIVE), falling back to the ADO CLI sign-in identity. Both unresolvable → leave unassigned, warn, continue (non-blocking). Announce and log in runtime-artifacts/audit.md.
4. **Add the AIRE version tag** `aire-anx-v[N]` to the ticket's `System.Tags` per `common/tracker-sync.md` Section 9, `[N]` read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` — never hardcoded. Skip if already present. Verify, announce, log.
5. Skip all Parent-Epic sync steps — `## Tracker` records `Parent Epic: none`.

## Step 10 — BASELINE Regression Run (BEFORE any change)

Same as the bug flow: discover and run the entire repo's test suite (`tests/unit/` and `tests/api/`) with no code changes yet, and capture the static eval baseline in the same moment (`implementation/code-generation.md` Step 11c.5, item 1); save the raw output to `reports/unit-test-evidence/enhancement-<TICKET-ID>/baseline-regression.log` (`common/story-artifacts.md` E1), record the baseline SHA (`git rev-parse HEAD` — Step 13 measures changed-line coverage against it), and record the baseline (commands, results, pre-existing failures) in `reports/ticket-summary/enhancement-<TICKET-ID>-summary.md`; pre-existing failures are logged, not fixed. Log in runtime-artifacts/audit.md. If the repo has no test suite, record that explicitly.

## Step 11 — Implementation Plan ( announced, not gated)

1. Build the plan from `spec/plans/impact-analysis.md` + the design artifacts, using `code-generation.md`'s Part 1 planning format (checkboxed steps), including its Step 1.6 UI/UX design standards when UI/UX Mockups is enabled and the enhancement touches the interface and its Step 1.8 coding guidelines, ending with the mandatory Unit Test & Coverage step, the API Contract Tests (Step 13.2), the Test Placement check (Step 13.5), the Full Regression Gate (Step 14), the Static Evals (Step 14.2) and the Judge Score Checkpoint (Step 14.3). ** GROUND THE PLAN in the previously generated docs** — every step MUST trace back to the ticket's acceptance criteria, `spec/plans/enhancement-brief.md`, `requirements.md`, the impact analysis, and any design artifacts; never invent scope, files, or behavior not backed by them. ** REQ-ID THREAD**: tag every plan step with the REQ-ID(s)/AC(s) it implements and self-check that every REQ-ID from `requirements.md` and every AC of the single story appears in ≥1 step before presenting the plan (`common/requirements-traceability.md` Rules 5 & 7).
2. **Re-validate the impact analysis against current code.** If the plan must touch files NOT in the impact analysis, add them to `spec/plans/impact-analysis.md` first .
3. ** Announce the plan and proceed — NO approval gate**:
   1. **Log the finalized plan** in `runtime-artifacts/audit.md` (ISO 8601 timestamp) under a plain heading — e.g. `## Implementation Plan — Finalized (auto-approved, no gate) (Enhancement [TICKET-ID])` — with the plan path, the step count and the REQ/AC trace summary. The word "GATE" must NOT appear in the heading.
   2. Present the plan as an announcement (NOT a question):
      ```
       Implementation plan ready for Enhancement [TICKET-ID] — [N] steps.
      Plan: spec/spec-generation/enhancement-generation.md
      Generating the enhancement now (Step 12).
      ```
   3. **Do NOT wait for a response** — go straight to Step 12. If the user volunteers a change to the plan, apply it, update the plan document, announce the revision, log it, and continue (an interrupt, not a gate).

## Step 12 — Generate the Enhancement

Execute the approved plan step by step on the enhancement branch, marking each checkbox `[x]` in the same interaction it completes. ** All application code goes into `src/`** (or the recorded `## Code Root` — `common/directory-structure.md`) and nothing into `spec/`. UNIT TESTS GO IN THE REPO-ROOT `tests/unit/` TREE AND API CONTRACT TESTS IN `tests/api/`, both mirroring `src/` — NEVER UNDER `src/` AND NEVER UNDER THE CODE ROOT. The `## Code Root` remapping applies to application code ONLY — a brownfield repo whose code lives in `app/` or `packages/api/src` still writes its tests to the repo-root `tests/`, never `app/tests/` or `packages/api/src/tests/`. ** PLAN FIDELITY**: implement EXACTLY the announced plan — no unplanned files, features, refactors, or scope drift. If a deviation is genuinely needed, revise the plan document (Step 11), announce the revision (what changed and why) in your output and in runtime-artifacts/audit.md, and continue — never applied silently, and never via an approval prompt. No emoji in code or tests (`implementation/code-generation.md` Generation Phase Rules). Write code to the workspace root per the existing project structure. Log progress in runtime-artifacts/audit.md.

## Step 13 — Unit Tests + Coverage Gate (`implementation/code-generation.md` Step 11a)

1. Write unit tests covering all new/changed code, exercising the enhancement's acceptance criteria.
2. RUN them; fix failures; measure coverage on the new/changed lines against the Step 10 baseline SHA exactly as Step 11a defines; iterate in the SAME run until it is met. This is SH-LOOP-1 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT, emit the Retry-Limit Report, and do NOT proceed below the threshold.
3. Capture the evidence in `reports/unit-test-evidence/enhancement-<TICKET-ID>/` exactly as `common/story-artifacts.md` E1 defines — `unit-test-run.log`, `coverage/` (the tool's machine-readable report plus `changed-lines-coverage.json`) and `evidence-manifest.md` — and record tests X/X passing + the measured changed-lines coverage in `enhancement-<TICKET-ID>-summary.md` and runtime-artifacts/audit.md.

## Step 13.2 — API Contract Tests (`implementation/code-generation.md` Step 11a.5)

Execute Step 11a.5 in full for every endpoint the enhancement adds or changes, with the evidence in `reports/api-contract-test-evidence/enhancement-<TICKET-ID>/`. `N/A` when it touches no endpoint. This is SH-LOOP-8 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 13.5 — Test Placement Check (`implementation/code-generation.md` Step 11b)

Run the test placement check over the files this enhancement added or changed (diff vs the Step 10 baseline SHA). A misplaced test file is moved to its mirrored path under `tests/unit/` or `tests/api/`, its imports fixed, and re-run. This is SH-LOOP-2 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report. Save `test-placement-check.log` to `reports/unit-test-evidence/enhancement-<TICKET-ID>/`.

## Step 14 — FULL Regression Gate (after the change)

Re-run the entire repo's test suite (unit and API) and compare against the Step 10 baseline — exactly as the bug flow: new failures (passing at baseline, failing now) are BLOCKING (fix and re-run until zero); pre-existing failures are listed, not blocking. Save the raw output to `reports/unit-test-evidence/enhancement-<TICKET-ID>/full-regression.log` and add the baseline vs post-change counts to that folder's `evidence-manifest.md` (E1). This is SH-LOOP-3 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report. Append the complete outcome to `enhancement-<TICKET-ID>-summary.md` and log the comparison in runtime-artifacts/audit.md.

## Step 14.2 — Static Evals (`implementation/code-generation.md` Step 11c.5)

Execute Step 11c.5 in full, diffed against the Step 10 static baseline, with the evidence in `reports/eval-evidence/enhancement-<TICKET-ID>/static/`. This is SH-LOOP-9 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 14.3 — Judge Score Checkpoint (J1, J2) (`implementation/code-generation.md` Step 11c.6)

Execute Step 11c.6 in full against `spec/plans/judge-rubrics.md` (written at Step 8.5), with the evidence in `reports/eval-evidence/enhancement-<TICKET-ID>/judge/`, then write the eval scorecard (Step 11c.7). This is SH-LOOP-10 — capped at 3 remediation attempts (SH-1). On exhaustion apply SH-4: HALT and emit the Retry-Limit Report.

## Step 14.5 — Test Plan Check (`implementation/code-generation.md` Step 11d)

`test-plans/<TICKET-ID>-<title>/` (the enhancement's Test Plan Folder, `common/branching-strategy.md` Section 7.4) was already written at Step 8.5 Item 3 and is already committed on the enhancement branch, so the normal case here is a **check, not a run**: confirm the folder exists and covers this ticket's ACs, and record `Manual test plan: present (written at STOP CHECKPOINT)`. Only if it is genuinely absent invoke the `ve-implement` skill with this ticket and `mode: workflow` — per `agents/ve-implement-agent.md` Mode Detection it skips its story-picker, its `ve/…` branch, its Approve/Request-Changes checkpoint and its push/PR, and the generated files stay in the working tree to ride THIS enhancement's commit — and announce the backfill explicitly. Never regenerate or overwrite an existing test plan to match the code. Either way this is scope derivation, not the Verification Engineer's sign-off.

## Step 15 — AUTO Code Review →  Verdict Routing + Auto-Remediate Loop

Mirrors dev-implement Sections A–C, enhancement-scoped. The Code Review runs automatically, and so does everything that follows from it — the user is asked nothing.

### 15a. AUTO Code Review (MANDATORY, automatic)
1. **Log** in runtime-artifacts/audit.md that automated Code Review is starting for Enhancement [TICKET-ID] (ISO 8601 timestamp).
2. Auto-run `workflows/code-review.md` scoped to this change (read-only — it MUST NOT edit source) → versioned report `reports/reviews/enhancement-<TICKET-ID>-code-review-v[X].md`. Pass in the Step 13/13.2/13.5/14/14.2/14.3 evidence — the review MUST NOT re-run the tests, re-measure coverage, re-run the static evals or re-score J1/J2; it cites the stored evidence.
2.4. ** AUTOMATED SECURITY REVIEW (MANDATORY, automatic — inside this review pass)**: the review's Phase 2.5 runs the `agents/code-security-review-agent.md` procedure against this change's diff (all 16 Security Baseline rules, scoped to the changed files + the attack surface they reach) and writes `reports/code-security-reviews/enhancement-<TICKET-ID>-security-review-v[X].md` (keyed by this story and the review version — never the dated name, which parallel stories would collide on). Its Blocker/High findings on the changed surface become real `SEC-ISS-XXX` findings — routed by 15b and auto-remediated by 15c (SH-LOOP-4) until clean, within its 3-round budget, exactly like AC findings. Medium/Low and pre-existing violations on untouched lines are advisory only (`/raise-defect` for those). Never suppress instead of fixing; never widen the scan to the whole repo.
3. **MANDATORY — audit the complete review log**: the `**TRACKER ITEM**:` field, report path, verdict, and the complete list of findings by severity (Blocker / High). Do not summarize away findings.
4. Proceed to 15b.

### 15b.  Review Verdict Routing (AUTOMATIC — no question, no gate)

The review's own verdict decides what happens next. Do NOT present an A/B choice and do NOT wait for the user. Announce the verdict, then route:
   ```
    Automated Code Review complete for Enhancement [TICKET-ID].
      Report: reports/reviews/enhancement-[TICKET-ID]-code-review-v[X].md
      Verdict: [clean — all ACs Met / findings: Blocker X, High Y]
   [Proceeding to commit + [ENH] PR. | Findings found — remediating them automatically now (round [n]).]
   ```
1. **Verdict clean (zero Blocker and zero High)** → go to Step 16.
2. **Any Blocker or High finding** → go to 15c (SH-LOOP-4). The framework fixes its own findings within a budget of 3 remediation rounds; it hands them back to the user only when that budget is exhausted (SH-4), and then it HALTS instead of raising the `[ENH]` PR.
3. **MANDATORY**: log the routing decision in runtime-artifacts/audit.md under a plain heading (`## Review Verdict — Clean, Proceeding to PR (Enhancement [TICKET-ID])` or `## Review Verdict — Findings, Auto-Remediating (Enhancement [TICKET-ID])`) with the full findings list by severity. No "GATE" in the heading, and no user response to record.

### 15c. Auto-Remediate Loop — SH-LOOP-4 (AUTOMATIC — max 3 rounds)

**Entered whenever the review verdict reports findings. Every round is automatic — no prompts at any point. The loop is bounded by the Self-Healing Retry Policy: one round = one attempt, maximum 3.**
1. **Check the SH-LOOP-4 counter BEFORE starting a round.** If 3 attempts have already been spent, do not start another — go directly to step 7 (Exhaustion).
2. **Log** in runtime-artifacts/audit.md that automatic remediation round `[n] of 3` is starting for Enhancement [TICKET-ID], naming the review report being remediated, the findings in scope, and the identified root cause of each (SH-3, SH-7).
3. Run `workflows/remediate.md` scoped to that report (fix → unit test → green).  Its scope-confirmation prompt is SKIPPED — every Blocker/High finding is in scope and nothing is deferred. Re-run the FULL repo suite, the static evals (Step 14.2) and the judge score checkpoint (Step 14.3) if the remediation touched non-test code, comparing against the Step 10 baselines again — only NEW failures and findings, and scores below the minimum, block, and they are fixed in the same round. Per SH-2, this re-entry continues the SH-LOOP-3, SH-LOOP-9 and SH-LOOP-10 counters — it does not reset them.
4. **MANDATORY — audit the complete remediate log**: the round number (`[n] of 3`), which findings were fixed (by severity), files changed, unit-test evidence, regression comparison. Record the complete log, not a summary.
5. **Re-review automatically**: return to 15a (produces the next report version `v[X+1]`), then 15b again.
6. **Loop control**:
   - **Verdict clean** → the loop exits successfully → Step 16.
   - **Findings remain AND attempts spent < 3** → increment the counter and return to step 1.
   - **Findings remain AND attempts spent = 3** → exhausted → step 7.
   - **Stall (SH-5)** — a round produced no code change at all AND the next review returned an identical finding set → the loop cannot progress. Treat as exhausted immediately, regardless of attempts remaining → step 7, noting the early end.
7. ** Exhaustion (SH-4) — HALT, do not raise the `[ENH]` PR.** When the budget is exhausted (3 rounds, or an SH-5 stall):
   - Do not run a 4th round, do not commit, do not push, do not raise a PR, and do not change the local Story Tracker or the external tracker. The ticket stays `In Progress` and the remediation work stays in the working tree.
   - Emit the Retry-Limit Report (Self-Healing Retry Policy, above) with `[loop name]` = `Auto-Remediate (code review + security findings)` and `[SH-LOOP-ID]` = `SH-LOOP-4`, listing every unresolved finding with its ID, severity, file:line, and the reason automatic remediation failed on it.
   - Append the same content to runtime-artifacts/audit.md under `## Self-Healing Retry Limit Reached — SH-LOOP-4 (Enhancement [TICKET-ID])`.
   - **HALT and wait for the developer to fix it manually and hand it back.** Never silence a finding by deleting it from the report, never weaken the review scope to manufacture a clean verdict, and never let an exhausted loop pass unreported.

### 15d. Status
The ticket stays `In Progress` throughout review and remediation.

## Step 16 — Commit, Push & Raise the `[ENH]` PR —  FULLY AUTOMATIC

**A clean review verdict is the ONLY thing that triggers this step.** An exhausted SH-LOOP-4 (15c.7) does NOT reach it — that path HALTS at the gate and waits for the user. The commit, push,
PR creation, labels, tracker update (Step 17) and auto PR review (Step 18) run **automatically with
no prompts**. Announce each action; never ask whether to do it.

1. Verify the active branch is the Enhancement Branch (switch automatically and announce if not). Confirm the evidence set `common/story-artifacts.md` lists for `enhancement-<TICKET-ID>` exists — a missing file means its step did not run: re-run that step, never hand-write the file. Run the State Isolation Check (`common/parallel-work-state.md` Section 5.5), then stage and commit — together with the fragment `runtime-artifacts/stories/enhancement-<TICKET-ID>/` and never the shared `audit.md` / `aire-state.md` — the change (code + tests + updated docs) and its evidence, with the framework signature trailer, `[N]` read live from CLAUDE.md:
   ```
   git add <files>
   git commit -m "[ENH][TICKET-ID] <concise enhancement summary>" -m "AIRE-Version: [N]"
   ```
   Record the hash in the fragment `runtime-artifacts/stories/enhancement-<TICKET-ID>/audit.md`.
1.5. **Pull before push**: run `workflows/dev-implement.md` Section D Step 4 with this branch = the Enhancement Branch and target = the Base Branch.
2. Invoke `pr-generator` (as-is) in WORKFLOW mode, passing the Base Branch from `## Branching` as the proposed target and `<TICKET-ID>` as the work item to link (`common/repo-host.md` RH-12); it asks which branch the PR goes into (its Phase 1 Step 2) and raises it there. The PR title carries the `[ENH]` prefix; the skill applies the `ai-generated` and `aire-anx-v[N]` labels (plus the `AIRE Framework: v[N]` line in the PR body).  Its Phase 5 confirmation is SKIPPED — this workflow has no gates; the Implementation Checkpoint authorized the whole of Phase B. After the target answer it announces the draft and raises the PR without asking anything more.
3. Record the PR URL in the ticket's state fragment (`runtime-artifacts/stories/enhancement-<TICKET-ID>/state.md`, `## Story Tracker Row` → PR — never the shared `## Branching`; readers resolve it from there or live from the enhancement branch) and the full outcome in the audit trail, including the work item link (or the RH-12 warning).

## Step 17 — Tracker Update (NO Ready-for-Testing transition)

1. Story Tracker: keep Status = `In Progress`; set End = today and Recorded = now; note the PR URL.
2. **Do NOT move the tracker ticket past `In Progress`** — after the merge and the DEV deploy the developer moves it to `Ready for Testing` on the board, the Verification Engineer moves it to `In Testing` and then closes it (or sends it to `Bug fixing`) with `ve-list-work` (`common/status-model.md` S4–S7; see Step 19). Add a comment on the ticket (automatic — part of the prompt-free post-review sequence, same as the bug flow), per `common/tracker-sync.md` Section 10, linking the PR with evidence (tests passing, coverage %, regression clean vs baseline).
3. Log in runtime-artifacts/audit.md (with the TRACKER ITEM field).

## Step 18 — AUTO PR Review

Invoke the `pr-review` skill (as-is) in AUTO MODE against the just-raised PR: it posts a plain COMMENT review (summary + inline comments) automatically — no prompt, never a formal APPROVE/REQUEST_CHANGES. Record the outcome in runtime-artifacts/audit.md.

## Step 19 — Archive Handoff (MANUAL)

**RE-READ FIRST.** Before writing any part of this step's output, `Read` this Step 19 section from the file again. Do NOT reconstruct it from memory or from earlier in this session's context — "I already read this file earlier" does not satisfy this.

### The ordering invariant

| # | Action | Relative to the archive |
|---|--------|-------------------------|
| 1 | `ve/...` PR(s), if the Verification Engineer raised any, merge into `<enhancement-branch>` | BEFORE |
| 2 | `ve-list-work` Option C amendments pushed to `<enhancement-branch>` | BEFORE |
| 3 | **`archive-epic`** (enhancement mode) | **THE ARCHIVE** |
| 4 | **`[ENH]` PR** gets its two approvals and **merges into `<base-branch>`**; CI/CD deploys it to DEV | AFTER — completes the cycle |
| 5 | Developer moves the ticket to `Ready for Testing` on the board; the Verification Engineer moves it to `In Testing` (`common/status-model.md` S4, S5) | AFTER |
| 6 | Verification Engineer tests on DEV — `ve-list-work` Option B: `Closed`, or `Bug fixing` + `raise-defect` (S6, S7) | AFTER |

**`archive-epic` runs at row 3 — BEFORE the `[ENH]` PR merges (row 4).** Its cycle-close archive commit must ride the still-OPEN `[ENH]` PR so the archive reaches `<base-branch>`. Merging the `[ENH]` PR completes the cycle; the next cycle pulls fresh current-system truth from Atlas via the Helix MCP. Testing (rows 5–6) happens on DEV, after the merge, against the tracker; a defect found there is raised as a bug and fixed under that bug.

**TWO DIFFERENT PRs appear here — never write "the PR" unqualified:**
- the `ve/...` PR → merges into `<enhancement-branch>`. The archive waits for this one.
- the `[ENH]` PR → merges into `<base-branch>`. The archive must precede this one.

"Wait until all Verification Engineer test-plan work has landed" means rows 1–2 only — never row 4.

**BANNED OUTPUT — each inverts the invariant. Never emit them, in any wording:**
- "archive runs post-merge" / "it runs post-merge only"
- "when the `[ENH]` PR merges, run `archive-epic`"
- "DO NOT invoke `archive-epic` manually now"
- any statement that the framework moves the ticket past `In Progress`

Do NOT invoke `archive-epic`, do NOT ask whether to invoke it, and do NOT add an options menu or any competing next-steps block. The block below is the entire output of this step.

### Emit this message VERBATIM (placeholders substituted)

The ONLY permitted modification is substituting `<url>`, `<enhancement-branch>`, `<base-branch>`, `[TICKET-ID]`, `<slug>` with real values from `## Branching` / the Step 16 PR. Never ship an unsubstituted placeholder; never add, remove, reorder, reword, or summarise a line:

```
Enhancement for [TICKET-ID] is ready for review.
   Pull request   <url>   ([ENH] → <base-branch>)
   Status         In Progress — you move it to Ready for Testing on the board once it is merged and deployed to DEV.
   Note           The cycle archive was deliberately NOT run — it is yours to run, at step 4 below.

REVIEW THE PULL REQUEST — FIRST
   The [ENH] PR is approved and merged manually.
   Approval and merge are manual steps — the framework never approves or merges a pull request.
   Changes needed? Leave review comments on the PR, then type:  pr-fix <url>

NEXT ACTIONS (in this order):
   1.  If the Verification Engineer raised any `ve/...` PR(s) for [TICKET-ID], wait until they have MERGED into `<enhancement-branch>`
       (the Verification Engineer PR into the enhancement branch — NOT the [ENH] PR into `<base-branch>`)
   2.  On `<enhancement-branch>`: `git checkout <enhancement-branch> && git pull --ff-only`
       (pulls the merged `test-plans/<TICKET-ID>-.../` changes in, so they ride the [ENH] PR onto `<base-branch>`)
   3.  Verification Engineer, if a test plan needs a change: use the skill ve-list-work on
       `<enhancement-branch>`, Option C (commit + push to `<enhancement-branch>`, so it rides the [ENH] PR)
   4.  Use the skill archive-epic  (enhancement mode → `aire-archives/enhancements/<TICKET-ID>-<slug>/`)
       MUST happen while the [ENH] PR is still OPEN — its cycle-close archive commit rides that
          open PR onto `<base-branch>`. It writes this cycle's RE delta to
          `spec/plans/delta/<TICKET-ID>-<slug>/`, archives it, and then REMOVES the live spec/,
          reports/ and runtime-artifacts/ trees — never test-plans/, which merges with the change.
          It never stitches.
   5.  ONLY NOW, approve and merge the [ENH] PR into `<base-branch>` manually: <url>
       Its CI/CD deploys the enhancement to DEV.
   6.  Developer: once the DEV deploy is done, move [TICKET-ID] to Ready for Testing on the board.
   7.  On `<base-branch>`, after that merge, type: /stitch-delta
       It reads the delta from the cycle archive and publishes it to the deep dive on Atlas via the
       Helix MCP; its own PR is a single ledger row. The cycle is NOT closed until this lands —
       skipping it leaves Atlas a cycle stale.
   8.  Verification Engineer: move [TICKET-ID] to In Testing on the board, test it on DEV, then use
       the skill ve-list-work, Option B
       • approve → the ticket moves to Closed
       • reject  → the ticket moves to Bug fixing and the defect is raised with raise-defect

ORDER IS LOAD-BEARING: archive-epic (step 4) runs BEFORE the [ENH] PR merges (step 5).
   Merging first strands the cycle archive off the PR and forces a manual recovery.
Use the skill names EXACTLY as shown — do not describe what you want in your own words.
   Any other phrasing is not a framework trigger and the workflow will not advance.
```

---

## Critical Rules
- EVERY audit entry carries `**User Email**:` and `**TRACKER ITEM**:`; Phase B entries also carry `**AIRE VERSION**:` (read live from CLAUDE.md — never hardcoded).
- **A REJECTED `[ENH]` PR IS FIXED WITH `pr-fix`** (`workflows/pr-fix.md`): review comments while the `[ENH]` PR is open are fixed by `pr-fix <PR>` on the same enhancement branch — it re-runs this workflow's complete Phase B gate chain (Steps 10–18) and updates the same PR. Never re-run the enhancement flow to raise a second PR.
- ONE branch (`enhancement/...`) created FIRST — before requirements; ONE story, NO dependency graph, NO new work items, NO epic branch, NO Parent-Epic sync.
- NO PR at requirements approval — the single `[ENH]` PR is raised at Step 16 after review approval, into the branch the developer names (the Base Branch is proposed), via `pr-generator` only, `ai-generated` + `aire-anx-v[N]` labels.
- Step 8.5 (STOP CHECKPOINT) gives this ONE-enhancement cycle the SAME design checkpoint the epic flow gets: `package-dependencies.md`, `architecture.md` and the enhancement's manual test plan, all before any code. Never skip Step 8.5 on the reasoning that "this is only a small enhancement."
- The Verification Engineer Handoff Break runs BEFORE the Implementation Checkpoint question: ALWAYS commit + push the analysis/design/STOP-CHECKPOINT artifacts on the enhancement branch first (the Verification Engineer reviews the test plan there), and present the Verification Engineer instructions. Their run is independent of the yes/no answer and of the code existing at all.
- The Implementation Checkpoint is a yes/no question in the same flow — never auto-continue into Phase B without the user's explicit "yes"; on "no", halt with state saved. It is deliberately unnumbered (flow control, not an approval gate) — and it is the ONLY question Phase B depends on.
- **NO GATES AT ALL** — the implementation plan is announced and executed, and the review verdict routes the run automatically. Never present a plan-approval or Approve-&-continue/Remediate prompt, and never write "GATE" into an audit heading from this workflow. The Implementation Checkpoint (yes/no) is unnumbered flow control.
- **THE FRAMEWORK FIXES ITS OWN FINDINGS, WITHIN A BOUNDED BUDGET** — any Blocker/High finding triggers the auto-remediate loop (15c, SH-LOOP-4): remediate → regression → re-review, looping until the verdict is clean or the 3-attempt budget is exhausted. On exhaustion (3 rounds, or an SH-5 stall — no code change + identical findings) the run **HALTS at the gate**: no commit, no push, no `[ENH]` PR, no tracker change; the Retry-Limit Report is emitted to the user and to runtime-artifacts/audit.md, and the run waits for the developer to fix it manually and hand it back.
- Mid-coding plan deviations are applied only after the plan document is revised and the change announced + logged — never silently, and never via an approval prompt.
- At Step 9, ALWAYS assign the ticket to the operator per `common/tracker-sync.md` Section 5 (automatic, verified, logged; failure non-blocking).
- ALWAYS run the BASELINE regression BEFORE any change and the FULL regression AFTER; only NEW failures (vs baseline) block; log both runs in `enhancement-<TICKET-ID>-summary.md`.
- The 15c auto-remediate loop (SH-LOOP-4) is capped at 3 rounds by the Self-Healing Retry Policy and fixes review and security findings.
- Plan grounded in the previously generated docs; coding follows the announced plan exactly — deviations revised into the plan, announced and logged, never silent. Coverage on new/changed lines ≥90% (`implementation/code-generation.md` Step 11a).
- **The ticket's manual test plan is verified at Step 14.5** — authored at Step 8.5, so the normal case is a presence check; `ve-implement` is invoked in WORKFLOW MODE only to backfill a genuinely absent plan, announced.
- The ticket stays `In Progress` after the PR — NEVER move it further yourself. After the merge and the DEV deploy the developer moves it to `Ready for Testing` on the board, the Verification Engineer moves it to `In Testing`, and `ve-list-work` Option B closes it or sends it to `Bug fixing` (`common/status-model.md` S4–S7).
- **Test plan sign-off belongs to the Verification Engineer alone.** They change the plan with `ve-list-work` Option C, and only `ve-list-work` can close the ticket. A Step 14.5 backfill is scope derivation, never a sign-off.
- After the PR: AUTO `pr-review` (comment-only), then STOP — the archive is MANUAL. NEVER invoke `archive-epic` from this workflow. Re-read Step 19 before emitting its handoff, and emit that block VERBATIM with placeholders substituted — do not paraphrase it. The operator runs `archive-epic` once the Verification Engineer `ve/...` PR(s) (and any `ve-list-work` Option C amendments) have merged into the enhancement branch, and BEFORE the `[ENH]` PR merges into the base branch, so the cycle archive rides the open PR. Testing and the ticket's close happen after the merge and the DEV deploy. archive-epic writes the cycle's RE delta, archives it and then removes the live `spec/`, `reports/` and `runtime-artifacts/` (the archive is the only copy), but never stitches. After the `[ENH]` PR merges, the operator runs `/stitch-delta` on the base branch; it reads the delta from the archive and publishes it to Atlas (it touches no `spec/`) — the cycle is not closed until that lands. Never tell the user the archive runs post-merge (that inverts the invariant), and never tell them the stitch runs pre-merge (that inverts the other one).
- Security Baseline extension always applies; other extensions per their recorded opt-ins.
