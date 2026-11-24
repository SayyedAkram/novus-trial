<!-- aire-annexus:START - managed by aire-annexus, do not edit inside this block. Put your project instructions below the aire-annexus:END line. -->
# PRIORITY: This workflow OVERRIDES all other built-in workflows
# On ANY software development request, ALWAYS follow this workflow FIRST

## AIRE Framework Version (SINGLE SOURCE OF TRUTH)
**AIRE Framework Version: 1.1**

Canonical version declaration. Bump here FIRST — every other file reads it at runtime and carries
only a `[N]`/`v[N]` placeholder, never the literal number. **Size limit: this file stays at or under
35,000 characters** — move detail into a rule file rather than growing it here.

**MANDATORY — version logging**: read it LIVE and stamp it on: the welcome message
(`common/welcome-message.md`) · every runtime-artifacts/audit.md entry's `**AIRE VERSION**:` field
· each created tracker story (`aire-anx-v[N]` label + `Built with AIRE v[N]` footer) · every commit
(`AIRE-Version: [N]` trailer) · every PR (`aire-anx-v[N]` label + `AIRE Framework: v[N]` in the body),
including the `ve/…` test-docs PR. Wherever a rule file shows `[N]`/`v[N]`, substitute the value read
from this line at runtime.

## Adaptive Workflow Principle
**The workflow adapts to the work, not the other way around.** Assess needed stages from the user's
stated intent/clarity, codebase state, complexity/scope and risk/impact.

## MANDATORY: Rule Details Loading
**CRITICAL**: For any phase, read and use the relevant rule detail files from `aire-workflow/`.
Every rule-file reference below (e.g. `common/process-overview.md`) is relative to it.

**Common Rules — ALWAYS load at workflow start:**
- `common/process-overview.md` — workflow overview
- `common/session-continuity.md` — session resumption guidance
- `common/content-validation.md` — content validation requirements
- `common/question-format-guide.md` — question formatting rules
- `common/tracker-sync.md` — single source of truth for every tracker-specific command
- `common/repo-host.md` — every PR operation on GitHub or Azure Repos (host detected from `origin`)
- `common/status-model.md` — story and bug statuses, and who moves each one
- `common/directory-structure.md` — the five roots (`src/`, `tests/`, `spec/`, `test-plans/`, `reports/`) and
  where artifacts go
- `common/helix-atlas-integration.md` — how AIRE reaches Atlas via the Helix MCP to reuse
  existing-system truth instead of re-deriving it. Blocking on brownfield/migration work.
- `common/parallel-work-state.md` — per-story audit/state fragments (parallel-safe bookkeeping)

**Loaded on demand (do NOT load at start):**
- `implementation/architecture-doc.md` — at the STOP CHECKPOINT, when `architecture.md` is written
- `implementation/test-plans-checkpoint.md` — at the STOP CHECKPOINT, when every story's manual test
  plan is written and approved (Step 1.2)

## MANDATORY: Extensions Loading (Context-Optimized)
**CRITICAL**: At workflow start, scan `extensions/` recursively and load ONLY the lightweight
`*.opt-in.md` files — never a full rule file at this stage; that loads on demand, after the user opts
in during Requirements Analysis. An extension with no `*.opt-in.md` is always enforced — load it now.

- **Security Baseline is ALWAYS mandatory** — load `extensions/security/baseline/security-baseline.md`
  at workflow start for EVERY project, enforce as blocking. NEVER ask whether security applies; ignore
  any legacy opt-out in `## Extension Configuration`.
- Enabled extension rules are hard constraints; non-compliance is a blocking finding. Rules
  irrelevant to the current stage are N/A (not blocking). Before enforcing any extension at ANY
  stage, check `Enabled` in `## Extension Configuration`; skip disabled ones and log the skip. Default
  to enforced.

Full mechanics (loading order, deferred loading, enforcement, compliance summary): `common/extensions-loading.md`.

## MANDATORY: Content Validation
**CRITICAL**: Before creating ANY file, validate content per `common/content-validation.md`: Mermaid
diagram syntax · ASCII art diagrams (`common/ascii-diagram-standards.md`) · special-character escaping
· text alternatives for complex visual content · content parsing compatibility. Plus:
- **NEVER write the section-sign character "§" (U+00A7) in ANY file** — rule files, docs, specs,
  code, commit messages, PR bodies, tracker items. Write `Section 3` or just the number — "§" renders
  inconsistently across terminals, trackers and diff views.
