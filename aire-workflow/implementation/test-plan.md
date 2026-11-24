
# Test Plan (ve — per story, black-box, MANUAL test steps)

**Purpose**: For ONE story/ticket, produce the complete Test Plan artifact set as
manual, executable-by-a-human test steps covering every test plan that applies to that story.

**Owner**: ve. This file is loaded and executed by the `/ve-implement` skill
(`aire-workflow/agents/ve-implement-agent.md`).

**Two invocation paths, same content:**
- **STANDALONE** — ve types `/ve-implement <story>` on their own schedule. This is the only path that
  produces a ve sign-off; only `ve-list-work` can approve a plan, close a tested item or send it to
  Bug fixing (`common/status-model.md`).
- **WORKFLOW MODE, at the STOP CHECKPOINT** — the framework invokes the skill **once per story of
  the cycle**, before any code is generated (`CLAUDE.md` Step 1.2, `bug-fix.md` /
  `enhancement-implement.md` Step 8.5; mechanics in
  `implementation/test-plans-checkpoint.md`). The plans are published for the Verification Engineer's review before any
  code exists — on an epic cycle through the cycle's
  `[TEST]` PR into the Base Branch, on a bug or enhancement cycle on the cycle branch
  (`common/branching-strategy.md` Section 7). That is scope derivation, not ve sign-off — and an
  existing plan is never regenerated or overwritten later to match the code.

**WRITTEN EARLY, EXECUTED ON DEV.** These steps are *authored* as soon as the design stages finish
(no code needed). They are *executed* by the Verification Engineer once the item is **deployed to the
DEV environment** — its PR approved twice and merged into the development branch, the team's CI/CD
deployment done, and the item moved to `Ready for Testing` (a bug: `Resolved`) on the board
(`common/status-model.md`). The DEV environment is the system under test. **Do NOT generate build or
deployment instructions** — the team's pipeline owns them, and they trace to no acceptance criterion.
Just state the dependency in the System Under Test block below. Never write a step that depends on a
locally built instance, a developer's machine, or a staging/production deployment.

**BLACK-BOX — NEVER READ APPLICATION SOURCE CODE.** ve runs **in parallel with development**:
when this file executes, the story's code may not exist yet, may be half-written, or may sit on
an unmerged branch. Every test step is derived from the story's Acceptance Criteria and the
documents listed under Inputs — never from implementation code.

---

## Prerequisites

- A target story/ticket has been resolved (Story ID `N.M` and/or a Tracker ID) by the `/ve-implement` skill.
- **No dependency on the DEV's code, branch, PR, or merge state.** This runs at any time after the
  story exists — typically while the developer is still building it.
- **This file never runs a git command.** It is the authority for WHAT test content to generate.
  Whatever git happens around it is the caller's, and depends on the mode:
  STANDALONE — `ve-implement-agent.md` Step 3 and Step 5 publish around this file's execution:
  the `[TEST]` PR on an epic cycle, the `ve/…` branch and PR on a bug or enhancement cycle.
  WORKFLOW (the STOP CHECKPOINT test-plans stage, or an implement workflow
  backfilling a missing plan) — no branch, no commit, no push, no PR. The files are written where
  the caller says (on an epic cycle, its open `.aire-test-plans/` worktree) and the caller publishes
  them.

---

## Inputs (read these, and ONLY these)

| # | Source | What it gives you |
|---|--------|-------------------|
| 1 | **The tracker story itself** (`az boards work-item show`, per `common/tracker-sync.md` Section 8) | Authoritative summary, description, **acceptance criteria** |
| 2 | `spec/plans/stories.md` | Story detail + AC |
| 3 | `spec/plans/requirements.md` | REQ-IDs the story `Covers`, NFR targets |
| 4 | `spec/plans/epic-brief.md` | What the epic/ticket is meant to deliver |
| 5 | `spec/plans/**` (functional / NFR / NFR-design / infrastructure) | Interfaces, endpoints, data shapes, performance & security targets, deployment topology |
| 6 | `spec/plans/atlas-deep-dive.md` + the flat RE docs under `spec/plans/` (if present) | Existing external interfaces, APIs, architecture of the system under test |
| 7 | `runtime-artifacts/aire-state.md` | `## Story Tracker` (Story ID ↔ Tracker ID ↔ title), `## Tracker`, `## Branching` |

