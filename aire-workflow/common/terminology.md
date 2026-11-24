# aire Terminology Glossary

## Core Terminology

### Phase vs Stage

**Phase**: One of the two high-level lifecycle phases in aire
- **PLANNING PHASE** - Planning & Architecture (WHAT and WHY)
- **IMPLEMENTATION PHASE** - Design, Implementation & Test (HOW)

**Stage**: An individual workflow activity within a phase
- Examples: Context Assessment stage, Requirements Assessment stage, Code Generation stage
- Each stage has specific prerequisites, steps, and outputs
- Stages can be ALWAYS-EXECUTE or CONDITIONAL

**Usage Examples**:
- "The IMPLEMENTATION phase contains 7 stages"
- "The Code Generation stage is always executed"
- "We're in the PLANNING phase, executing the Requirements Assessment stage"
- "The Requirements Assessment phase" (should be "stage")
- "The IMPLEMENTATION stage" (should be "phase")

## Two-Phase Lifecycle

### PLANNING PHASE
**Purpose**: Planning and architectural decisions  
**Focus**: Determine WHAT to build and WHY  
**Location**: `planning/` directory

**Stages**:
- Workspace Detection (ALWAYS)
- Reverse Engineering (CONDITIONAL - Brownfield only)
- Requirements Analysis (ALWAYS - Adaptive depth)
- User Stories (ALWAYS - no team-size or creation-mode question; the generated story set requires explicit human approval — the Story Set Approval — before it pushes to Azure DevOps Boards)
- Dependency Graph (ALWAYS - assigns `requires`; right after User Stories)
- Workflow Planning (ALWAYS)
- Application Design (CONDITIONAL)

**Outputs**: Requirements, user stories, Story Tracker, dependency-graph.yml (requires), architectural decisions

### IMPLEMENTATION PHASE
**Purpose**: Detailed design and implementation  
**Focus**: Determine HOW to build it  
**Location**: `implementation/` directory

**Stages**:
- Functional Design (CONDITIONAL, system-level)
- NFR Requirements (CONDITIONAL, system-level)
- NFR Design (CONDITIONAL, system-level)
- Infrastructure Design (CONDITIONAL, system-level)
- STOP CHECKPOINT (MANDATORY — after design, before Code Generation)
- Code Generation (ALWAYS, per-story) — triggered by `dev-implement`; Story Selection (local Story Tracker or the ADO board) → story branch cut from the Base Branch → Part 1: Planning (announced, not gated) → Part 2: Generation → unit tests to 90% coverage on changed lines → full regression. No approval gates
- Code Review (AUTOMATIC after every code generation, and standalone via `code-review`; read-only versioned report)
- Remediate (AUTOMATIC whenever the review reports findings — fixes them and loops back through review until clean; also standalone via `remediate`; fix → unit test → green, story-scoped unit tests only)

**Outputs**: Design artifacts, NFR implementations, code, unit tests

**In this phase, at the STOP CHECKPOINT**: Test Plans — every story's manual test plan, in its folder under `test-plans/` (`common/branching-strategy.md` Section 7.1), is written and published for review before any code is generated (`implementation/test-plans-checkpoint.md`).

**Not in this phase**: test-plan SIGN-OFF — that belongs to the ve track below, not to Implementation (neither at epic nor at story level).

### ve TRACK (parallel — not a phase)
**Purpose**: Prove each story meets its acceptance criteria
**Focus**: Determine WHETHER it works
**Location**: on the Base Branch — `test-plans/<cycle>/<TICKET-ID>-<title>/` on an epic (one folder per story), `test-plans/<TICKET-ID>-<title>/` on a bug or enhancement (`common/branching-strategy.md` Section 7.1)

**Stages** (both ve-initiated, never auto-run):
- Test Plan (per story, via `/ve-implement`) — manual test steps for every applicable test plan, derived from the story's acceptance criteria; never reads application source code. The framework already generated every story's plan at the STOP CHECKPOINT, by invoking this same skill in WORKFLOW MODE, so a standalone run refreshes or extends an existing plan
- Verification Engineer Sign-off (via `ve-list-work`, on the epic branch) — lists stories and bugs by live status; closes a tested story (`In Testing → Closed`) or sends it to `Bug fixing`, and closes or reopens retested bugs (`common/status-model.md`)

**Optional tooling** (opt-in, never a stage, never sign-off): `/novus-automate` reads a story's approved manual test plan and generates Novus automated tests under `tests/e2e/` (`extensions/testing/novus-automation/novus-automation.md`).

**Outputs**: Per-story manual test plans and AC→test-case coverage matrices