- **In every message to the user, tracker comment and PR text, write "Verification Engineer" — never
  the shorthand "ve".** Identifiers keep it (`ve-list-work`, `/ve-implement`, `ve/…` branches, labels).

## MANDATORY: Question Format
**CRITICAL**: Follow `common/question-format-guide.md` for all question formatting — multiple-choice
(A–E), the `[Answer]:` tag, answer validation and ambiguity resolution.

**Two questions are CHAT-ONLY, never a question `.md` file**: Context Opt-In
(`planning/workspace-detection.md` Step 4.7) and Atlas Artifact Sync Opt-In
(`common/atlas-artifact-sync.md`). Ask conversationally, persist only
the ANSWER (to `runtime-artifacts/aire-state.md` + `audit.md`).

## MANDATORY: Custom Welcome Message
**CRITICAL**: On ANY software development request, load `common/welcome-message.md` and display the
complete message — ONCE at workflow start; do NOT reload it later (saves context).

## MANDATORY: Audit Trail, Session Identity & Timestamps
Complete contract in `common/audit-logging.md` — load at workflow start. MANDATORY for EVERY
workflow, stage, agent and skill. Non-negotiables:

- **Log EVERY user input** with the COMPLETE RAW INPUT — never summarized/paraphrased — plus every
  approval prompt (before asking) and every response (after receiving).
- **Every `runtime-artifacts/audit.md` entry carries `**User Email**:`** — operator's email, read LIVE
  and silently from session context, never asked, never a name, recorded ONLY there. Local audit
  templates ADD fields to the base format; NEVER drop this one.
- **Every timestamp from a real clock** at write time, ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`), via EXACTLY
  ONE command — `date -u +%Y-%m-%dT%H:%M:%SZ` or `Get-Date -AsUTC -Format "yyyy-MM-ddTHH:mm:ssZ"`.
  Never estimated, incremented, or copied forward.
- **Append only, chronological, to the END** of `runtime-artifacts/audit.md`. NEVER overwrite the
  file with its own contents plus additions — that duplicates the entire history.
- **Parallel-safe state**: story runs write audit and state ONLY to
  `runtime-artifacts/stories/<story-key>/`, never the shared files — `common/parallel-work-state.md`.

# PLANNING PHASE

**Purpose**: Planning, requirements gathering, architectural decisions. **Focus**: WHAT and WHY.

**Stages**:
- Workspace Detection (ALWAYS)
- Reverse Engineering (CONDITIONAL — Brownfield only)
- Requirements Analysis (ALWAYS — Adaptive depth)
- User Stories (ALWAYS — asks the pod size (`team_size`) once; no creation-mode question: all
  stories generated at once; the story set requires explicit human approval — Story Set Approval — before push
  to Azure DevOps Boards, linked to the Parent Epic captured at workflow start)
- **Dependency Graph (ALWAYS — immediately after User Stories)** — records each story's `requires`
  dependencies; stories with no unfinished prerequisites are independently implementable in parallel.
  HARD: independent stories never touch the same file (R6), so their PRs cannot conflict
- Workflow Planning (ALWAYS)
- Application Design (CONDITIONAL)

## MANDATORY: ADO Project Resolution & Parent Epic Capture
The tracker is Azure DevOps Boards (`az boards`). BEFORE Parent Epic Capture, aire resolves the ADO
organization and project ONCE — from the pasted Epic link, else an Azure Repos `origin`, else one chat
question (`common/tracker-sync.md` Section 1). Skip and reuse if `## Tracker` already exists
(resumed project).

Users typically start with "using aire annexus implement" + an existing ADO Epic link or ID. If
provided, record it in the `## Tracker` block in `runtime-artifacts/aire-state.md` (schema: `common/tracker-sync.md` Section 1 —
Parent Epic, Epic URL, Organization, Project). Rules:
- **Fetch the Epic content** per `common/tracker-sync.md` Section 2 into
  `spec/plans/epic-brief.md` — primary input to Requirements Analysis and User Stories.