**Explicitly OUT OF BOUNDS**: application source files, unit tests, diffs, PRs, commits — and
build configuration too (`package.json`, `pom.xml`, `Dockerfile`, `docker-compose.yml`, CI
files). This file generates no build instructions, so there is nothing they could be needed for.
If a detail you need is not in the inputs above, write the step with an explicit
` TO CONFIRM: [what you need]` marker — never guess it from code, and never read code to fill it.

---

## Output Location (per story)

All artifacts for a story go into their own folder, named from the story's **Tracker ID and
title** — `<TICKET-ID>-<title-kebab-case>` — and placed in the cycle's Test Plan Folder
(`## Branching`; `common/branching-strategy.md` Section 7.1):

```
test-plans/<cycle>/<TICKET-ID>-<title-kebab-case>/      ← epic cycle: one folder per story
test-plans/<TICKET-ID>-<title-kebab-case>/              ← bug or enhancement cycle: the Test Plan Folder itself
```

Examples:
- `test-plans/4800-payment-portal/4821-user-can-reset-password/`
- `test-plans/4800-payment-portal/4822-health-check-endpoint/`
- `test-plans/4840-login-timeout/` (a bug cycle)

Below, "the story's folder" means this path; on an epic cycle it is written inside the open
`.aire-test-plans/` worktree (Section 7.2).

**One folder per story — never write another story's artifacts into it, and never overwrite an
existing story folder.** If the folder already exists, this story's Test Plan artifacts have
already been generated: STANDALONE, report that and ask whether to refresh (regenerate) or
stop; in WORKFLOW MODE, reuse the existing plan as-is and report it as reused (never ask, never
overwrite).

---

## Step 1: Resolve the Story and Extract Acceptance Criteria

1. Resolve the story's Tracker ID, title, and Story ID from the `## Story Tracker`.
2. Fetch the work item per `common/tracker-sync.md` Section 8 and use its description/AC as
   authoritative, with `stories.md` for story detail.
3. Extract the numbered acceptance criteria list (`AC-1`, `AC-2`, …) and the REQ-IDs the story
   covers. Every test step you write later must trace back to one of these.
4. Record the resolved folder: the story's folder from Output Location above.

---

## Step 2: Determine Which Test Plans Apply to THIS Story

Assess the story's AC, requirements, and design artifacts and decide which of the plans below
apply. Only generate the applicable ones — mark the rest `N/A` with a one-line reason in the
summary.

| Test Plan | Applies when | Artifact file |
|-----------|--------------|---------------|
| **Integration** | The story touches ≥2 components/services, or a service + datastore/queue/3rd-party | `integration-test-steps.md` |
| **End-to-End (E2E)** | The story completes a user-visible workflow (UI or API journey) | `e2e-test-steps.md` |
| **API** | The story adds/changes an endpoint or its contract-visible behaviour | `api-test-steps.md` |
| **Contract** | Microservices — a consumer/provider schema changes | `contract-test-steps.md` |
| **Security** | Auth/authz, input handling, PII, secrets, or a Security Baseline rule is in scope | `security-test-steps.md` |
| **Performance** | The story or its requirements carry latency / throughput / concurrency / volume targets | `performance-test-steps.md` |
| **Accessibility** | The story delivers or changes UI | `accessibility-test-steps.md` |

Present the applicability decision to ve before writing files:

```markdown
# Test Plan — [TICKET-ID] [Story title]

**Acceptance criteria found**: AC-1 … AC-[n]
**Requirements covered**: [REQ-IDs]
**Output folder**: [the story's folder — Output Location]

| Test Plan | Applies? | Why |
|-----------|----------|-----|
| Integration |  | [reason] |
| E2E |  | [reason] |
| API |  | [reason] |
| Contract |  N/A | [reason] |
| Security |  | [reason] |
| Performance |  N/A | [reason] |
| Accessibility |  N/A | [reason] |

> Proceed with generating the manual test steps for the  plans? (yes / adjust)
```

Wait for ve's answer.

**WORKFLOW MODE exception** (`ve-implement-agent.md` Mode Detection — invoked by the STOP CHECKPOINT
test-plans stage, or by an implement workflow backfilling a missing plan): do NOT wait. Present the
applicability table as an announcement and proceed straight to Step 4. The invoking stage owns the
approval (or, when backfilling, has no approval gate), and the
applicability decision is derived from the story's own acceptance criteria — there is nothing here only
a human could decide.

---

## Step 3: Manual Test Case Format (MANDATORY for every generated step)

