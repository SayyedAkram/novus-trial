# Directory Structure

**Purpose**: the canonical layout of an AIRE workspace — where application code goes, where specs go,
where documentation goes, and where every stage/skill writes its artifacts.

**Load this file when**: creating any file or folder whose location isn't already fixed by the rule
file you are following, or when you need to locate an existing artifact by convention.

---

## The five roots

An AIRE workspace has exactly five top-level roots for the artifacts AIRE owns, plus
`runtime-artifacts/` for session state. Everything AIRE writes goes into one of them. Nothing AIRE
writes goes anywhere else.

| Root         | Holds                                                                                                                                    | Rule                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/`     | **ALL application source code**| Greenfield AND brownfield. Never code outside it.          |
| `tests/`   | All test code: `tests/unit/` and `tests/api/`, each mirroring `src/`, plus `tests/e2e/` (Novus E2E tests, rule 4d) | Unit tests and API contract tests, plus the opt-in Novus module, at the repository root. |
| `spec/`    | The specs and docs AIRE writes — `plans/`, `spec-generation/`, `context-project/` | The agent's source of truth for WHAT to build.             |
| `test-plans/` | The manual test plans — one folder per cycle, one sub-folder per story (`common/branching-strategy.md` Section 7) | The only document kept on the Base Branch; a cycle writes only its own folder. |
| `reports/` | **Generated OUTPUTS** — unit test, API contract test and eval evidence, review reports (`reviews/`, `code-security-reviews/`), pr-fix feedback, per-story code summaries (`ticket-summary/`) and the hook log (`hooks-log/`) | Generated proof/findings/summaries only; never a spec.     |

Session state lives in `runtime-artifacts/`: the cycle's `audit.md` (audit trail), `aire-state.md`
(session/state) and the per-story fragments, alongside root-level tool caches (`.mypy_cache`,
`.ruff_cache`). It is recreated fresh each cycle.

---

## Full layout

```text
<WORKSPACE-ROOT>/
│
├── src/                                  #    ALL APPLICATION CODE — greenfield and brownfield
│   └── [stack-idiomatic structure]       #    layout per code-generation.md; NEVER outside src/
│
├── tests/                                 #   ALL TEST CODE — never under spec/
│   ├── unit/                              #    ALL unit tests — MIRRORS src/ layout. HARD RULE:
│   │   │                                 #    every unit test (incl. UI/component tests — RTL, jsdom,
│   │   │                                 #    Enzyme, etc.) lives here, never in a sibling top-level
│   │   │                                 #    folder like tests/components/. Grouped/baseline suites
│   │   │                                 #    that cover several src/ modules together still nest
│   │   │                                 #    under the mirrored path of the area they cover (e.g. a
│   │   │                                 #    components baseline suite → tests/unit/components/) —
│   │   │                                 #    "mirrors src/" governs the PARENT path, it does not
│   │   │                                 #    require one file per source file.
│   │   └── <mirror-of-src>/               #    e.g. src/auth/login.ts → tests/unit/auth/login.test.ts
│   │                                     #    one test module per src module (jest / pytest /
│   │                                     #    go test / JUnit); feeds the unit test evidence
│   ├── api/                               #    API contract tests (code-generation.md Step 11a.5) —
│   │   └── <mirror-of-src>/               #    MIRRORS src/, e.g. src/orders/orders.controller.ts →
│   │                                     #    tests/api/orders/orders.api.test.ts; only for stories
│   │                                     #    that add or change an endpoint
│   └── e2e/                               #    OPT-IN Novus E2E module (rule 4d) — a standalone Maven
│       ├── pom.xml                        #    module, never part of a root build. Written ONLY by
│       ├── suites/<TICKET-ID>.xml         #    /novus-automate on an automation/ branch
│       ├── automation/<TICKET-ID>.md      #    (branching-strategy.md Section 8): per-story summary
│       │                                 #    + <TICKET-ID>.runs.md run log, committed with the tests
│       └── src/                           #    per-story t<TICKET-ID>/ packages
│                                         #    (extensions/testing/novus-automation/)
│
├── spec/                                #   SPECS + DOCUMENTATION — never code
│   ├── plans/                            #    ALL planning + design DOCS, as FLAT files:
│   │   ├── architecture.md               #     ONCE per cycle — system design + inline Mermaid diagrams
│   │   ├── package-dependencies.md       #     approved package + runtime versions (package-dependencies-doc.md)
│   │   ├── atlas-deep-dive.md            #     current-system architecture, from Atlas via Helix MCP
│   │   ├── business-overview.md          #     + the flat RE docs (from Atlas): code-structure.md,
│   │   │                                 #     api-documentation.md, component-inventory.md,
│   │   │                                 #     technology-stack.md, dependencies.md,
│   │   │                                 #     code-quality-assessment.md,
│   │   │                                 #     reverse-engineering-timestamp.md
│   │   ├── requirements.md               #     epic-brief.md, requirements.md
│   │   ├── stories.md                    #     stories.md, personas.md
│   │   ├── dependency-graph.yml
│   │   ├── executions.md                 #     workflow-planning execution plan (EXECUTE/SKIP per stage)
│   │   ├── functional-design.md          #     consolidated design docs (one per stage)
│   │   ├── nfr.md                        #     nfr-requirements + nfr-design, merged
│   │   ├── infrastructure-design.md
│   │   ├── judge-rubrics.md              #     J1/J2 rubrics, derived from architecture.md (architecture-doc.md Section 6)
│   │   ├── application-design.md         #     components / methods / services / dependency, merged
│   │   ├── bug-brief.md                  #     ticket-implement (bug-fix): fetched/captured ticket brief
│   │   ├── enhancement-brief.md          #     ticket-implement (enhancement): fetched/captured brief
│   │   ├── impact-analysis.md            #     bug-fix / enhancement-implement: affected files + root cause
│   │   ├── change-story-<N.M>.md         #     epic-enhancement: the ONE change document per change story
│   │   ├── change-spec-<X.Y>.md          #     epic-enhancement: spec-only amendments (no code yet)
│   │   ├── bugfix-story-<N.M>.md         #     epic-bugfix: the ONE bugfix document per bugfix story
│   │   ├── change-requests/CR-<n>/       #     epic-change-request: the CR bundle
│   │   ├── ui-ux-design.md               #     UI/UX Mockups (opt-in): screen inventory, decisions, review history
│   │   ├── ui-ux/                        #     UI/UX Mockups (opt-in): self-contained HTML screens + index.html
│   │   │                                 #     (+ directions/ while a greenfield direction is being chosen).
│   │   │                                 #     Not written in the Figma modes (the design lives in Figma).
│   │   │                                 #     Design artifacts, never imported by src/
│   │   └── delta/<CYCLE-ID>-<slug>/      #     the cycle's RE delta — change record + evidence for
│   │       └── delta.md                  #     atlas-deep-dive.md. Written by archive-epic (Step 3),
│   │                                     #     published to Atlas by stitch-delta after merge
│   ├── spec-generation/                 #    the *-generation.md plan + clarifying-question files
│   │   ├── story-generation.md          #   nfr-requirements-generation.md, nfr-design-generation.md, application-design-generation.md,
│   │   ├── functional-design-generation.md #   infrastructure-design-generation.md,
│   │   ├── story-N.M-code-generation.md # Bug-generation.md, enhancement-generation.md,
│   │   ├── requirement-verification-questions.md
│   │   └── ui-ux-design-questions.md    #   UI/UX Mockups (opt-in): only the open design questions
│   └── context-project/                  #    HUMAN-CURATED INPUT — three subfolders, nothing else.
│       ├── existing-knowledge/           #    HUMAN-AUTHORED — how the CURRENT system works.
│       ├── new-references/               #    HUMAN-SUPPLIED — wireframes, mockups, UI/API specs.
│       └── coding-guidelines/            #    HUMAN-AUTHORED — the team's coding standards (.md);
│                                         #    every file governs all generated code.
│
├── test-plans/                            #   MANUAL TEST PLANS — on the Base Branch, kept across cycles
│   └── <cycle>/                          #    one folder per cycle (epic: <EPIC-ID>-<slug>) — parallel
│       └── <TICKET-ID>-<title>/          #    epics never share a file. Epic: one per story, written
│                                         #    at the STOP CHECKPOINT, published by the [TEST] PR.
│                                         #    Bug/enh: the ticket's folder is the cycle folder itself
│
├── reports/                               #   GENERATED OUTPUTS — evidence + review reports, never a spec
│   ├── unit-test-evidence/               #    per story: unit tests, coverage, regression, test placement
│   ├── api-contract-test-evidence/       #    per story: API contract test run, runner report, per-endpoint manifest
│   ├── eval-evidence/                    #    per story: eval.json + eval-summary.md scorecard, static/ (D1–D7, baseline/), judge/ (J1, J2)
│   ├── reviews/                          #    code-review reports (per story / all-stories)
│   ├── code-security-reviews/            #    <story-key>-security-review-v<X>.md per story; dated only for the standalone full audit
│   ├── pr-feedback/                      #    per story, per pr-fix round: feedback-ledger.md + resolution-summary.md
│   ├── ticket-summary/                   #    per-story code-summary docs (story/bug/enh -summary.md)
│   └── hooks-log/                        #    written ONLY by the AIRE hooks: hooks-log.md (cycle-level work) and
│                                         #     <story-key>/hooks-log.md (per story) — common/audit-logging.md Section 4
│
├── runtime-artifacts/                     #   SESSION STATE + tool caches, recreated fresh each cycle
│   ├── audit.md                          #    complete audit trail of decisions and stages
│   ├── aire-state.md                     #    Story Tracker, phases done, base branch, resumability
│   ├── stories/<story-key>/              #    per story (story-N.M, bug-ID, enhancement-ID, ve-ID):
│   │   ├── audit.md                      #     that story's audit trail — written only by that story's runs
│   │   └── state.md                      #     its Story Tracker row, progress, SH counters (common/parallel-work-state.md)
│   └── (.mypy_cache/, .ruff_cache/, … — root tool caches)
│
├── aire-workflow/                   #   THE FRAMEWORK ITSELF (this directory)
│   ├── aire-workflow-diagram.md                  #    End-to-end flow diagrams for every cycle type
│   ├── common/                           #    Cross-cutting rules loaded by every stage
│   ├── planning/                         #    Planning-phase stage rules
│   ├── implementation/                   #    Implementation-phase stage rules
│   ├── workflows/                        #    Keyword-triggered workflows (dev-implement, …)
│   ├── agents/                           #    Sub-agent procedures
│   └── extensions/                       #    Opt-in and mandatory rule extensions
│
├── aire-archives/                        #  Closed release cycles (archive-epic skill)
│   ├── stitch-ledger.md                  #    APPEND-ONLY, written by stitch-delta alone: one row per
│   │                                     #    delta published to Atlas (doc id + version). A delta with
│   │                                     #    no row is pending — absence is the signal. Lives HERE
│   │                                     #    because archive-epic deletes spec/ at cycle close.
│   ├── local-re/                         #    Option-B teams only. Written by stitch-delta-local ALONE:
│   │   ├── spec/plans/                   #    the refreshed local RE doc set, copied (read-only) into
│   │   │                                 #    a new cycle's spec/plans/ at Workspace Detection Step 3
│   │   └── stitch-ledger.md              #    APPEND-ONLY, one row per delta or story stitched locally
│   └── epics|bugs|enhancements/<ID>-<name>/
│       ├── spec/                        #    EXACT MIRROR of the live spec/ at cycle close —
│       │                                 #    all docs, context-project,
│       │                                 #    new-references. One `cp -R`, no unpacking.
│       ├── reports/                      #    EXACT MIRROR of the live reports/ (generated outputs)
│       ├── runtime-artifacts/            #    EXACT MIRROR of runtime-artifacts/ (audit.md, aire-state.md)
│       └── archive-manifest.md
│
├── .mcp.json                             # MCP servers — incl. the Helix MCP for Atlas access
└── CLAUDE.md                             # Repo guardrails — the agent reads this first
```

---

## CRITICAL PLACEMENT RULES

1. **ALL application code lives in `src/`.** Greenfield and brownfield alike. If a brownfield repo
   keeps its code somewhere else, see "Brownfield reconciliation" below — never silently write new
   code into a second location.
2. **`spec/` is documentation and specification only.** Never a `.ts`, `.py`, `.java` or any other
   source file. The one exception is the UI/UX Mockups stage's `spec/plans/ui-ux/*.html`:
   self-contained, static design artifacts that application code never imports
   (`extensions/design/ui-ux/ui-ux-mockups.md`). There is no `aire-docs/` layer — `spec/` has exactly
   three subfolders: `plans/` (all planning + design docs as flat files — `architecture.md`,
   `atlas-deep-dive.md` + the flat RE docs from Atlas, `requirements.md`, `stories.md`, `personas.md`,
   `epic-brief.md`, `dependency-graph.yml`, `functional-design.md`, `nfr.md`,
   `infrastructure-design.md`, `application-design.md`), `spec-generation/` (the `*-generation.md`
   plan / clarifying-question files) — and `context-project/` — the single human-curated input folder, which has exactly three
   subfolders: `existing-knowledge/` (how the CURRENT system works), `new-references/` (wireframes,
   mockups, API specs defining the target) and `coding-guidelines/` (the team's coding standards as
   `.md` files). There is no `context-references/` at the top level — all three live inside
   `context-project/`. The framework **creates the folders and never auto-populates them**. It reads
   `existing-knowledge/` and `new-references/` only at a path the user explicitly supplies, never by
   auto-scan; it reads every `.md` file in `coding-guidelines/` at its latest version whenever it
   writes stories or code (`implementation/code-generation.md` Step 1.8). They are
   **not cross-cycle**: `archive-epic` removes the whole `spec/` tree at cycle close,
   `context-project/` included, once it is mirrored into the cycle archive. Nothing regenerates them,
   so the next cycle re-curates them from the archived copy at
   `aire-archives/<type>/<ID>-<slug>/spec/context-project/`; Workspace Detection (Step 4.6) recreates
   the three folders empty.
3. **`spec/plans/architecture.md` is the architecture source of truth, and there is exactly one.**
   A story never gets its own architecture document — it reads the relevant section of this one.
   3b. The story's test-plan folder under `test-plans/` is the ONLY per-story spec — the Verification
   Engineer's manual test plan, written for EVERY story at the STOP CHECKPOINT, in one approved pass,
   before any code is generated (`implementation/test-plans-checkpoint.md`), and published to the Base
   Branch (`common/branching-strategy.md` Section 7); the implement workflows read it and never author
   it. No per-story requirements, architecture, constraints or deep-dive documents —
   that information is already authoritative in `stories.md`, `requirements.md` and `architecture.md`,
   and copying it per story only creates something that can drift.
4. **Test code lives in `tests/`, never in `src/`** unless the stack's own convention is co-location
   (Go `_test.go`, Rust `#[cfg(test)]`), in which case follow the stack. The `tests/` tree is always at
   the repository root, never under `src/` or a brownfield `## Code Root`.
   4a. **HARD RULE — ALL unit tests live under `tests/unit/`, with no exceptions and no sibling
   folders.** This includes UI/component tests (RTL, jsdom, Enzyme, Vue Test Utils, etc.) — a
   component-testing baseline or guard-test suite is still a unit test and nests under the mirrored
   `tests/unit/<area>/` path (e.g. `tests/unit/components/`), never a new top-level folder such as
   `tests/components/`. "Mirrors `src/`" constrains the *parent path*, not the file count — a suite
   that intentionally covers many `src/` modules together (a baseline/guard suite) is still placed at
   the mirrored path for the area it covers, not exempted into a new root-level folder for being
   grouped. There is no ambiguity to resolve here at generation time: if it is a unit test, it goes in
   `tests/unit/`. The one sibling folder allowed is `tests/e2e/` (rule 4d), which never holds unit
   tests.
   4b. Rule 4a (and 4c, 4d below) is checked on every story, not merely narrated. The Test Placement
   check (`implementation/code-generation.md` Step 11b, SH-LOOP-2) checks the story's diff on every
   implement run and writes `test-placement-check.log`. A misplaced test file is a gate failure,
   capped at 3 self-healing attempts, never a silent drift left for a later cleanup. This includes a
   story-diff path under `tests/e2e/`, whose fix is to revert it, never to move it.
   4c. API contract tests live under `tests/api/<mirror-of-src>/` — a test that calls an endpoint
   through an HTTP or in-process client (`implementation/code-generation.md` Step 11a.5). Never under
   `tests/unit/`, never under `src/`.
   4d. Novus E2E tests live only under `tests/e2e/`, a standalone Maven module that is never listed in
   a root `pom.xml` reactor or a Gradle `settings` file. Only the opt-in `/novus-automate` skill writes
   there, on an `automation/<TICKET-ID>-<title>` branch (`common/branching-strategy.md` Section 8,
   `extensions/testing/novus-automation/novus-automation.md`). Story, bug, enhancement and `ve` runs
   never write there.
5. **Generated outputs are not specifications.** Raw tool output and review reports go under the
   top-level `reports/` root (`reports/unit-test-evidence/`, `reports/api-contract-test-evidence/`,
   `reports/eval-evidence/`, `reports/reviews/`,
   `reports/code-security-reviews/`, `reports/pr-feedback/`, `reports/ticket-summary/`,
   `reports/hooks-log/`), never into
   `spec/` and never into a design or requirements document. One exception: the Novus automation
   summary and run log, `tests/e2e/automation/<TICKET-ID>.md` and `<TICKET-ID>.runs.md`, are records
   committed with the tests they describe (rule 4d).
6. **Never write outside these roots.** No stray files at the workspace root; no code in
   `spec/`; no docs in `src/`.

---

## ARTIFACT OWNERSHIP — which branch writes what

**This table is the single authority on which branch writes each generated artifact. Nothing is ever
pushed to the base branch directly** — artifacts reach base through the cycle's own PR.

| Path                                            | Written on       | When                                           |
| ----------------------------------------------- | ---------------- | ---------------------------------------------- |
| `spec/**`                                     | cycle branch     | Generated during the cycle (planning, design, STOP CHECKPOINT) |
| `runtime-artifacts/{audit.md,aire-state.md}`  | cycle branch     | Created by Workspace Detection at cycle start  |
| `runtime-artifacts/stories/<story-key>/`      | cycle branch (epic cycle: through `.aire-docs/`) | Written by that story's own runs (`common/parallel-work-state.md`) |
| `src/**`, `tests/unit/**`, `tests/api/**`   | story branch     | Generated during code generation                |
| `tests/e2e/**`                              | `automation/<TICKET-ID>-<title>` | Each `/novus-automate` run; reaches the Base Branch through the `[AUTO]` PR (`common/branching-strategy.md` Section 8) |
| `reports/**` (generated evidence)             | cycle branch (epic cycle: through `.aire-docs/`) | Written during code generation, review and pr-fix |
| `spec/plans/delta/<CYCLE-ID>-<slug>/delta.md` | cycle branch | At cycle close — `archive-epic` Step 3. One folder per cycle, so parallel cycles never collide. Archived with the rest of `spec/`; `stitch-delta` reads it from the archive |
| `aire-archives/stitch-ledger.md` | **base**, via a `stitch-delta/<name>` PR | Written by `stitch-delta` alone, one appended row per delta after its Atlas write verifies. `archive-epic` never writes it, there is no pending row, and no row is ever edited — a delta is pending precisely because it has none |

**"Cycle branch"** = the epic branch for an epic cycle (documents only — it never carries `src/` or
`tests/`), the bug branch for a bug cycle, the enhancement branch for an enhancement cycle. **"Story
branch"** = the branch a story's implement run works on (epic cycle: cut from the Base Branch, code and
unit tests only, PR into the Base Branch; bug and enhancement cycles: the cycle branch itself).

**`.aire-docs/`** is not a fifth root: it is a local git worktree of the epic branch, opened by every
epic-cycle story run and excluded through `.git/info/exclude` (never committed). Inside a story run,
`spec/`, `runtime-artifacts/` and `reports/` paths resolve under it — `common/branching-strategy.md`
Section 4.

---

## Brownfield reconciliation — when existing code is not in `src/`

Detected at Workspace Detection. Do not mass-move an existing tree; that produces an
unreviewable diff and breaks every import in the repo.

| Situation                                                              | What to do                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing code already in`src/`                                       | Nothing to do. Continue.                                                                                                                                                                      |
| Existing code in a single other root (`app/`, `lib/`, `server/`) | **Record it** in `runtime-artifacts/aire-state.md` under `## Code Root` and treat that directory as `src/` for the whole cycle. Announce it. Every rule that says `src/` means the recorded root. |
| Monorepo with several package roots                                    | Record each in`## Code Root` as a list. New code goes into the package the story belongs to, at that package's own `src/`.                                                            |
| No discernible code root (files loose at repo root)                    | Create`src/`, put **only new** code there, and record it. Leave existing files alone.                                                                                                 |

**ENUMERATING a monorepo's package roots — do not eyeball it.** Read the repo's own workspace
declaration rather than scanning directories:

| Ecosystem | Where the package list is declared |
|---|---|
| npm / yarn / pnpm | `workspaces` in the root `package.json`, or `packages:` in `pnpm-workspace.yaml` |
| Maven | `<modules>` in the aggregator `pom.xml` (recursively — modules may declare their own) |
| Gradle | `include(...)` in `settings.gradle` / `settings.gradle.kts` |
| Go | `use (...)` in `go.work` |
| .NET | the project list in the `.sln` |
| Python | path/editable installs (`-e ../pkg`, `path = "../pkg"`), or a `packages/*` convention |
| Nx / Turborepo / Lerna | `nx.json` / `turbo.json` / `lerna.json` project globs |

Record EVERY package the declaration names. If a package is deliberately excluded, record why — an
unexplained omission is indistinguishable from an oversight.

Record the decision once, in `runtime-artifacts/aire-state.md`, and never re-derive it per story — an inconsistent
code root across stories is worse than a non-standard one.

```markdown
## Code Root
- **Type**: single | monorepo | new
- **Path(s)**: src/ | app/ | packages/api/src, packages/web/src
- **Recorded**: 2026-08-26T10:14:00Z
- **Note**: existing tree left in place; `src/` semantics map to `app/` for this repo
```