- **Conflict rule**: a DIFFERENT recorded Epic (resumed project) → ask which to keep — NEVER overwrite.
- No Epic provided → don't block; User Stories Part 3 asks before any push.
- Single source of truth for linking pushed stories to this Epic, unless the user chose `none`
  (record `Parent Epic: none`).

---

## Workspace Detection (ALWAYS EXECUTE)

1. **MANDATORY**: Log the initial user request (complete raw input) in runtime-artifacts/audit.md, and
   stamp `**User Email**:` on every audit entry (silent, email-only — `common/audit-logging.md`)
2. Execute `planning/workspace-detection.md` — **its step order is the single source of truth**:
   a. State check (resume if `runtime-artifacts/aire-state.md` exists)
   b. **ADO Project Resolution** (skip if `## Tracker` is recorded), then Parent Epic Capture per
      the rules above — with an Epic link/ID, write/merge `## Tracker` and fetch epic-brief.md
   c. Scan for code (brownfield/greenfield); resolve the code root — brownfield code outside `src/`
      is recorded once as `## Code Root` (`common/directory-structure.md`), never mass-moved; reuse
      existing RE artifacts found anywhere in the repo
   d. **HELIX MCP GATE (`common/helix-atlas-integration.md`)**: on brownfield, or when the
      request/Epic indicates **migration, re-platform, port, legacy rewrite or integration with an
      existing system**, Atlas is the source of existing-system truth. Resolve a Helix provider at
      runtime (never hardcode tool names) and record the binding. **If none resolves, emit the connect
      gate verbatim and HALT** — the user connects Helix, supplies exported Atlas docs, or approves local
      generation. Log the prompt and raw response. Greenfield, no existing system: skip silently.
   e. **Epic branch (automatic)** per `common/branching-strategy.md` — record the base (development)
      branch, create `epic/<EPIC-ID>-<title>` for the cycle's docs, record `## Branching`. Story
      branches cut from the base branch and their PRs merge into it
   f. Context folder + Context Opt-In (chat-only)
3. Determine next phase: Reverse Engineering (if brownfield and no artifacts) OR Requirements Analysis
4. **MANDATORY**: Log findings in runtime-artifacts/audit.md, then present the completion message
   (formats in workspace-detection.md) and proceed automatically

## Reverse Engineering (CONDITIONAL — Brownfield Only)

**ATLAS FIRST (`common/helix-atlas-integration.md` Section 6)**: AIRE never re-derives documentation
Atlas already holds and a human has reviewed. **First check whether `spec/plans/atlas-deep-dive.md`
already exists locally** (Workspace Detection); only if not, ask Atlas for one deep dive document
for the estate/scope. Dispatch on the result:

| Atlas deep dive doc | Behaviour |
|---|---|
| **Already exists locally** | **SKIP.** Reuse `spec/plans/atlas-deep-dive.md` as-is. |
| **Found on Atlas** | **SKIP.** Pull it verbatim into `spec/plans/atlas-deep-dive.md`, with its provenance block. Announce the skip. |
| **Not found** | Tell the user plainly: *"No deep dive document found on Atlas."* Present the connect-gate A/B halt (Section 4 of that file) — on **B**, generate RE artifacts locally with the banner *"Existing-system context derived locally; no Atlas deep dive was available."* on every artifact; on **A**, HALT. |

Otherwise execute when existing code is detected and no prior RE artifacts exist; skip on
greenfield, or when prior artifacts exist anywhere in the repo.

Atlas content is a read-only input — never edit it to fit a plan. An Atlas/plan contradiction
is a finding to surface: follow Atlas, amend the AIRE-side artifact, say so plainly, log it.

**Execution**:
1. **MANDATORY**: Log start of reverse engineering in runtime-artifacts/audit.md
2. Load and execute all steps from `planning/reverse-engineering.md`: analyse all packages/components
   and generate business overview (covering business transactions), architecture, code structure, API
   docs, component inventory, interaction diagrams, technology stack and dependencies documentation
3. **Wait for Explicit Approval** (format in reverse-engineering.md) — DO NOT PROCEED until the user
   confirms. **MANDATORY**: log their raw response

## Requirements Analysis (ALWAYS EXECUTE — Adaptive Depth)