Every test case in every artifact uses this exact structure. These are steps a **human tester
executes by hand** — no code, no test framework, no scripts.

```markdown
### TC-[PLAN]-[nn] — [Short title]

| Field | Value |
|-------|-------|
| **Traces to** | AC-[n] [/ REQ-ID] |
| **Type** | Integration / E2E / API / Contract / Security / Performance / Accessibility |
| **Priority** | P1 (critical path) / P2 / P3 |
| **Preconditions** | [the DEV environment described in **System Under Test**, plus the data, accounts, feature flags and services that must exist there — NEVER a local build] |
| **Test data** | [exact inputs / payloads / user accounts to use] |

**Steps**
1. [Action the tester performs — concrete and unambiguous]
2. [Action]
3. [Action]

**Expected result**
- [Observable, verifiable outcome — status code, message, screen state, record state]
- [Second expectation, if any]

**Pass/Fail criteria**: [what makes this a PASS; anything else is a FAIL]
**Cleanup**: [how to reset state after the run]
```

Rules for writing the steps:
- **Observable only** — assert on things a tester can SEE from outside the system (HTTP response,
  UI state, email received, row visible in an admin screen, log line in a shipped log).
  Never assert on internal functions, classes, or private state.
- **Negative and edge cases are mandatory** — every AC gets at least one happy-path case and at
  least one negative/boundary case.
- **Traceability is mandatory** — no test case without an `AC-[n]`. No AC without ≥1 test case.
- **Self-contained** — a tester who has never seen this project must be able to run the case.
- Where the AC leaves a detail undefined, write ` TO CONFIRM: [question for the BA/dev]`
  inline rather than inventing behaviour.

---

## Step 4: Generate Each Applicable Functional/Non-Functional Test Plan

For each  plan from Step 2, create its artifact file in the story folder. Each file opens with a
short purpose + scope block, then lists test cases in the Step 3 format.

**Every plan below targets the DEV environment** described in the System Under Test block —
DEV base URL, DEV data, DEV accounts. Do not reference a local instance or a staging/production URL.

**Every generated artifact opens with the same short System Under Test block** (a precondition, not
a build manual):

```markdown
## System Under Test
| Item | Value |
|------|-------|
| Environment | DEV — [DEV base URL, from the design artifacts, or  TO CONFIRM] |
| Development branch | [the recorded Base Branch, e.g. `develop`] |
| This item's PR | [PR URL / number — merged into the development branch] |
| Confirm it is deployed | The item is `Ready for Testing` (a bug: `Resolved`) on the board, and the build deployed to DEV contains its merge commit — [how the team's pipeline shows the deployed version, or  TO CONFIRM] |
| Services the test needs | [datastore, queue, third-party sandbox — as provisioned in DEV, or none] |
| Test data / accounts to seed | [list, or none] |

> If the DEV deployment is missing, failed, or does not contain the merge, that is a **blocker on the
> dev team** — report it and do not log functional failures against a build without the change.
```

- **`integration-test-steps.md`** — cases that exercise a boundary between two components from
  the outside: service A's endpoint causing an observable effect that service B, the datastore, a
  queue or a third-party surfaces. Derive the boundaries from the design/reverse-engineering
  artifacts, never from code.
- **`e2e-test-steps.md`** — complete user journeys end to end (`TC-E2E-01: user registers → verifies
  email → logs in → sees dashboard`). One case per journey the AC implies.
- **`api-test-steps.md`** — per endpoint: happy path, each documented error path, auth required/absent,
  bad payload, boundary values. Assert status code, response shape, and headers.
- **`contract-test-steps.md`** — for each consumer/provider pair: required fields, types, optional
  fields, backward-compatibility check against the previously published schema.
- **`security-test-steps.md`** — authentication required, authorization enforced per role, IDOR
  attempt, injection-style inputs rejected, sensitive data absent from responses and logs, security
  headers present, rate limiting. Map each case to the relevant Security Baseline rule where one
  applies.
- **`performance-test-steps.md`** — state the target from requirements/NFR design
  (`p95 < [X]ms at [Y] rps with [Z] concurrent users`), then the manual procedure to measure it and
  the pass threshold. Include the record-the-numbers table.
- **`accessibility-test-steps.md`** — keyboard-only navigation, focus order and visibility, screen
  reader labels, colour contrast, error announcement, zoom to 200%. Reference the WCAG criterion per
  case.

---

## Step 5: Generate `test-plan-summary.md` (always — the story's ve index)