---

## Workflow Stages

### Always-Execute Stages
- **Workspace Detection**: Initial analysis of workspace state and project type
- **Requirements Analysis**: Gathering requirements (depth varies based on complexity)
- **User Stories**: Creating user stories and personas in a single pass; populates the Story Tracker; the generated story set is gated by the Story Set Approval (mandatory human approval) before it pushes to Azure DevOps Boards
- **Dependency Graph**: Mapping each story's `requires` dependencies so independent stories can run in parallel; writes `dependency-graph.yml`
- **Workflow Planning**: Creating execution plan for which phases to run
- **Test Plans**: At the STOP CHECKPOINT, for every story and under ONE approval gate — in the story's folder under `test-plans/`, written before any code, published to the Base Branch in the cycle's `[TEST]` PR, and thereafter read, never rewritten
- **Code Generation**: Per-story, triggered by `dev-implement` — Story Selection → story branch → Part 1 (Planning) → Part 2 (Generation) → unit tests to 90% coverage on changed lines → full regression

### ve-Initiated Stages (parallel track — never auto-run)
- **Test Plan**: authored for every story at the STOP CHECKPOINT and, standalone, per story via `/ve-implement` — manual test steps generated from the story's acceptance criteria into the story's folder under `test-plans/`; reads no application code
- **Verification Engineer Sign-off**: Via `ve-list-work` on the epic branch — tested stories `In Testing → Closed` or `Bug fixing`; retested bugs `Resolved → Closed` or `Active`

### Conditional Stages
- **Reverse Engineering**: Analyzing existing codebase (brownfield projects only)
- **Application Design**: Designing application components, methods, business rules, and services
- **Functional Design**: Technology-agnostic business logic design (system-level)
- **NFR Requirements**: Determining NFRs and selecting tech stack (system-level)
- **NFR Design**: Incorporating NFR patterns and logical components (system-level)
- **Infrastructure Design**: Mapping to actual infrastructure services (system-level)