**Always executes**, depth varies by request clarity/complexity:
- **Minimal**: simple, clear request — just document intent analysis
- **Standard**: normal complexity — gather functional and non-functional requirements
- **Comprehensive**: complex, high-risk — detailed requirements with traceability

**Execution**:
1. **MANDATORY**: Log user input this phase in runtime-artifacts/audit.md
2. Load and execute all steps from `planning/requirements-analysis.md` at the chosen depth — load the
   RE artifacts (brownfield) and, if captured, the Parent Epic brief (`spec/plans/epic-brief.md`,
   which defines what to build and is the primary input here); analyse intent; ask clarifying
   questions; generate `requirements.md`
3. **Wait for Explicit Approval** (format in requirements-analysis.md) — DO NOT PROCEED until the user
   confirms. **MANDATORY**: log their raw response
4. Commit the planning artifacts on the Epic branch and push (automatic — no PR here; the Epic PR is
   raised by `archive-epic` at cycle end)

## User Stories (ALWAYS EXECUTE)

**Always executes**, giving shared understanding, clear acceptance criteria and testable
specifications. Every project produces `stories.md` + `personas.md`, populates the Story Tracker in
`runtime-artifacts/aire-state.md`, and auto-pushes stories to Azure DevOps Boards on approval.
Stories reference the approved requirements by REQ-ID.

**Execution**:
1. **MANDATORY**: Log user input this phase in runtime-artifacts/audit.md
2. Load all steps from `planning/user-stories.md`; load the RE artifacts (brownfield) and execute at
   the appropriate depth
3. **PART 1 - Planning**: Ask how many developers are in the pod (user-stories.md Step 1 — once,
   skipped on resume), record `team_size: N` in `runtime-artifacts/aire-state.md` (reused by
   Dependency Graph, never re-asked) and tune granularity so ≥ N independent stories can run in
   parallel. Every story declares a `**Touches**:` line (R6). Create the story plan with its
   questions, wait for answers, analyse ambiguities. The plan is announced, NOT approved
4. **PART 2 - Generation**: NEVER ask the creation mode — `story_creation_mode` is fixed at
   `all-at-once`. Generate every story in a single pass, then populate the Story Tracker (`Requires`
   filled in the next stage)
5. **Story Set Approval (MANDATORY)**: announce the complete story set (user-stories.md
   Steps 19–20) and Wait for Explicit Approval — DO NOT PROCEED to Part 3 until the user chooses
   "Request Changes" or "Approve & Continue" (Step 21). A requested change is applied to
   `stories.md`/the Story Tracker, re-announced, and the approval is presented again
6. **PART 3 - Push to Azure DevOps Boards (only after Story Set Approval)**: follow user-stories.md
   Steps 24–28
7. **MANDATORY**: Log the user's raw response in runtime-artifacts/audit.md

> **Next**: Proceed immediately to **Dependency Graph** stage to map dependencies between all stories.

## Dependency Graph (ALWAYS EXECUTE — immediately after User Stories)

**Purpose**: Analyse story dependencies. Each story gets a `requires` list; stories whose
prerequisites are all Done can be implemented in parallel. Produces `spec/plans/dependency-graph.yml`
and stamps `Requires` onto every story in the Story Tracker and `stories.md`.

**This stage is also the single commit point for `stories.md`, `personas.md` AND
`dependency-graph.yml`** — User Stories generates/pushes-to-tracker but does NOT commit; all three are
committed and pushed to the Epic branch together here, once, before Workflow Planning starts.

**Execution**:
1. **MANDATORY**: Log start of Dependency Graph stage in runtime-artifacts/audit.md
2. Load and execute all steps from `planning/dependency-graph-generation.md` — it defines the steps
   (reuse the recorded `team_size` — never re-ask it; shape waves and per-developer lanes for it), the
   TRUE-PARALLELISM RULES for computing `requires` — including R6 Conflict-Free Independence
   (HARD, enforced at planning, at the STOP CHECKPOINT and before every story commit/PR) — the
   `dependency-graph.yml` schema and the Story Tracker table format (canonical
   columns: Requires, Tracker ID, Status, PR, Merged, Start, End, Recorded). **`requires` is INFERRED,
   never asked**
3. **AUTOMATIC — no gate**: announce the graph + ready-stories summary and PROCEED (enforced later by
   the Doability Gate and branch-cut merge check); a user correction is an interrupt. **MANDATORY**:
   log the graph, inferred edges and any correction