```markdown
# Test Plan Summary — [TICKET-ID] [Story title]

**Story**: [Story ID N.M] — [title]
**Tracker ID**: [TICKET-ID](https://dev.azure.com/<org>/<project>/_workitems/edit/TICKET-ID)
**Generated**: [ISO 8601 timestamp — from a real clock]
**Generated by**: [session email]
**Source of truth**: Acceptance criteria (black-box) — no application source code was read
**AIRE VERSION**: [N]

## Applicable Test Plans
| Test Plan | Artifact | Cases | Status |
|-----------|----------|-------|--------|
| Integration | integration-test-steps.md | [n] | Not run |
| E2E | e2e-test-steps.md | [n] | Not run |
| API | api-test-steps.md | [n] | Not run |
| Contract | — | — | N/A — [reason] |
| Security | security-test-steps.md | [n] | Not run |
| Performance | — | — | N/A — [reason] |
| Accessibility | — | — | N/A — [reason] |

## Acceptance Criteria → Test Case Coverage
| AC | Criterion | Test cases | Covered |
|----|-----------|------------|---------|
| AC-1 | [text] | TC-API-01, TC-API-02, TC-SEC-01 |  |
| AC-2 | [text] | TC-E2E-01 |  |

**Coverage check**: [n]/[n] acceptance criteria have at least one test case.  / 

## Execution Record (filled in by Verification Engineer when the story is tested)
| Test case | Run date | Result | Defect raised |
|-----------|----------|--------|---------------|
| TC-API-01 | | Pass / Fail | |

## Open Questions
- TO CONFIRM: [each unresolved detail, with who should answer it]
```

**The AC coverage check is a checkpoint**: if any acceptance criterion has zero test cases, do not
present completion — add the missing cases first.

---

## Step 6: Present Completion

```markdown
# Test Plan Ready — [TICKET-ID] [Story title]

 **Artifacts**: `[the story's folder — Output Location]`
**Test plans generated**: [list] ([n] manual test cases total)
 **Coverage**: [n]/[n] acceptance criteria covered
 **Not applicable**: [list with reasons]


> These are **manual test steps derived from the acceptance criteria** — they can be executed as
> soon as the story is merged into the development branch and deployed to DEV
```

**Confirm-first checkpoint — do not finish silently.** Immediately after the message above, ask:

> **WORKFLOW MODE exception** (`ve-implement-agent.md` Mode Detection): **SKIP this checkpoint
> entirely.** The STOP CHECKPOINT test-plans stage approves the whole set at its own gate once every
> story's plan is written (an implement workflow backfilling a missing plan has no approval gate).
> Record `**Approve / Request Changes checkpoint**: deferred to the caller (workflow mode)` in the
> Step 7 audit entry and hand control straight back to the caller. Never present this content as
> ve-signed-off: ve's own standalone `/ve-implement` run and `ve-list-work` remain the only sign-off
> path.

```markdown
 **Do you approve this test plan, or do you want to request changes?**

   1)  Approve — accept this as final
   2)  Request Changes — go back and adjust

[Answer]:
```

- On Approve → proceed to Step 7 (log the run in `runtime-artifacts/audit.md`).
- On Request Changes → ask what to adjust (which plan, which case, what's missing), apply the
  change, regenerate the affected artifact(s) and the coverage table, then re-present this same
  Step 6 completion message and checkpoint. Never close the run without landing on this checkpoint first.

---

## Step 7: Log the Run in runtime-artifacts/audit.md

**Which file** (`common/parallel-work-state.md`): standalone mode runs in parallel with the
developers' branches, so it appends to its own fragment
`runtime-artifacts/stories/ve-<TICKET-ID>/audit.md` (with `**Story**: "ve-<TICKET-ID>"`) and never
the shared `runtime-artifacts/audit.md`, so it cannot conflict with any story PR or with Verification
Engineer decisions on the docs branch. On a bug or enhancement cycle the fragment rides the `ve/…`
PR; on an epic cycle it is committed on the epic branch (through `.aire-docs/` when it exists) —
never on the `[TEST]` PR, which carries test plans only. Workflow mode writes wherever the invoking
workflow writes: the shared file at the STOP checkpoint (a docs-branch writer), the invoking story's
fragment (in `.aire-docs/` on an epic cycle) when `dev-implement` / `epic-enhancement` / `epic-bugfix` /
`pr-fix` backfill a plan. Before the standalone
commit, run the State Isolation Check (Section 5.5) for story key `ve-<TICKET-ID>`.

Append (never rewrite) one entry to that file:

```markdown
## Test Plan (ve-implement skill)
**Timestamp**: [ISO 8601 — real clock]
**User Email**: [current session email — read live from the session context]
**User Input**: "[complete raw user input]"
**Story**: "[Story ID N.M] — [title] — [4821](https://dev.azure.com/<org>/<project>/_workitems/edit/4821)"
**Output folder**: `[the story's folder — Output Location]`
**Verification Engineer branch / PR**: "<test-plans/<cycle>[-<n>] → [TEST] PR <url> into <Base Branch> | ve/<TICKET-ID>-<title-kebab> → PR <url> into <Bug Branch | Enhancement Branch>>" — STANDALONE only; in WORKFLOW mode write exactly "none — workflow mode, files written for <caller> and published by it"
**Test plans generated**: "[list of applicable plans, with case counts] — N/A plans: [list with reasons]"
**Coverage**: "[n]/[n] acceptance criteria covered"
**Approve / Request Changes checkpoint**: "[Approved / Request Changes → re-did [what] → re-approved]"
**AI Response**: "[what was generated/changed]"
**Context**: `/ve-implement` skill — Test Plan (`test-plan.md`)