### Automatic-in-Workflow Stages (also invokable standalone)
- **Code Review** (`code-review`): Read-only review of a story's code, or all stories together; produces a versioned report. Auto-runs after every code generation, where its verdict routes the run
- **Remediate** (`remediate`): Fixes issues from a review report (fix → unit test → green, running only the in-scope story's unit tests); annotates the report in place. Auto-runs on any review finding, looping with the review until the verdict is clean. Standalone runs stay confirm-first

## Application Design Terms

- **Component**: A functional system with specific responsibilities
- **Method**: A function or operation within a component with defined business rules
- **Business Rule**: Logic that governs method behavior and validation
- **Service**: Orchestration layer that coordinates business logic across components
- **Component Dependency**: Relationship and communication pattern between components

## Architecture Terms (Infrastructure)

### Service
An independently deployable component in a microservices architecture. Each service is separately deployable.

**Usage**: "The Payment Service handles all payment processing"

### Module
A logical grouping of functionality within a single service or monolith. Modules are not independently deployable.

**Usage**: "The authentication module within the User Service"

### Component
A reusable building block within a service or module. Components are classes, functions, or packages that provide specific functionality.

**Usage**: "The EmailValidator component validates email addresses"

## Development & Tracking Terms

### Story Tracker
A table in `runtime-artifacts/aire-state.md` (section `## Story Tracker`) with one row per user story: Story ID, Title, Requires, Tracker ID, Status, PR, Merged, Start, End, Recorded. It is the local record of story and bug status, kept in sync with the ADO board. The ONLY valid statuses are the canonical ones in `common/status-model.md` Section 1 — see Story statuses below. The `PR` column stores the PR URL (set when the PR is raised) and `Merged` is `no`/`yes` (merged into the Base Branch). Rows are created in User Stories, `Requires` filled by Dependency Graph; `dev-implement` claims a story (`ToDo → In Progress`), and moves made on the board are brought in by the live read (`common/status-model.md` Section 6). Code Review and Remediate do not change status.

### Tracker
The issue tracker aire uses — Azure DevOps (ADO) Boards, through the `az boards` CLI. Its organization and project are resolved ONCE, at workflow start (ADO Project Resolution, `common/tracker-sync.md` Section 1), and recorded in `## Tracker` in `runtime-artifacts/aire-state.md` (Parent Epic, Epic URL, Organization, Project, `### Status Map`). Every tracker-facing mechanic in the framework (work item creation, status transitions, assignment, epic linking, causation links, comments) follows `common/tracker-sync.md`, the single source of truth for the actual ADO commands.

### Tracker ID
The identifier a story or ticket has on the board: an ADO work item ID (e.g. `4821`). Stored in the Story Tracker's `Tracker ID` column and in `dependency-graph.yml`'s `tracker_id:` field.

### Ready Story
A story whose `requires` prerequisites ALL have their PRs merged into the Base Branch (or that has none) — merge state, never status (`common/tracker-sync.md` Section 4.1). Ready stories have no dependencies on each other's in-progress work and can be implemented in parallel by different developers. Determined from the Dependency Graph at selection time (the Doability Gate).

### Dependency Graph
The Planning stage (run right after User Stories) that computes each story's `requires` dependencies. Outputs `spec/plans/dependency-graph.yml` and a `## Dependency Graph` section (Mermaid + ready-stories summary) in `runtime-artifacts/aire-state.md`.

### Parent Epic
The existing ADO Epic work item the user provides at workflow start (e.g., "using aire annexus implement" + an Epic link whose description defines what to build). At capture time its summary/description/acceptance criteria are fetched into `spec/plans/epic-brief.md` (primary input to Requirements Analysis and User Stories), and its ID/URL/Organization/Project are recorded in `runtime-artifacts/aire-state.md` under `## Tracker` so any session — including a new chat resuming at the story stage — can find it. Every story pushed to Azure DevOps Boards during User Stories Part 3 is linked to this Parent Epic (unless the user chose `none` at push time). aire never creates Epics itself;

### `dev-implement` (keyword)
The keyword a developer types to build a single story. It triggers per-story Code Generation: docs worktree opened (`.aire-docs/`) → Story Selection (moves the story `ToDo` → `In Progress`) → Doability Gate (every `requires` PR merged into the Base Branch) → story branch cut from the Base Branch (`common/branching-strategy.md`) → code generation → unit tests generated + run to 90% coverage on changed lines → API contract tests (when an endpoint changes) → test placement → full regression → static evals (D1–D7) → J1/J2 judge score checkpoint → eval scorecard (`reports/eval-evidence/`) → automated Code Review (with the diff-scoped security review), whose verdict routes the run automatically (findings are auto-remediated and re-reviewed until clean — no approval is requested) → `[STORY]` PR raised into the Base Branch. Raising the PR does NOT move the story — it stays `In Progress` (with the `PR` URL recorded and `Merged=no`) through the two approvals, the merge and the DEV deploy. The developer then moves it to `Ready for Testing` on the board; `dev-implement` never moves a story past `In Progress`. See `workflows/dev-implement.md` and `common/status-model.md`.

### `team_size`
The number of developers in the pod, asked once in User Stories Step 1 (skipped on resume). Drives story granularity so ≥ `team_size` independent stories are workable in parallel at any time, and the Dependency Graph's waves and per-developer lanes. Written to `runtime-artifacts/aire-state.md` by User Stories Part 1 and reused as-is by the Dependency Graph stage and the mid-epic workflows. If the user changes it later, record it and re-shape the waves and lanes.

### Base Branch (development branch)
The branch the workflow started on, recorded in `## Branching` — the team's development branch, whose CI/CD deploys to DEV. Story, bug and enhancement PRs merge into it (two approvals, enforced by its branch policy — AIRE never approves or merges). See `common/branching-strategy.md`.

### Epic branch (docs branch) and docs worktree
The epic branch carries only the cycle's documents (`spec/`, `runtime-artifacts/`, `reports/`), never code. During a story run it is checked out beside the code at `.aire-docs/` — a local git worktree, excluded through `.git/info/exclude` — and every `spec/`, `runtime-artifacts/` and `reports/` path then means the same path under `.aire-docs/`. See `common/branching-strategy.md` Section 4.

### Test Plan Folder and `[TEST]` PR
The manual test plans are the one document on the Base Branch: `test-plans/<cycle>/`, one folder per cycle, recorded in `## Branching`. A cycle writes only inside its own folder, so epics running in parallel from the same Base Branch never conflict. An epic cycle publishes its plans — and every later change to them — through its `[TEST]` PR into the Base Branch, opened beside the code as the `.aire-test-plans/` worktree; a bug or enhancement cycle's plan rides its `[BUG]`/`[ENH]` PR. Test plans are never archived or removed. See `common/branching-strategy.md` Section 7.

### Manual on the board
A status move a person makes in the tracker's own UI and AIRE never makes: a story to `Ready for Testing` (developer, after the DEV deploy), a story from `Bug fixing` back to `Ready for Testing`, and a bug to `Resolved`. AIRE reads these live. A story's move to `In Testing` is made on the board too, or by `ve-list-work` Option A for the stories the Verification Engineer names. See `common/status-model.md` Section 7.

### R6 — Conflict-Free Independence
The HARD rule that two stories with no `requires` path between them never create, modify, delete or rename the same file, so their PRs can never conflict. Each story declares its paths in a `**Touches**:` line. Enforced when the stories are generated, by the Dependency Graph stage, at the STOP CHECKPOINT, and by the build-time check before every story commit and PR. See `planning/dependency-graph-generation.md`.

## Novus Automation Terms (opt-in — `extensions/testing/novus-automation/`)

### Automation Branch and Automation Worktree
`automation/<TICKET-ID>-<title>` — one branch per story, cut from the Base Branch, written only by `/novus-automate` and only under `tests/e2e/`. It is checked out beside the developer's own tree as the `.aire-automation/` worktree, excluded through `.git/info/exclude`. See `common/branching-strategy.md` Section 8.

### `[AUTO]` PR
The PR that carries a story's generated Novus tests into the Base Branch. Raised only after the story's own code PR has merged — by a run, or by `/novus-automate <TICKET-ID> --publish`.

### Automation Summary and Run Log
`tests/e2e/automation/<TICKET-ID>.md` accounts for every case in the story's in-scope plan files (state, reason, test method). `tests/e2e/automation/<TICKET-ID>.runs.md` gets one appended row per run. Both are committed with the tests.

### Local mode / Env mode
Local mode: every target host is loopback, so the board check is skipped and the run is never Verification Engineer sign-off. Env mode: any other host — it must be on the Allowed Hosts list, and the story must be in a status after deploy.

### Allowed Hosts
`aut.allowedHosts` in `tests/e2e/src/test/resources/application-test.properties`, always read from the Base Branch. Adding a host takes a reviewed, merged PR. Production hosts are never listed.

### Novus pin
The one Novus commit the AIRE syntax reference was written against, installed locally as version `1.0.0-aire-<sha7>` and recorded in each project's `tests/e2e/pom.xml`.

## Terminology Guidelines

### When to Use Each Term

**Service**:
- When referring to independently deployable components
- In microservices architecture contexts
- In deployment and infrastructure discussions
- Example: "The Order Service will be deployed to ECS"

**Module**:
- When referring to logical groupings within a service
- In monolith architecture contexts
- When discussing internal organization
- Example: "The reporting module generates all reports"

**Component**:
- When referring to specific classes, functions, or packages
- In design and implementation discussions
- When discussing reusable building blocks
- Example: "The DatabaseConnection component manages connections"

## Stage Terminology

### Planning vs Generation
- **Planning**: Creating a plan with questions and checkboxes for execution
- **Generation**: Executing the plan to create artifacts

Examples (these are internal sub-steps within a single stage, not separate stages):
- Story Planning → Story Generation (within User Stories stage)
- NFR Planning → NFR Generation (within NFR Requirements stage)
- Code Generation Part 1 (Planning) → Code Generation Part 2 (Generation)

### Depth Levels
- **Minimal**: Quick, focused execution for simple changes
- **Standard**: Normal depth with standard artifacts for typical projects
- **Comprehensive**: Full depth with all artifacts for complex/high-risk projects

## Artifact Types

### Plans
Documents with checkboxes and questions that guide execution.
- Located in `spec/spec-generation/`
- Examples: `story-generation.md`, `functional-design-generation.md`

### Artifacts
Generated outputs from executing plans.
- Located in various `spec/` subdirectories
- Examples: `requirements.md`, `stories.md`, `design.md`

### State Files
Files tracking workflow progress and status.
- `runtime-artifacts/aire-state.md`: Overall workflow state
- `runtime-artifacts/audit.md`: Complete audit trail of all interactions

## Common Abbreviations

- **NFR**: Non-Functional Requirements
- **API**: Application Programming Interface
- **CDK**: Cloud Development Kit (AWS)
- **OWASP**: Open Worldwide Application Security Project
- **SH-LOOP**: Self-Healing Loop (the 3-attempt repair budget per gate type)

## Story statuses
The only Story Tracker statuses are the canonical ones in `common/status-model.md` Section 1 — stories ToDo, In Progress, Ready for Testing, In Testing, Bug fixing, Closed; bugs New, Active, In-Revision, Resolved, Closed — written as plain text in state files, tracker comments and every message (no emojis). The tracker's own names for them are recorded in `## Tracker` → `### Status Map`. A state file may still carry a symbol before the status; readers treat it as the same status and writers rewrite it in plain text the next time they update that row.