4. **MANDATORY — Epic Branch Commit & Push** (`planning/dependency-graph-generation.md` Step 9,
   automatic, no gate): commit `spec/plans/stories.md`, `spec/plans/personas.md`,
   `spec/plans/dependency-graph.yml`, `runtime-artifacts/aire-state.md` and
   `runtime-artifacts/audit.md` on the Epic branch (`AIRE-Version: [N]` trailer) and push to origin.
   No PR is raised here. Log the commit hash and push confirmation. If push fails, tell the user to
   push manually before proceeding.

---

## MANDATORY: Tracker Sync Rule (applies everywhere a story status changes)

Statuses and who moves each: `common/status-model.md`. Mechanics: `common/tracker-sync.md` Section 4.
Stories: ToDo → In Progress → Ready for Testing → In Testing → Bug fixing → Closed. Bugs: New →
Active → In-Revision → Resolved → Closed. Whenever a status changes:

- Move the ADO work item too, confirm-first
  (`Story 1.2 has Tracker ID 4821. Move to "[target status]"? (yes/skip)`). Yes: move, verify,
  log. Skip: local Story Tracker only, note it.
- **EXCEPTION — the claim is automatic**: picking a story (`dev-implement`) moves it to In Progress, and
  starting a bug moves it to Active — both sides, without asking, verified, announced.
- **Manual on the board — AIRE never makes these moves**: Ready for Testing (after the PR's two
  approvals, merge into the development branch and the DEV deploy) and a bug's Resolved. AIRE reads
  them live. In Testing too, unless the Verification Engineer names the story in `ve-list-work` Option A.

**Epic Status Sync** (skip silently when `Parent Epic: none`): first story claimed →
Epic In Progress (automatic, verified, logged); every story Closed → Epic Closed (confirm-first).

**Story↔Parent-Epic links** (User Stories Part 3) are automatic, not confirm-first — Story Set Approval
already gave explicit approval — but still verified.

**NEVER** silently update only one side. The local Story Tracker and the board must stay in sync.

---

## MANDATORY: Atlas Artifact Sync (opt-in)
Asked once after the cycle branch is created (`common/atlas-artifact-sync.md`). While `Enabled: Yes`,
run its Section 5 pass before every commit, in every workflow, agent and skill. Never blocks.

---

## Workflow Planning (ALWAYS EXECUTE)

1. **MANDATORY**: Log user input this phase in runtime-artifacts/audit.md
2. Load all steps from `planning/workflow-planning.md` and the content validation rules from
   `common/content-validation.md`; load all prior context (RE artifacts if brownfield, intent analysis,
   requirements if executed, user stories)
3. Execute: determine which phases run and at what depth, create the multi-package change sequence (if
   brownfield), generate the workflow visualization. **MANDATORY**: validate all content (Mermaid
   syntax included) before file creation, per content-validation.md
4. **AUTOMATIC — no gate**: present the plan per workflow-planning.md Step 9 (stages can be
   added/removed any time) and proceed; each selected stage keeps its own approval
5. **MANDATORY**: Log the finalized plan and any user change in runtime-artifacts/audit.md

## Application Design (CONDITIONAL)

**Execute IF**: new components/services needed · component methods or business rules need definition
· service layer design required · component dependencies need clarification

**Skip IF**: changes within existing component boundaries · no new components or methods · pure
implementation changes

**Execution**:
1. **MANDATORY**: Log user input this phase in runtime-artifacts/audit.md
2. Load all steps from `planning/application-design.md` and the RE artifacts (if brownfield); execute
   at the appropriate depth (minimal/standard/comprehensive)
3. **Wait for Explicit Approval**: present the detailed completion message (format in
   application-design.md) — DO NOT PROCEED until the user confirms. **MANDATORY**: log their raw response

## Transition to IMPLEMENTATION PHASE