---
```

Write a tracker-linked story as a clickable Markdown link to its ADO work item URL,
never bare text.

**This audit entry is the ONLY framework state this file writes.** It never touches the Story
Tracker, story status, or tracker status — those remain `ve-list-work`'s job.

---

## Critical Rules

- **Never read application source code, and never read build configuration either.** All test
  steps come from acceptance criteria, requirements, design artifacts, the tracker story, and
  documented external interfaces. This file does NOT generate build instructions — the project's
  own build docs own that — so there is no reason to open `package.json`, `pom.xml`, a Dockerfile
  or anything similar.
- **Manual test steps only.** This file produces human-executable test cases — it does NOT
  generate, run, or reference automated test scripts. It never touches application code. The
  branch, commit and PR that carry these artifacts in STANDALONE mode (the epic cycle's `[TEST]` PR,
  or a bug/enhancement cycle's `ve/…` PR) come from `ve-implement-agent.md` Step 3 and Step 5 around
  this file's execution. In WORKFLOW mode there is no branch and no PR — the files are written where
  the caller says and the caller publishes them.
  Either way, this file itself defines content, not git steps.
  Automated Novus tests are a separate, optional stage (`/novus-automate`,
  `extensions/testing/novus-automation/novus-automation.md`) that reads approved plans and never edits
  them — so nothing in this file changes for it.
- **One story per run**, into its own folder in the cycle's Test Plan Folder (Output Location).
  Never overwrite another story's folder or touch another cycle's Test Plan Folder; standalone, ask
  before refreshing an existing one (workflow mode reuses it).
- **Every test case traces to an AC; every AC has ≥1 test case.** The coverage check in the
  summary is a blocking checkpoint.
- **Runs in parallel with development.** Never wait for the DEV's code, branch, PR, or merge to
  *author* these steps.
- **The system under test is the DEV environment.** The Verification Engineer *executes* these
  steps once the item is merged into the development branch, deployed to DEV by the team's CI/CD and
  moved to `Ready for Testing` (a bug: `Resolved`) on the board. Every precondition, URL and account
  must reflect DEV. Never write a step that assumes a local build, a developer's machine, or a
  staging/production deployment.
- **Never generate build or deployment instructions.** They are identical for every story, trace
  to no acceptance criterion, and belong to the team's pipeline. Each artifact only states the
  System Under Test precondition (DEV URL, merged PR, deployed-build check, services, test data).
- **Unknowns are marked ` TO CONFIRM`**, never invented and never resolved by reading code.
- **Never touch the Story Tracker, story status, or tracker status here.** Status changes are the
  `ve-list-work` skill's job (its local Option B).
- **Never close the run without the Step 6 Approve / Request Changes checkpoint.** On Request Changes,
  fix the plan, regenerate the coverage table, and re-present the checkpoint — never finish silently.
- **Always log the run in `runtime-artifacts/audit.md` (Step 7), append-only**, once the checkpoint is Approved. This is
  the only file this skill writes outside the story's folder.
- Timestamps come from a real clock in ISO 8601; the framework version `[N]` is read live from
  the canonical line in `CLAUDE.md`.