After Application Design is approved (or Workflow Planning when it's skipped), proceed directly to the
IMPLEMENTATION PHASE. Its design stages run once at system level, scoped to the **intake
brief** at `spec/plans/epic-brief.md` (written from the ADO Epic, or from the user's
requirements/natural-language description). Log the transition.

---

# IMPLEMENTATION PHASE

**Purpose**: Detailed design, NFR implementation and code generation. **Focus**: HOW to build it.

**Stages**:

1. **System-Level DESIGN Stages** (single pass, scoped to the intake brief; no code generated here)
   — Functional Design · NFR Requirements · NFR Design · Infrastructure Design (each CONDITIONAL).
2. **`architecture.md`** (ALWAYS — at the STOP CHECKPOINT, automatic, no gate): the design stages
   consolidate into `spec/plans/architecture.md`.
3. **Test Plans** (ALWAYS — at the STOP CHECKPOINT, Step 1.2, published for review):
   `implementation/test-plans-checkpoint.md`. EVERY story gets its manual test plan
   (`test-plans/<cycle>/<TICKET-ID>-<title>/`, via the `ve-implement` skill in WORKFLOW MODE) **before any
   code is generated**. The implement workflows then READ them — never author them.
4. **MANDATORY STOP** — the workflow HALTS and waits. Code Generation NEVER starts on its own.
5. **Development Handoff** — announce the ready stories; the user drives each one with `dev-implement`.
6. **Code Generation** (per-story, via `dev-implement` only) — `workflows/dev-implement.md`:
   Doability Gate (never merges a PR), story branch from the base branch, baselines, plan, code into
   `src/`, then the checks of `implementation/code-generation.md` Steps 11a–11d (unit tests ≥ 90% on
   changed lines, API contract tests in `tests/api/`, test placement, full regression, static evals, J1/J2
   judge score checkpoint, eval scorecard), automated Code Review with the Security Baseline review,
   each self-healing loop capped at 3, then
   commit, PR and auto PR review. The only user inputs are the story and the PR's target branch; the
   story stays `In Progress` until the developer moves it on the board after the DEV deploy.
7. **Code Review & Remediate** — `workflows/code-review.md` and `workflows/remediate.md`: ACs,
   requirements and the diff-scoped Security Baseline review. Automatic inside every implement
   workflow; also invokable standalone, confirm-first.

**Test plans are AUTHORED here** (Step 1.2, every story, before code) and EXECUTED by the
Verification Engineer per story once it is In Testing, closed or sent to Bug fixing with `ve-list-work`.

---

## System-Level DESIGN Stages (Single Pass)

**These DESIGN stages execute in sequence, ONCE for the whole system, scoped to the intake brief
captured at workflow start. Code Generation is NOT part of them** — it happens later, per-story, via
`dev-implement`, after the STOP CHECKPOINT.

**Primary inputs for EVERY design stage**: `epic-brief.md` (defines WHAT to build) · `requirements.md`
· `stories.md` + `## Story Tracker` · Application Design artifacts if that stage ran · Atlas
existing-system truth when the Helix MCP is bound — on brownfield the existing architecture is the
starting state, and the design records the delta from it.

### The stages

| Stage | Rule file | Execute IF | Skip IF |
|---|---|---|---|
| **Functional Design** | `implementation/functional-design.md` | New data models/schemas · complex business logic · business rules need detailed design | Simple logic changes · no new business logic |
| **NFR Requirements** | `implementation/nfr-requirements.md` | Performance/security/scalability considerations · tech stack selection required | No NFR requirements · stack determined |
| **NFR Design** | `implementation/nfr-design.md` | NFR Requirements executed · patterns to incorporate | No NFR requirements · NFR Requirements skipped |
| **Infrastructure Design** | `implementation/infrastructure-design.md` | Infra services need mapping · deployment/cloud resources required | No infra changes · already defined |

### Execution pattern — IDENTICAL for all four stages

1. **MANDATORY**: Log user input this stage in runtime-artifacts/audit.md
2. Load all steps from the stage's rule file (table above) and execute it for the whole system
3. **MANDATORY**: Present the standardized 2-option completion message from that stage's rule
   file — DO NOT invent a 3-option menu or other navigation pattern
4. **Wait for Explicit Approval**: the user chooses "Request Changes" or "Continue to Next Stage" —
   DO NOT PROCEED until they confirm. **MANDATORY**: log their raw response

> **End of the System-Level DESIGN stages.** Once completed (or skipped), DO NOT generate code.
> Proceed to the mandatory STOP CHECKPOINT below.

---

## MANDATORY STOP — After Infrastructure Design, Before Code Generation

**This is a hard halt.** After design stages complete (Infrastructure Design done or skipped), the
workflow MUST stop and wait. Code Generation MUST NOT start automatically. Present the Development
Handoff below, then block until the user invokes `dev-implement`.

1. **MANDATORY**: Log reaching the stop CHECKPOINT.
1.0. **WRITE `spec/plans/package-dependencies.md`** (ONE approval gate) per
   `implementation/package-dependencies-doc.md` — exact versions looked up live; code installs only these.
1.1. **WRITE `spec/plans/architecture.md`** (MANDATORY, automatic, no gate) per
   `implementation/architecture-doc.md` — **assembled from the approved design artifacts and Atlas
   truth, never authored fresh**; a skipped stage says so explicitly rather than being filled with an
   invented decision. Before the design commit, assert both ALWAYS inline Mermaid diagrams
   (System Context + Component Architecture, plus an `erDiagram` when a store/schema changed) are
   present and valid per `common/content-validation.md`; missing/unparseable → fix before committing.
   Version it and log it. Then run the R6 re-check on the real file layout (architecture-doc.md
   Section 5).
1.2. **WRITE AND PUBLISH EVERY STORY'S MANUAL TEST PLAN** (MANDATORY, automatic) per
   `implementation/test-plans-checkpoint.md` — the LAST design artifacts, written before any code
   exists (UI/UX mockups first, when that extension is enabled). For every story in the
   `## Story Tracker` (bug/enhancement cycles: the single ticket), write
   `test-plans/<cycle>/<TICKET-ID>-<title>/` by invoking the `ve-implement` skill in WORKFLOW MODE.
   Run the blocking coverage check (every AC has ≥ 1 test case), push `test-plans/<cycle>`, raise
   the `[TEST]` PR (`common/branching-strategy.md` Section 7.2) and print its Verification Engineer
   message — review in the PR, changes via `ve-list-work` Option C. Asks nothing. Scope derivation,
   NOT sign-off — the Verification Engineer signs off each story with `ve-list-work`.
2. Mark in `runtime-artifacts/aire-state.md`: `Design complete — awaiting dev-implement`.
3. **Commit + push the design artifacts on the Epic branch (automatic)**: stage `spec/**`
   (`architecture.md`, UI/UX mockups when generated), `runtime-artifacts/aire-state.md`,
   `runtime-artifacts/audit.md`. Commit with an `AIRE-Version: [N]` trailer and push.
   If a push fails, tell the user to push manually — **the Verification Engineer cannot start until
   both this and the `[TEST]` PR are on origin**.
4. Present the Development Handoff message (below).
5. **HALT.** Do not proceed to Code Generation or any later stage until the user types `dev-implement`

## Development Handoff — Use `dev-implement` to Build Each Story

At Step 4 above, load `common/development-handoff.md` and emit its message **verbatim and nothing
else** (no notes or caveats around it) — that file carries the template and substitution rules. Never ship an unsubstituted placeholder. Log the handoff,
then HALT.

---

# KEYWORD WORKFLOWS

**On any keyword below, read `workflows/<file>` and follow it exactly.** CLAUDE.md routes only.

| Keyword | When | File |
|---|---|---|
| `dev-implement` | Build one story — the only way code generation starts | `dev-implement.md` |
| `ticket-implement <TICKET-ID>` | An existing ticket — bug OR enhancement | `ticket-implement.md` |
| `epic-enhancement <TICKET-ID \| description>` | Epic cycle open; **behaviour** changed | `epic-enhancement.md` |
| `epic-bugfix <TICKET-ID \| description>` | Epic cycle open; **a defect** in what the epic built | `epic-bugfix.md` |
| `epic-change-request <TICKET-ID>` | Epic cycle open; **a requirement** changed — versions `requirements.md`, one staged gate | `epic-change-request.md` |
| `pr-fix [PR-NUMBER]` | A rejected `[STORY]`/`[BUG]`/`[ENH]` PR — fixed from its comments, same PR updated | `pr-fix.md` |
| `code-review` | Review one story or all stories — REVIEWER, read-only | `code-review.md` |
| `remediate` | Fix what a review report found — DEV, code-editing | `remediate.md` |

- The three mid-epic workflows each deliver the change as one `[STORY]` PR into the base branch,
  updating affected earlier stories' test plans and unit tests.
- **`code-review` / `remediate`** also run automatically inside every implement workflow. **NEVER
  auto-run them standalone** — after a story's PR is raised, *suggest* both. Log every response.

---

## Key Principles

- **Adaptive Execution** — run only the stages that add value; complex changes get full treatment,
  simple changes stay efficient.
- **Transparent Planning** — always show the execution plan first; the user may add or remove stages
  any time.
- **Progress Tracking** — record executed and skipped stages in `runtime-artifacts/aire-state.md`.
- **Complete Audit Trail** — every interaction logged with complete raw input, not just approvals.
- **Content Validation** — validate all content before file creation (`common/content-validation.md`).
- **Bounded Self-Healing** — every automatic fix loop is capped at 3 attempts; on exhaustion the
  run HALTS with the Self-Heal Limit message (`common/self-heal-limit-guidance.md`) for a manual fix.
  A failing gate is never skipped, weakened, left unrun or carried forward into a commit.
- **NO EMERGENT BEHAVIOR** — Implementation-phase design stages MUST use the standardized
  2-option completion message from their own rule file. Never invent a 3-option menu or other pattern.

## MANDATORY: Plan-Level Checkbox Enforcement

**NEVER complete work without updating the plan checkboxes.** Immediately after finishing ANY step in
a plan file, mark it `[x]` — in the SAME interaction where the work completed. No exceptions. Two
levels: plan-level tracks progress within a stage, stage-level tracks overall progress in
`runtime-artifacts/aire-state.md`; both update in the same interaction as the work.

## Prompts Logging Requirements
Same non-negotiables as the Audit Trail section above, applied to EVERY user input and AI response.
Implementation-flow entries also add `**TRACKER ITEM**:`, `**Epic Link**:` and `**AIRE VERSION**:`;
self-healing entries add `**SH-LOOP**:`, `**Root cause**:` and `**Verification**:`.

## Directory Structure

**CRITICAL RULE — five roots, nothing outside them**:
- **`src/`** — ALL application code, greenfield AND brownfield. If a brownfield repo keeps code
  elsewhere, record that root ONCE as `## Code Root` in `runtime-artifacts/aire-state.md` and treat it
  as `src/`. Never a second code location; never mass-move an existing tree.
- **`tests/`** — `unit/`, `api/` (each mirroring `src/`); `e2e/` only via `/novus-automate`
- **`spec/`** — specs/docs ONLY, never a source file. Subfolders: `plans/` — flat
  planning/design docs (`architecture.md`, `atlas-deep-dive.md` + the flat RE docs, `requirements.md`,
  `stories.md`, `personas.md`, `epic-brief.md`, `dependency-graph.yml`, the design docs, and
  **`delta/<CYCLE-ID>-<slug>/`** written at cycle close by `archive-epic`); `spec-generation/` —
  the `*-generation.md` plan/question files. Plus human-authored `context-project/` (`existing-knowledge/`,
  `new-references/`, read only at a user-supplied path; `coding-guidelines/`, read whole for all
  generated code).
  **`spec/` is cycle-scoped**: `archive-epic` snapshots the whole tree into
  `aire-archives/<type>/<ID>-<slug>/` and removes it in full, `context-project/` included; after
  the cycle PR merges, `stitch-delta` reads that delta out of the archive and refreshes the whole
  Atlas deep dive against the merged code. Base carries no `spec/` between cycles.
- **`test-plans/`** — the manual test plans (STOP CHECKPOINT Step 1.2): one folder per cycle on the
  base branch, never archived, so parallel epics never conflict (`common/branching-strategy.md` Section 7).
- **`reports/`** — OUTPUTS ONLY: `unit-test-evidence/`, `api-contract-test-evidence/`, `eval-evidence/`,
  `reviews/`, `code-security-reviews/`, `ticket-summary/`, `pr-feedback/`, `hooks-log/` (hook-written).
- Structure inside `src/`: see `implementation/code-generation.md` for patterns by project type

**Full canonical layout**: `common/directory-structure.md` — load on demand to place an artifact whose
path isn't already fixed by the rule file you're following.
<!-- aire-annexus:END -->
