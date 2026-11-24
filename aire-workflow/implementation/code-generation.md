# Code Generation - Detailed Steps

## Overview
Code Generation is per-story and is triggered ONLY by the `dev-implement` keyword (orchestrated by `workflows/dev-implement.md`). It runs after the system-level design stages and the  STOP CHECKPOINT. It has two parts, preceded by Story Selection:
- **Step 0 - Story Selection (MANDATORY)**: identify WHICH story to implement (by Tracker ID), run the Doability Gate, move it from `ToDo` to `In Progress`
- **Part 1 - Planning**: Create detailed code generation plan — implementation steps per layer, ending with the mandatory Unit Test & Coverage step
- **Part 2 - Generation**: Execute the announced plan to generate code and artifacts, then — all in the same run, before Code Review — generate + RUN unit tests until changed-line coverage is ≥90% (Step 11a), generate + RUN API contract tests when the story adds or changes an endpoint (Step 11a.5), verify test placement (Step 11b), run the FULL repo regression suite and diff it against the pre-change baseline (Step 11c), run the static evals and diff them against their baseline (Step 11c.5), score J1 architecture and J2 security (Step 11c.6), write the eval scorecard (Step 11c.7), and confirm the story's manual test plan exists (Step 11d).

**Extensions**: test-mandating extensions (e.g., Property-Based Testing) apply — their required tests are included in the Unit Test & Coverage step per the extension's scope.

**Note**: For brownfield projects, "generate" means modify existing files when appropriate, not create duplicates.

**Audit entries**: EVERY runtime-artifacts/audit.md entry written during this stage (plan approval prompts/responses, per-step generation logs, coverage evidence, completion) MUST include the `**TRACKER ITEM**:` field — the story's Tracker ID as a clickable link — AND the `**Epic Link**:` field — the full Parent Epic URL as a clickable link, read from `## Tracker` in `runtime-artifacts/aire-state.md`, or `none` when no Epic is recorded. See the Audit Entry Format in `workflows/dev-implement.md`.

**Note on design context**: The system-level design artifacts (functional/NFR/infrastructure and `architecture.md`, under `spec/plans/`) apply to every story. Code for each story is written into the application structure documented in Application Design (or, if Application Design was skipped, per the structure patterns in Critical Rules below).

## Prerequisites
- System-level design stages complete (functional/NFR/infrastructure as applicable)
- Dependency Graph exists (`spec/plans/dependency-graph.yml`) and the `## Story Tracker` exists in `runtime-artifacts/aire-state.md`
- The story selected via `dev-implement` has passed the Doability Gate (every `requires` story's PR is merged into the Base Branch)
- The story branch is active, cut from the Base Branch AFTER the dependency-merge check passed (`common/branching-strategy.md` Section 3). If any prerequisite story's PR is NOT yet merged into the Base Branch, code generation MUST NOT start — the workflow has already warned and stopped (Case B): the prerequisite's PR must be approved and merged into the Base Branch first, then `dev-implement` re-run
- Under `dev-implement`, every `spec/`, `runtime-artifacts/` and `reports/` path in this file resolves into the docs worktree `.aire-docs/` (`common/branching-strategy.md` Section 4); code and unit tests stay in the main working tree on the story branch

---

# PART 1: PLANNING

## Step 0: Story Selection (MANDATORY)
- [ ] Load and execute all steps from `implementation/story-selection.md` — it asks which story, runs the Doability Gate, and moves the story from `ToDo` to `In Progress` automatically (board + local Story Tracker updated without asking, transition verified). Do NOT restate that logic here.
- [ ] Carry the resolved story (ID, title, acceptance criteria, Tracker ID/link) into the planning steps below.

## Step 1: Analyze Story & Design Context
- [ ] Read the selected story and its acceptance criteria from `spec/plans/stories.md`
- [ ] **Read `spec/plans/requirements.md` and resolve the story's `Covers` REQ-IDs** — the requirement text itself (not just the story's AC restatement) is MANDATORY planning input; an AC set that understates its requirement never caps the plan (`common/requirements-traceability.md` Rule 5)
- [ ] **Fallback coverage verification**: if `runtime-artifacts/aire-state.md` carries NO `Requirements coverage verified post-design` record, run `common/requirements-traceability.md` Rule 4 now (silent, blocking) before planning proceeds — the thread must never reach code generation unverified
- [ ] Read the system-level design artifacts (functional-design, nfr-design, infrastructure-design under `spec/plans/`)
- [ ] Read the `New References` fields of `## Context Project` in `runtime-artifacts/aire-state.md`. IF `New References: Yes`, load all listed reference paths — UX wireframes/mockups dictate the exact UI to build (layouts, controls, interactions); API specs dictate the exact endpoints and data shapes. When generating code, implement what the references show — they are authoritative for visual/structural fidelity alongside the acceptance criteria.
- [ ] Identify the story's dependencies and interfaces (from the Dependency Graph `requires`/`enables`)
- [ ] Validate the story is ready for code generation (Doability Gate passed in Step 0)

### Step 1.5:  RE-CONSULT the Design References (MANDATORY — automatic, ask the user nothing)

**Load `common/design-reference-grounding.md`** and read `## Design References` in `runtime-artifacts/aire-state.md`.

**This step adds NO question, NO gate, and NO checkpoint to code generation.** It runs silently as part of analysing story context; code generation has no approval gate.

- [ ] **FIRST, read the `### Reconciliations` table** in `## Design References` (rule DR-8). Every point listed there is a settled decision taken deliberately against the reference by an earlier design stage — an excluded capability, a narrowed scope, a locally-scoped stylesheet, an NFR or accessibility constraint. Those points are closed: follow the framework artifact, NOT the raw reference, and do not re-report them as contradictions. The design docs the framework generated are the reconciled source of truth wherever they have actually considered a point.
- [ ] **Re-open** every reference whose `Governs` covers a component THIS story builds or modifies, and ground only the points the reconciliations table does NOT settle. A fresh read for THIS story's scope is required — *"it was read at Requirements Analysis / Application Design"* does not count, because those stages read only what was in their own scope.
- [ ] For a UI prototype, open the real `*.component.html` / `*.ts` / `*.css` (or equivalent) for this story's components and extract: actual control types (plain `<select>` vs searchable grouped combobox; single- vs multi-select), grouping/ordering, labels and icons, interaction behaviour (search/filter, click-outside-to-close, keyboard, empty states), and custom CSS classes — checking whether those classes exist in the live app's global styles.
- [ ] For a `Figma design` or `Figma design (AIRE-generated)` row, resolve the Figma provider (`extensions/design/ui-ux/ui-ux-mockups.md` Section F0) and load its design-to-code guidance (the official Figma MCP's `figma-design-to-code` skill). For every frame governing this story — every state and size frame too — read its design context and a screenshot, and extract the same points as above plus layout (auto-layout direction, gaps, padding, sizing), the bound variables, and the components used. The design context is a reference to adapt to this project's components and theme, never code to paste. Compare the frame with `spec/plans/ui-ux-design.md`; a difference (the page was edited after approval) is reported per DR-6 in the plan, and the frame is followed unless a recorded reconciliation says otherwise. No Figma provider in this session → the reference cannot be read, and the Figma page is its only copy. HALT before the plan with: `This story's design is in Figma, and Figma is not connected in this session.`, followed by the How to connect Figma to Claude Code steps from `extensions/design/ui-ux/ui-ux-mockups.md` Section F0 (steps 1 to 7), and then `Once connected, type <the keyword that started this run, e.g. dev-implement> again.` This is the one stop this step can make: it is a missing precondition, not a question, and nothing has been written yet. Log it. For a `Figma design (exact match)` row, also read the file's variables (`get_variable_defs`) and its Code Connect map (`get_code_connect_map`), and follow `common/design-reference-grounding.md` DR-9 and Step 1.7 below instead of the DR-8 bullets that follow.
- [ ] **On any remaining difference, apply DR-8 precedence — do NOT blanket-prefer the reference:**
   - **Reconciled** (the artifact recorded a decision on this point) → follow the artifact; note in one line that the reference differs here by prior decision. Never reintroduce something a design stage deliberately excluded.
   - **Unreconciled** (no artifact ever addressed this point — the AC is simply generic or silent) → follow the reference, state plainly in the plan what the AC said versus what the design shows, amend the AC / `requirements.md` / the tracker item per `common/requirements-traceability.md`, and record the reconciliation.
   - Either way: do NOT stop, do NOT ask an A/B question — it is stated in the announced plan like everything else in it.
- [ ] A capability the prototype shows that is outside this story's ACs → check the reconciliations table first: if it is already recorded as excluded, honour that silently. If it is new, note in the plan that you saw it and excluded it as out of scope, and record the reconciliation so no later story re-adds it. Never silently build it, never silently drop it, never ask about it.
- [ ] Any reference still `Read? ` — read it now (DR-2/DR-3/DR-4) and carry on.
- [ ] Log in `runtime-artifacts/audit.md` which references were re-opened, for which components, what was extracted, and any deviation reported.

**The plan (Step 2) states, for EVERY component it creates or changes, exactly one of:**

```
Design reference: <path>/<file> — grounded (<what the reference actually specifies>)
Design reference: none covers this component — built from ACs only
```

This is your own self-check while writing the plan — satisfy it yourself before announcing the plan.

### Step 1.6: Apply the UI/UX design standards (only when UI/UX Mockups ran — automatic, ask the user nothing)

**Applies when** `## Extension Configuration` records `UI/UX Mockups` = Yes and this story's plan
has a Frontend Components Generation step (Step 2). Otherwise it is N/A: state
`UI/UX design standards: N/A — <UI/UX Mockups not enabled | no UI touched by this story>` in the plan
and continue.

**Load `common/ui-ux-design-standards.md`** and read the Design system section of
`spec/plans/ui-ux-design.md`, which holds the agreed answers and token values. Then, for the frontend
code this story writes:

- [ ] **Tokens become real theme values.** Map the agreed tokens (Section 2) into the project's
      existing theme mechanism, such as CSS custom properties, the CSS framework config, or the
      component library theme. Components use those tokens, never hard-coded colour, size or spacing
      values. On brownfield, reuse the existing theme; add only the tokens the existing theme lacks.
      In the Figma modes, the token source is the Figma variable collection named under **Design
      system** in `ui-ux-design.md`: keep the variable names recognisable in the theme names (for
      example `brand/default` → `--brand-default`).
- [ ] **Accessibility** at the agreed level, WCAG 2.2 AA minimum (Section 3): semantic elements and
      landmarks, visible labels linked to inputs, errors linked with `aria-describedby`, keyboard
      operability, visible focus, accessible names for icon-only controls, target sizes,
      `role="status"` or `role="alert"` for messages, and `prefers-reduced-motion`.
- [ ] **Responsive behaviour** for every supported screen size (Section 4): the agreed breakpoints,
      reflow at 320px, relative units, and each component's small-screen rule.
- [ ] **UX patterns** as agreed (Section 5): validation, feedback, loading, empty and
      destructive-action behaviour.
- [ ] Before the Frontend Components Summary, run the Section 7 checklist against the components this
      story changed (the items that apply to running code, not to the mockup files) and fix any gap.

The plan states, under the Frontend Components Generation step:

```
UI/UX design standards: applied — level <WCAG 2.2 AA | AAA>, sizes <desktop | desktop+tablet | all>, tokens mapped to <theme file>
```

The Frontend Components Summary records the checklist result. This step never relaxes an approved
mockup: where the mockup and the standards agree, both are followed. A mockup point that would breach
the Section 3 floor is fixed to meet the floor and noted in the plan. **Exception**: for a component
governed by a `Figma design (exact match)` row, Step 1.7 applies instead. The frame's values replace
the agreed tokens, breakpoints and patterns, and a visual accessibility gap is reported, not fixed
(DR-9).

### Step 1.7: Build exact-match Figma designs 100% (only for `Figma design (exact match)` rows — automatic, ask the user nothing)

**Applies when** `## Design References` has a `Figma design (exact match)` row whose `Governs` covers a
component this story creates or changes. Otherwise state
`Figma exact match: N/A — <no exact-match Figma design | none governs this story>` in the plan and
continue. The rules are `common/design-reference-grounding.md` DR-9. This step carries them out:

- [ ] **Values are taken from the frame, never approximated.** Colours, font family, size, weight,
      line height and letter spacing, spacing and padding, widths and heights, radii, borders and
      shadows come from the frame's design context. A value bound to a Figma variable becomes a theme
      token with a recognisable name (`brand/default` → `--brand-default`). An unbound value is used
      exactly, never rounded to the nearest spacing step. On brownfield, an existing theme token is
      reused only when its value is identical.
- [ ] **Components**: where the Code Connect map links a Figma component to a code component, use that
      code component. Otherwise reuse an existing project component only when it can render the frame
      exactly. If it cannot, build a new one rather than bending the design.
- [ ] **Text** is copied verbatim from the frame, including case and punctuation.
- [ ] **Icons and images** are the file's own assets, downloaded through the Figma provider
      (`download_assets`), never substitutes from an icon library. Fonts are the frame's families,
      loaded through the project's font mechanism.
- [ ] **Every state and size frame** governing the story is built (hover, focus, disabled, error,
      empty, loading, and each drawn width). Anything the frames do not draw is listed in the plan as
      `not drawn in Figma`, per DR-9.
- [ ] **Fidelity check (blocking) — SH-LOOP-7, after Frontend Components Generation and before the
      Frontend Components Summary.** For every governing frame, re-read its design context and
      screenshot through the Figma provider, then compare them with the code this story wrote:
      1. **Structure**: walk the frame's element tree against the component markup for the frame's
         state and width. Every drawn element has its matching element, in the same order.
      2. **Text**: every string in the frame appears verbatim in the code.
      3. **Values**: for every element, compare its design-context values (colours, font family,
         size, weight, line height, letter spacing, spacing, padding, sizes, radii, borders, shadows)
         with the styles and theme tokens the code applies to its matching element, resolving each
         token to its value.
      A difference is any missing, extra or reordered element, any text that differs, any colour,
      font or shadow value that differs, or any size, spacing or radius that is more than 1px off.
      Fix each difference and check the frame again. This loop is capped at 3 attempts
      (Bounded Self-Healing). If differences remain after the third attempt, HALT with the Self-Heal
      Limit message (`common/self-heal-limit-guidance.md`), listing each remaining difference by frame
      and element. The screenshots are internal to the check and are never saved as files.
- [ ] Record the result in the Frontend Components Summary, one row per frame:
      `| Frame | Link | Elements checked | Differences found | Fixed | Remaining |`.
      Below the table, list every DR-9 accessibility gap and every `not drawn in Figma` item. Log the
      result in the story's audit fragment.

The plan states, under the Frontend Components Generation step:

```
Figma exact match: applied — <n> frames from <file link>, fidelity check after generation
```

### Step 1.8: Apply the team's coding guidelines (automatic, ask the user nothing)

The single home for coding guidelines. Every flow that writes code follows this step: `dev-implement`,
`epic-enhancement`, `epic-bugfix`, `bug-fix-implement`, `enhancement-implement`, `pr-fix` and
`remediate`. Code Review checks against it (`implementation/code-review.md`).

1. **Read the latest version.** `git fetch origin`; when the branch that holds `spec/` (`.aire-docs/` on
   a story run, otherwise the bug or enhancement branch) is behind its origin, fast-forward it so a
   guideline a teammate pushed is used (if it cannot fast-forward, read the folder as it is and say so
   in the plan). Then read every `.md` file in `spec/context-project/coding-guidelines/`, subfolders
   included. Read them again before every code-writing pass — the plan, the generation, each
   remediation round, each `pr-fix` round — never reuse a copy read earlier in the run.
2. **None there** (folder absent, or no `.md` file): skip this step silently. Code generation works as
   it does without guidelines.
3. **Apply them to every line the change adds or modifies**: file, folder, class, function and
   variable names, file layout, patterns, error handling, logging and test style. Never reformat lines
   the change does not touch.
4. **Precedence when they conflict**: framework rules (Security Baseline, the Generation Phase Rules
   including NO EMOJI, the Code Location Rules, approved package versions, the story's ACs) win over
   `spec/plans/architecture.md`, which wins over the coding guidelines, which win over the existing
   code's conventions. Name every conflict in the plan; never drop a guideline silently.

The plan states, before its first step:

```
Coding guidelines: applied — <n> files (<file names>)[; conflicts: <guideline> vs <rule> -> <rule> applies]
```

## Step 2: Create Detailed Story Code Generation Plan
- [ ] Read workspace root and project type from `runtime-artifacts/aire-state.md`
- [ ] Determine code location (see Critical Rules for structure patterns)
- [ ] **Brownfield only**: Review reverse engineering code-structure.md for existing files to modify
- [ ] Document exact paths (never spec/)
- [ ] Create explicit steps for implementing this story:
  - Project Structure Setup (greenfield only)
  - **Package Installs** — only the approved rows of `spec/plans/package-dependencies.md`, at their exact versions (`implementation/package-dependencies-doc.md` Section 6); list every package this story adds
  - Business Logic Generation
  - Business Logic Summary
  - API Layer Generation
  - API Layer Summary
  - Repository Layer Generation
  - Repository Layer Summary
  - Frontend Components Generation (if applicable) — include it whenever the story adds or changes anything the browser renders or runs (components, screens, pages, client-side routing, styles, UI state). When UI/UX Mockups ran, this step also carries the Step 1.6 standards line. When an exact-match Figma design governs the story, it also carries the Step 1.7 line and ends with the Step 1.7 fidelity check.
  - Frontend Components Summary (if applicable)
  - Database Migration Scripts (if data models exist)
  - **Unit Test & Coverage** — generate unit tests for ALL new/changed code, run them, and iterate until changed-line coverage is ≥90% (Step 11a — always the step after implementation)
  - **API Contract Tests** — for every endpoint this story adds or changes, generate the contract tests under `tests/api/<mirror-of-src>/`, run them, and iterate until they pass (Step 11a.5 — `N/A` when the story touches no endpoint)
  - **Test Placement** — every new/changed unit test sits under `tests/unit/<mirror-of-src>/` and every API contract test under `tests/api/<mirror-of-src>/`, and the story touched nothing under `tests/e2e/` (Step 11b)
  - **Full Regression vs Baseline** — re-run the ENTIRE repo test suite and diff against the baseline captured at the Story Branch checkpoint; any NEW failure is fixed in the same run (Step 11c)
  - **Static Evals** — run the static checks as terminal commands and diff them against the static baseline; any NEW finding on a changed file is fixed in the same run (Step 11c.5)
  - **Judge Score Checkpoint** — score the diff for J1 architecture conformance and J2 security against `spec/plans/judge-rubrics.md`; each must reach 0.85 (Step 11c.6)
  - **Eval Scorecard** — write `eval.json` and `eval-summary.md` under `reports/eval-evidence/<story-key>/` (Step 11c.7)
  - **Test Plan Check** — the story's manual test plan exists under `test-plans/` (Step 11d)
  - Documentation Generation (API docs, README updates)
  - Deployment Artifacts Generation
- [ ] **Ground every step in the previously generated docs**: each step traces back to the story's acceptance criteria, `epic-brief.md` (if present), `requirements.md` and the design artifacts under `spec/plans/` + Application Design. Never invent scope, files or behaviour those documents do not back.
- [ ] Number each step sequentially
- [ ] Include story mapping references
- [ ] **Tag EVERY implementation step with the REQ-ID(s) and acceptance criteria it implements** — e.g., `Step 3: Order validation service (REQ-F-03, AC-1, AC-2)` (`common/requirements-traceability.md` Rule 5)
- [ ] Add checkboxes [ ] for each step

## Step 3: Include Story Implementation Context
- [ ] For this story, include:
  - The story's acceptance criteria and the intake brief context (`epic-brief.md`, if present)
  - Dependencies on other stories (`requires`/`enables` from the Dependency Graph)
  - Expected interfaces and contracts (from Application Design, if it ran)
  - Database entities this story owns or touches
  - Service/component boundaries and responsibilities (from Application Design)

## Step 4: Create Story Plan Document
- [ ] Save complete plan as `spec/spec-generation/story-N.M-code-generation.md`, then re-`Read` the file to confirm it exists on disk before the plan is announced. A plan that exists only as chat output or an audit entry does NOT satisfy this step.
- [ ] Include step numbering (Step 1, Step 2, etc.)
- [ ] Include story context and dependencies
- [ ] Include story traceability
- [ ] **Trace completeness self-check (MANDATORY — automatic, blocking, BEFORE the plan is announced)**: verify every REQ-ID in the story's `Covers` AND every acceptance criterion appears in ≥1 tagged plan step. A REQ/AC with no plan step is a blocking gap — extend the plan and re-check (no user prompt). Include the trace summary (REQ/AC → plan steps) in the plan document (`common/requirements-traceability.md` Rule 5)
- [ ] Ensure plan is executable step-by-step
- [ ] Emphasize that this plan is the single source of truth for Code Generation

## Step 5: Summarize Story Plan
- [ ] Provide summary of the story code generation plan to the user
- [ ] Highlight the implementation approach
- [ ] Explain step sequence and story coverage
- [ ] Note total number of steps and estimated scope

## Step 6: Log the Finalized Plan ( no approval prompt)
- [ ] **There is NO plan-approval gate.** The plan is finalized, announced and executed in the same run — never ask "Approve this plan?".
- [ ] Log the finalized plan with timestamp in `runtime-artifacts/audit.md` under a plain heading — e.g. `## Code Generation Part 1 — Plan Finalized (auto-approved, no gate) (Story N.M)`. The word "GATE" must NOT appear in any heading written by this stage.
- [ ] Include the path to the complete story code generation plan, the step count, and the REQ/AC trace summary
- [ ] Include the `**TRACKER ITEM**:` field (story's Tracker ID link) and the `**Epic Link**:` field (full Parent Epic URL from `## Tracker` in runtime-artifacts/aire-state.md, or `none`)


## Step 7: Announce and Proceed (no wait)
- [ ] Present the plan summary as an announcement, then proceed straight to Part 2 (Generation) — do NOT wait for a response
- [ ] If the user volunteers changes to the plan (now or mid-generation), apply them, update the plan document, announce the revision, and continue — an interrupt, not a gate

## Step 8: Log Plan Changes
- [ ] Log any user-volunteered plan change as an ordinary interaction with their complete raw input, under a plain (non-"GATE") heading.

## Step 9: Update Progress
- [ ] Mark Code Generation Part 1 (Planning) complete in `runtime-artifacts/aire-state.md`

---

# PART 2: GENERATION

## Step 10: Load Story Code Generation Plan
- [ ] **HARD CHECKPOINT — the plan file must exist on disk before ANY code is generated.** `Read` `spec/spec-generation/story-N.M-code-generation.md`. If it does not exist (was only narrated in chat/audit.md and never written), this is a process violation — STOP, write the file now per Step 4 in full (numbered steps, checkboxes, story context/dependencies, REQ/AC trace summary), log the correction in `runtime-artifacts/audit.md`, and only then proceed. Never generate code against a plan that exists only in the conversation.
- [ ] Read the complete plan from `spec/spec-generation/story-N.M-code-generation.md`
- [ ] Identify the next uncompleted step (first [ ] checkbox)
- [ ] Load the context for that step (story, dependencies, design artifacts)

## Step 11: Execute Current Step
- [ ] Verify target directory from plan — code goes to the resolved code root, never to `spec/`
- [ ] **Brownfield only**: Check if target file exists
- [ ] If this step is the Unit Test & Coverage step, execute Step 11a in full — tests are generated, RUN, and iterated to the coverage minimum in this same run, never deferred to the Verification Engineer or a later session.
- [ ] **Installing a package?** Install only an approved row of `spec/plans/package-dependencies.md` at its exact version, saved exact, lockfile committed with the change. A package not in the file: look up its latest stable version live, install it exact, record it as `added during code generation` and announce it (`implementation/package-dependencies-doc.md` Section 6). Never `@latest`, never a range, never an unapproved upgrade of an existing package.
- [ ] Generate exactly what the current step describes:
  - **If file exists**: Modify it in-place (never create `ClassName_modified.java`, `ClassName_new.java`, etc.)
  - **If file doesn't exist**: Create new file
- [ ] Write to correct locations:
  - **Application Code**: the resolved code root (`src/` by default) per project structure
  - **Unit tests (including UI/component tests — RTL, jsdom, Enzyme, etc.)**: repo-root `tests/unit/`,
    mirroring the area of `src/` they cover (e.g. a components baseline/guard suite → `tests/unit/components/`).
    **HARD RULE, no exceptions**: EVERY unit test — including a grouped/baseline UI-component suite that
    covers many `src/` modules at once — goes under `tests/unit/`. Never create a sibling top-level folder
    (e.g. `tests/components/`). The `tests/` tree is ALWAYS at the repository root, never nested under
    `src/` and never under a brownfield `## Code Root`; the Code Root remapping is for application code only.
  - **API contract tests (Step 11a.5)**: repo-root `tests/api/`, mirroring the area of `src/` that
    holds the endpoint (e.g. `src/orders/orders.controller.ts` → `tests/api/orders/orders.api.test.ts`).
    Never under `tests/unit/`, never under `src/`.
  - **Documentation / specs**: `spec/` (markdown only)
  - **Generated evidence**: `reports/` (never under `spec/`)
  - **Build/Config Files**: workspace root (they belong there by tooling convention)
  - **Never** a source file under `spec/`
- [ ] Follow the story's acceptance criteria
- [ ] Respect dependencies and interfaces

## Step 11a: Unit Test & Coverage (MANDATORY — after implementation, same run) — SH-LOOP-1

This step is the single home of the coverage rules; every other rule file refers here.

**The minimum**: 90% line coverage on the lines this story added or changed — fixed, never lowered,
never configured per project.

Run each command from the project root that owns it (the folder holding its build manifest, e.g.
`package.json`, `pyproject.toml`, `pom.xml`, `go.mod`, `*.csproj`); never invent a path.

- [ ] **Generate unit tests** covering ALL of the story's new/changed code — happy paths, edge cases, error scenarios, per acceptance criterion
- [ ] **RUN the tests** with the project's test runner; fix any failures (in the tests or the defects they expose in the implementation) until 100% of tests pass
- [ ] **Measure coverage with a machine-readable report** from the stack's own tool — lcov (jest/nyc/vitest: `--coverage --coverageReporters=lcov`), Cobertura XML (pytest-cov: `--cov-report=xml`; .NET coverlet), JaCoCo XML, or a Go coverprofile (`-coverprofile`). A terminal summary alone is never evidence.
- [ ] **Compute changed-line coverage**: take the lines this story added or changed in its source files (`git diff` against the baseline SHA recorded with `baseline-regression.log`) and measure them against the report. Write the result to `coverage/changed-lines-coverage.json` (format: `common/story-artifacts.md`).
  - A changed source file absent from the coverage report is an ERROR (a path mismatch or an untested file) — never counted as 0/0 and never averaged away.
  - A runner that collects zero tests is not itself a failure, but every changed source file still needs coverage, so the minimum is met only once real tests cover it.
- [ ] **Iterate until the minimum is met**: below 90% → identify the uncovered lines/branches, add or adjust tests, re-run — WITHIN THIS SAME RUN. Capped at 3 attempts (SH-1); on exhaustion HALT with the Self-Heal Limit message (`common/self-heal-limit-guidance.md`).
- [ ] **Never** lower the threshold, skip, delete or weaken a test, or add a trivially-true test to reach it.
- [ ] **Record the gate status** — exactly one of `PASS` · `FAIL` · `ERROR` · `N/A`:
  - `N/A` only when the story changed no testable source (docs/config only), with that reason written down.
  - "Not run yet", "tool not installed", "time-boxed", "deferred", "by inspection" are never `N/A` — they are `ERROR`, and `ERROR` blocks the story like `FAIL`.
  - Only when the stack genuinely has NO coverage-report tooling (after checking for the standard tool) may the report file be waived: record the tools checked and why none exists in `evidence-manifest.md` and surface the exception to the user.
- [ ] **Capture proof** (evidence E1, `common/story-artifacts.md`) in `reports/unit-test-evidence/<story-key>/`:
  - `unit-test-run.log` — the raw, unedited output of the final passing run
  - `coverage/` — the coverage tool's own report from the same run, plus `changed-lines-coverage.json`
  - `evidence-manifest.md` — exact command(s), runner + coverage tool, tests passing (X/X), changed-line coverage %, gate status, and a link to each artifact
- [ ] Every X/X-passing and coverage figure reported downstream (completion message, Code Review, PR, tracker comment) MUST match these artifacts.

## Step 11a.5: API Contract Tests (MANDATORY WHEN APPLICABLE — after Step 11a, same run) — SH-LOOP-8

This step is the single home of the API contract test rules; every other rule file refers here. Unit
tests prove the code paths run. These tests prove each endpoint honours its contract when called from
outside: status codes, authorization, request validation and response shape.

**Applicability** (decided per story, never asked):
- **Applies** when the story adds or changes an endpoint that clients call — a route, controller,
  handler or resolver (REST, GraphQL or RPC). In the plan, that is an API Layer Generation step.
- **`N/A`** otherwise. Record `API contract tests: N/A — no endpoint added or changed` in the plan and
  in `evidence-manifest.md`, then continue to Step 11b.

**How they are written** — the same way as the unit tests:
- Location: repo-root `tests/api/<mirror-of-src>/` (Step 11), with the stack's usual test-file naming.
- Runner: the project's existing test runner, plus the stack's standard in-process HTTP client —
  supertest, httpx / FastAPI `TestClient`, MockMvc or RestAssured, `net/http/httptest`,
  `WebApplicationFactory`. When the repo has no such client, use the runner's own standard one; do not
  add a new test framework.
- Isolation: no deployed environment and no external network. External services are stubbed the same
  way the unit tests stub them.
- Contract source, in order: `spec/plans/architecture.md` Section 5, an API spec under
  `## Context Project` New References, the OpenAPI document or DTO/schema types in the code. When none
  declares the endpoint, the acceptance criteria and the story's own request/response types are the
  contract. Record which source was used in the manifest.
- Scope: the provider-side contract of this service's own API. Consumer-driven contract testing
  across services (for example Pact) is included only when the repo already uses it.

**The checklist** — for every endpoint the story adds or changes, one or more tests per item, or an `N/A`
with a one-line reason:

| # | Item | What the tests assert |
|---|---|---|
| C1 | Success | the documented status code and body for each acceptance criterion |
| C2 | Status codes | every documented failure path returns its documented code (4xx, 5xx), not only the success code |
| C3 | Authorization | no credentials → 401, an authenticated caller without the right role → 403, the right role → success. `N/A` only for a public endpoint |
| C4 | Request contract | a missing required field, a wrong type and an out-of-range or invalid enum value are each rejected with the documented validation error. `N/A` only when the endpoint takes no body or parameters |
| C5 | Response contract | the body matches the declared schema: required fields present, correct types, enum values inside the declared set |
| C6 | Error contract | every error response uses the project's standard error envelope and error code |

**Running and fixing:**
- [ ] RUN the API tests with a machine-readable report: jest `--json --outputFile=<file>`, pytest
  `--junitxml=<file>`, the Surefire or Gradle `TEST-*.xml`, `go test -json`, dotnet
  `--logger "trx;LogFileName=<file>"`, or the stack's equivalent. A log alone is not evidence.
- [ ] A failing test exposes a defect in the endpoint: fix the implementation, never the assertion.
  Iterate in this same run. Capped at 3 attempts (SH-1); on exhaustion HALT with the Self-Heal Limit
  message.
- [ ] These tests do not count toward the Step 11a changed-line coverage figure, which stays a
  unit-test measure.
- [ ] Record the gate status with the Step 11a vocabulary (`PASS`, `FAIL`, `ERROR`, `N/A`).
- [ ] **Capture proof** in `reports/api-contract-test-evidence/<story-key>/` (`common/story-artifacts.md`
  E6): `api-contract-test-run.log` (raw output of the final passing run), `api-contract-test-report.*`
  (the runner's report file from the same run), and `evidence-manifest.md` with the per-endpoint
  checklist (endpoint and method, C1–C6 each `Pass` or `N/A` with its reason, tests passing X/X). When
  the step is `N/A`, the folder holds only the manifest, stating the reason.
- [ ] This gate does not replace the Verification Engineer's manual API and contract test plans.

## Step 11b: Test Placement (MANDATORY — after Step 11a and Step 11a.5, same run) — SH-LOOP-2

A deterministic check of WHERE this story's tests went (`common/directory-structure.md`).

- [ ] **Diff scope**: `git diff --name-only --diff-filter=ACMR <baseline-sha>...HEAD` — only files this story added or modified.
- [ ] Classify each changed path as `application`, `unit-test`, `api-test` or `other`. A test file is recognised by filename pattern (`*.test.*`, `*.spec.*`, `test_*.py`, `*_test.py`, `*Test.java`, `*Tests.cs`, `*_test.go`). It is an `api-test` when it calls an endpoint through an HTTP or in-process client (Step 11a.5), and a `unit-test` otherwise. Flag a violation when:
  1. A `unit-test` or `api-test` file lives under the resolved code root (`src/` or `## Code Root`) — unless the stack's own co-location convention applies (Go `_test.go`, Rust `#[cfg(test)]`).
  2. A `unit-test` file lives under `tests/` but outside `tests/unit/` (e.g. a new top-level `tests/components/`, or a file directly at `tests/` root).
  3. An `api-test` file lives outside `tests/api/`.
  4. `tests/unit/` or `tests/api/` gained a new top-level subfolder with no corresponding top-level folder under `src/` — a warning that needs a one-line justification in `evidence-manifest.md` tracing it to a real `src/` area.
  5. ANY changed path under `tests/e2e/`, whatever its classification (`*Tests.java`, page, impl and `pom.xml` files are otherwise `other` and would pass unflagged). Message: "written only by `/novus-automate` (directory-structure rule 4d)".
- [ ] **Zero violations required.** On a violation of rules 1–3: move the file to its correct mirrored path, fix its relative imports, re-run it, and re-check. On a violation of rule 5: unstage and revert the path (`git restore --staged --worktree -- <path>`, or `git rm --cached` plus delete for a new file) — never move it. Both count toward the same cap of 3 attempts (SH-1); rule 5's fix is deterministic and succeeds on the first attempt. On exhaustion HALT with the Self-Heal Limit message. Never relax the rules to pass.
- [ ] **Capture proof**: `reports/unit-test-evidence/<story-key>/test-placement-check.log` (files scanned, classification, verdict) and the result + any moved or reverted files in `evidence-manifest.md`.
- [ ] **N/A** only when this story changed no test files and no path under `tests/e2e/` — stated explicitly.

## Step 11c: Full Regression (MANDATORY — after Step 11b, same run) — SH-LOOP-3
Step 11a is scoped to the story's new/changed code. It cannot detect assertions this story invalidated in pre-existing test files — that is what this step is for.
- [ ] **Re-run the ENTIRE repo test suite** (all pre-existing tests + this story's new tests, unit and API contract alike — `tests/unit/` and `tests/api/`) and save the raw output to `reports/unit-test-evidence/<story-key>/full-regression.log`
- [ ] **Diff against `baseline-regression.log`**, captured on the story branch by the invoking workflow before any code was generated
- [ ] **NEW failures (green at baseline, red now)** — this story broke them, so this story fixes them, within THIS SAME run (no user prompt), re-running and re-diffing until the diff is clean. Fix each according to what actually broke:
  - **Obsolete expectation** — behaviour legitimately changed, the assertion encodes the old contract → update the assertion (keep the test; it still guards real behaviour)
  - **Genuinely dead** — exercises a code path this story removed → delete it after confirming the new tests cover the replacement path
  - **Real regression** — the test is correct and the implementation broke it → fix the implementation, never the test
- [ ] **NEVER delete, skip, or weaken a failing test merely to turn the suite green**
- [ ] **Failures already red at baseline** → not this story's doing; they are logged in `baseline-regression.log`. Do not block or fix on them.
- [ ] Capped at 3 attempts (SH-1); on exhaustion HALT with the Self-Heal Limit message.
- [ ] **Record in `evidence-manifest.md`**: baseline vs post-change pass/fail counts, and each NEW failure with what broke and how it was fixed

## Step 11c.5: Static Evals (MANDATORY — after Step 11c, same run) — SH-LOOP-9

This step is the single home of the static eval rules; every other rule file refers here. The test
gates prove the code behaves. These checks prove it lints, type-checks, carries no new security or
dependency findings and leaks no secret — deterministically, against a baseline taken before the change.

**Terminal commands only.** Every check is a command run directly in the terminal, invoking the tool
the project already has. AIRE never writes, generates or commits a script, wrapper or configuration
file for this gate, and never adds a tool or dependency to the project to satisfy it. A command the
project already defines (a `package.json` script, a Makefile target, a pre-commit hook, a step of the
project's CI workflow) may be run as-is.

**The checks:**

| # | Check | A NEW finding is | Examples, use whichever the repo already has |
|---|---|---|---|
| D1 | Lint | a lint error or warning absent at baseline | `npx eslint <changed files>`, `ruff check`, `flake8`, `pylint`, `golangci-lint run`, `go vet ./...`, `mvn -q checkstyle:check`, `dotnet format --verify-no-changes` |
| D2 | Type check / compile | a type or compiler error or warning absent at baseline | `npx tsc --noEmit`, `mypy`, `pyright`, `go build ./...`, `mvn -q compile`, `dotnet build` |
| D3 | Static security (SAST) | a rule hit absent at baseline | `semgrep --config auto`, `bandit -r src`, `gosec ./...`, SpotBugs with find-sec-bugs |
| D4 | Dependency vulnerabilities | a High or Critical advisory absent at baseline | `npm audit --json`, `pip-audit`, `govulncheck ./...`, `dotnet list package --vulnerable --include-transitive`, the OWASP dependency-check plugin |
| D5 | Licences | a dependency this story added whose licence is AGPL, GPL, SSPL or unknown, unless the repo's own licence already permits it | `npm view <pkg> license`, `pip show <pkg>`, the package's published metadata |
| D6 | Complexity | a function this story added or changed above 15 cyclomatic complexity, or above the repo's own configured limit | `lizard`, `radon cc`, `gocyclo`, the eslint `complexity` rule |
| D7 | Secrets in the diff | a credential on a line this story added | `gitleaks detect --no-git --source <changed files>`; otherwise the `git diff` command below |

D7 without gitleaks, run from the repo root:

```bash
git diff -U0 <baseline-sha> | grep -E '^\+' | grep -inE -e 'AKIA[0-9A-Z]{16}' -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' -e "(api[_-]?key|secret|passw(or)?d|token)[[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}"
```

Every match is read. One that is not a credential (a variable reference, a documented placeholder) is
recorded with its line in the scorecard; any other match is a NEW finding.

**Resolving the tool** for each check, in order: the command the project already defines, then a tool
already installed for the project (its dev dependencies, lockfile or environment), then the stack's
built-in. No tool after that search → the check is `N/A`, with every tool looked for recorded in the
scorecard. D7 is never `N/A` — `git diff` and `grep` are always available. When every check except
D7 is `N/A`, say so in the completion message.

**Running it:**
1. **Baseline** — captured by the invoking workflow at the same moment as `baseline-regression.log`,
   on the freshly cut branch and before any code is written: run D1 to D4 and D6 with the exact
   commands and arguments the post-change run will use, saving each output to
   `reports/eval-evidence/<story-key>/static/baseline/<check>.log` (`common/story-artifacts.md` E7).
   D5 and D7 read the diff and need no baseline.
2. **Post-change** — after Step 11c, re-run every applicable check with the same commands, saving
   `reports/eval-evidence/<story-key>/static/<check>.log`.
3. **Diff** — a finding counts as NEW when it is absent at baseline and sits in a file this story added
   or changed (D4 and D5: a dependency this story added or upgraded). Compare findings by tool rule
   ID, file and message, not by line number, since lines shift. Baseline findings and findings in files
   the story did not touch are pre-existing debt: logged, never fixed here, never blocking.
4. **Fix** every NEW finding in the code, in this same run, then re-run and re-diff. A vulnerable
   dependency is fixed by choosing a non-vulnerable version or another package. Capped at 3 attempts
   (SH-1); on exhaustion HALT with the Self-Heal Limit message.
5. **Never suppress a finding to pass.** Inline disables (`eslint-disable`, `# noqa`, `# nosec`,
   `# type: ignore`, `@SuppressWarnings`), ignore-list or baseline-file entries, tool-configuration
   changes that relax a rule, and excluding paths are all forbidden (SH-6).
6. Any later change to non-test code in the same run (the auto-remediate loop, a pr-fix round) re-runs
   this step, continuing the SH-LOOP-9 counter (SH-2).

**Gate status**: `PASS` when every check is `PASS` or `N/A`; the Step 11a vocabulary otherwise.
Capture proof in `reports/eval-evidence/<story-key>/static/`: `baseline/` and one log per check.
Each check's result (tool and command, baseline count, post-change count, NEW findings on changed
files, status) goes into the scorecard (Step 11c.7).

## Step 11c.6: Judge Score Checkpoint — J1 Architecture and J2 Security (MANDATORY — after Step 11c.5, same run) — SH-LOOP-10

This step is the single home of the judge score checkpoint; every other rule file refers here. The
deterministic checks cannot see a design violation such as a query in a controller, a transaction split
across two calls, a token written to a log, or an endpoint added without its auth guard. These two
scores grade the story's diff against the rubrics in `spec/plans/judge-rubrics.md`
(`implementation/architecture-doc.md` Section 6).

| Score | Rubric | Minimum |
|---|---|---|
| **J1** Architecture conformance | the J1 table | 0.85 |
| **J2** Security, OWASP Top 10:2025 | the J2 table | 0.85 |

**The rubric:**
1. Read `spec/plans/judge-rubrics.md`. Its `Rubric version` must equal the current `architecture.md`
   version.
2. **Missing or out of date** (a cycle that predates this step, or an amendment that did not re-derive
   it) → derive it for this run with the rules of `architecture-doc.md` Section 6, from `architecture.md`.
   If there is no `architecture.md`, derive J1 from `spec/plans/atlas-deep-dive.md` and the flat RE docs.
   Save the derived copy as `reports/eval-evidence/<story-key>/judge/rubric-used.md`, never over the
   shared file, and record `rubric: derived in this run` in the scorecard.
3. Nothing to derive J1 from → J1 is `N/A` with that reason, and does not block. J2 is never `N/A`
   unless the story changed no source code at all.

**Scoring** — inline, read-only, in this session:
1. Score each criterion independently against the story's diff (`git diff <baseline-sha>...HEAD`,
   source files only), from `1.0` (fully holds) to `0.0` (violated).
2. **Score only what the diff shows.** A criterion the diff cannot exercise is `N/A`; it is left out
   and the remaining weights are renormalised to 1.0. Code the story did not touch is never marked down.
3. **Every criterion below `1.0` cites `file:line` and states the violation.** A low score without a
   citation is a defect of the scoring pass: score that criterion again.
4. The score is the weighted sum. Score once per pass: re-scoring an unchanged diff to get a better
   number is forbidden.
5. Record the model that scored and the rubric version with every score. A score without both cannot
   be compared across runs.

**Below the minimum** → fix the code so the cited criteria hold, worst weighted loss first, in this same
run. Re-run the steps the fix touches (Steps 11a, 11a.5, 11c and 11c.5, each continuing its own
counter), then score again. Capped at 3 attempts (SH-1); on exhaustion HALT with the Self-Heal Limit
message, naming each failing criterion, its weight and its citation.

**Never clear this checkpoint by changing the bar**: editing `architecture.md` or `judge-rubrics.md` to weaken
or delete a criterion, lowering a minimum, marking an applicable criterion `N/A`, or re-scoring until a
pass appears are all forbidden (SH-6). `architecture.md` changes only when the design decision changed
(`architecture-doc.md` Section 3).

Any later change to non-test code in the same run (the auto-remediate loop, a pr-fix round) scores
again, continuing the SH-LOOP-10 counter (SH-2).

**Checkpoint status**: `PASS` when J1 and J2 are each at or above 0.85 or `N/A`; the Step 11a vocabulary
otherwise. Capture proof in `reports/eval-evidence/<story-key>/judge/`:
`architecture-score.json` and `security-score.json`, each with the model, the rubric version, the
score, the minimum, the status, and one entry per criterion (ID, weight, score or `N/A`, citation,
violation). Both scores go into the scorecard (Step 11c.7).

This checkpoint sits alongside the Code Review's Security Baseline pass (`implementation/code-review.md`
Phase 2.5) and replaces neither: the review lists findings, the judge grades the story against its
approved rubric.

## Step 11c.7: Eval Scorecard (MANDATORY — after Step 11c.6, same run)

Write `reports/eval-evidence/<story-key>/eval.json` and `eval-summary.md` in the format of
`common/story-artifacts.md` E7, from the evidence Steps 11a to 11c.6 saved: one entry per result (D1–D7,
unit coverage, API contract, regression, J1, J2), each copied from its own artifact, never retyped or
estimated. The `verdict` is `PASS` only when every entry is `PASS` or `N/A`.

Rewrite both files whenever a later step changes a result in the same run (the auto-remediate loop, a
pr-fix round). The completion message, the Code Review report, the PR body and the tracker comment quote
`eval-summary.md`; every figure they state must match it.

## Step 11d: Test Plan Check (MANDATORY — after Step 11c, before Code Review, same run)
The story ships with its own manual test plan, so the Verification Engineer executes it once the code lands instead of having to write it first.
- [ ] **Normal case — already present.** The story's test-plan folder (`common/branching-strategy.md` Section 7.1) was written at the STOP CHECKPOINT (`implementation/test-plans-checkpoint.md`) before any code existed. Read it per Section 7.3 — on an epic cycle from the cycle's open `[TEST]` PR or the Base Branch, on a bug or enhancement cycle from the cycle branch. If the folder holds this story's manual test steps — from that checkpoint or from an earlier standalone `/ve-implement` run — confirm it covers this story's acceptance criteria, reuse it as-is and record `Manual test plan: present`. Never regenerate or overwrite an existing plan to match the code just generated.
- [ ] **Genuinely absent** (a story added after the checkpoint, or a legacy project) → invoke the `ve-implement` skill (Skill tool) with this story and `mode: workflow`, announcing the backfill. In workflow mode it takes the story as given, cuts no `ve/…` branch, pushes nothing, raises no PR, and skips its approval checkpoint (`agents/ve-implement-agent.md`, Mode Detection). On an epic cycle its files are published through the cycle's `[TEST]` PR (`common/branching-strategy.md` Section 7.2), never on the story branch or the epic branch; on a bug or enhancement cycle they ride the cycle branch's own commit (Section 7.4).
- [ ] This is scope, not the Verification Engineer's sign-off — never present backfilled content as Verification Engineer-approved.

## Step 12: Update Progress
- [ ] Mark the completed step as [x] in the code generation plan
- [ ] **Story Tracker**: ensure the story being implemented is `In Progress` with a `Start` date; update `Recorded` to the current timestamp in `runtime-artifacts/aire-state.md`
- [ ] Update `runtime-artifacts/aire-state.md` current status
- [ ] **Brownfield only**: Verify no duplicate files created (e.g., no `ClassName_modified.java` alongside `ClassName.java`)
- [ ] Save all generated artifacts

## Step 13: Continue or Complete Generation
- [ ] If more steps remain, return to Step 10
- [ ] If all steps complete, proceed to present completion message

## Step 14: Present Completion Message
- Present completion message in this structure:
     1. **Completion Announcement** (mandatory): Always start with this:

```markdown
# Code Generation Complete - Story [N.M]
```

     2. **AI Summary** (optional): Provide structured bullet-point summary
        - **Brownfield**: Distinguish modified vs created files (e.g., "• Modified: `src/services/user-service.ts`", "• Created: `src/services/auth-service.ts`")
        - **Greenfield**: List created files with paths (e.g., "• Created: `src/services/user-service.ts`")
        - List tests, documentation, deployment artifacts with paths
        - Keep factual, no workflow instructions
     3. **Formatted Workflow Message** (mandatory): Always end with this exact format:

```markdown
> ** <u>**REVIEW REQUIRED:**</u>**  
> Please examine the generated code at:
> - **Application Code**: `[actual-workspace-path]`
> - **Documentation**: `reports/ticket-summary/`



> ** <u>**WHAT'S NEXT?**</u>**
>
> Code generation is complete. An **automated Code Review now runs for this story** — you are not
> asked for anything. If it reports findings they are **remediated automatically** and re-reviewed
> until the verdict is clean; then the commit, push and PR happen on their own.

---
```

## Step 15: Hand Off to Automated Code Review (no user gate here)

"Code Review" and "Remediate" are workflow rule files, never Claude skills — the guardrail in `workflows/dev-implement.md` (Rule Details Loading) applies.

- **When invoked via `dev-implement`** (the normal path): do NOT stop for a "Request Changes / Continue" choice. Hand control straight back to `workflows/dev-implement.md` Post-Code-Generation Automation (Sections A–F), which owns the review, the verdict routing and the remediation loop.
- **When invoked standalone** (code generation only, not under `dev-implement`): present the completion announcement and wait for the user to either request changes or confirm; do not auto-run downstream workflows.

## Step 16: Record Approval & Story Status
> **When invoked via `dev-implement`** (the normal path): do NOT change the status here — `workflows/dev-implement.md` Execution item 7 and Section D Step 7 own it.
- Log approval in the audit trail with timestamp
- Record the user's approval response with timestamp
- **Post-implementation status — standalone code-generation too**: the story remains `In Progress`. Code generation never moves a story further; `Ready for Testing` is the developer's manual board move after two approvals, the merge into the Base Branch and the DEV deploy (`common/status-model.md` S4).
- **The valid statuses and who moves each one are defined only in `common/status-model.md`.**

---

## Critical Rules

### Code Location Rules — `src/` IS THE ONLY CODE ROOT

Full layout: `common/directory-structure.md`. The four roots and what belongs in each:

| Root | Contents |
|---|---|
| **`src/`** | ALL application code — greenfield AND brownfield |
| **`tests/`** | `unit/` (unit tests) and `api/` (API contract tests), both mirroring `src/` |
| **`spec/`** | Specs + docs ONLY. Never a source file. |
| **`reports/`** | Generated evidence ONLY (unit-test evidence, reviews, security reviews, ticket summaries, PR feedback) |

- **Read the code root from `runtime-artifacts/aire-state.md` `## Code Root`** before generating. If the block is
  absent, the root is `src/`.
- **Never write application code outside the resolved code root**, and never into `spec/`.

**Structure patterns by project type** (all *inside* the code root):
- **Greenfield (default)**: `src/` for code, `tests/` for tests, `config/` for configuration
- **Greenfield, multiple services (per Application Design)**: `src/{service-name}/`, `tests/unit/{service-name}/`
- **Greenfield, modular monolith (per Application Design)**: `src/{module-name}/`, `tests/unit/{module-name}/`
- **Brownfield**: use the EXISTING structure under the recorded code root (e.g. `src/main/java/`,
  `packages/api/src/`). Never mass-move an existing tree into `src/` — that produces an
  unreviewable diff and breaks every import. Record the real root once and treat it as `src/` for the
  whole cycle (`common/directory-structure.md` — Brownfield reconciliation).
- **Brownfield with no discernible code root** (files loose at the repo root): create `src/`, put
  only new code there, record it, and leave the existing files alone.

### Brownfield File Modification Rules
- Check if file exists before generating
- If exists: Modify in-place (never create copies like `ClassName_modified.java`)
- If doesn't exist: Create new file
- Verify no duplicate files after generation (Step 12)

### Planning Phase Rules
- Create explicit, numbered steps for all generation activities
- Include story traceability in the plan
- **REQ-ID THREAD**: load requirements.md + the story's `Covers` REQ-IDs as planning input, tag every step with the REQ/AC it implements, and pass the trace completeness self-check (every covered REQ-ID and every AC in ≥1 step) before the plan is announced — per `common/requirements-traceability.md` Rule 5
- Document story context and dependencies
- NO approval before generation — the plan is announced and executed (there is no plan gate)

### Generation Phase Rules
- **NO HARDCODED LOGIC**: Only execute what's written in the story plan
- **FOLLOW PLAN EXACTLY**: Do not deviate from the step sequence. Implement exactly the plan — no unplanned files, features, refactors or scope drift. If the plan must change mid-coding, revise the plan document, announce the revision (what changed and why) in the output and in the audit trail, and continue; never apply a deviation without recording it
- **UPDATE CHECKBOXES**: Mark [x] immediately after completing each step
- **STORY TRACEABILITY**: Mark the story's plan steps [x] when functionality is implemented
- **RESPECT DEPENDENCIES**: Only implement when every `requires` dependency's PR is merged (Doability Gate)
- **FOLLOW THE CODING GUIDELINES**: every added or changed line follows the files in `spec/context-project/coding-guidelines/`, re-read at each code-writing pass (Step 1.8); none there, nothing changes
- **NO EMOJI**: never write an emoji into source code or tests — identifiers, comments, log and error messages, user-facing strings, test names, assertion messages and fixtures included. Use plain words. When an AC requires handling emoji input, write it as an escape sequence (`"\u{1F600}"`), never the literal character
- **APPROVED PACKAGE VERSIONS ONLY**: every install follows `implementation/package-dependencies-doc.md` Section 6 — approved rows at exact versions; an unlisted package is looked up live, installed exact, recorded and announced
- **SQL RESERVED-WORD GUARDRAIL**: when generating any SQL (queries, migrations, stored procedures), never use a target-dialect reserved keyword (e.g., in T-SQL: `key`, `order`, `date`, `user`, `identity`, `year`, `percent`, `session`, `open`, `close`) as an unquoted column/table alias or identifier. Always bracket/quote any alias that could collide (`AS [Order]` in T-SQL, backticks in MySQL, double quotes in Postgres), or simply pick a non-colliding alias name.
- **ANGULAR/JS ASYNC SCOPE GUARDRAIL**: when generating Angular (or any JS/TS) code with async callbacks, always use arrow functions for `.subscribe()`, `.then()`, `.pipe()` operator, and other async callbacks inside a class, so `this` correctly resolves to the enclosing component/service/directive instance — never a plain `function() {...}` callback in that position. Always unsubscribe from long-lived Observables in `ngOnDestroy` (`Subscription.unsubscribe()`, `takeUntil(this.destroy$)`, or the `async` pipe) so a callback never fires against a destroyed component instance. Never shadow an outer-scope variable name inside a nested/chained API-call callback — give inner-scope variables from chained calls distinct names.

### Testing Rules (MANDATORY — every story)
- **TESTS AFTER IMPLEMENTATION, SAME RUN**: once the story's implementation is complete, ALWAYS execute Steps 11a, 11a.5, 11b, 11c, 11c.5, 11c.6, 11c.7 and 11d, in that order, before the story is announced complete. The coverage minimum, its measurement, the status vocabulary and the evidence are defined once, in Step 11a; the API contract tests once, in Step 11a.5; the static evals once, in Step 11c.5; the judge score checkpoint once, in Step 11c.6; the scorecard once, in Step 11c.7.
- **Proof is the actual tool output**, never a hand-written claim; every figure reported downstream matches the saved artifacts.
- **The story's manual test plan is checked for EVERY story** (Step 11d). `ve-implement` is invoked via the Skill tool in WORKFLOW MODE only to backfill a genuinely absent plan (which are skills and which are rule files: `workflows/dev-implement.md` Rule Details Loading).

### Automation Friendly Code Rules
When generating UI code (web, mobile, desktop), ensure elements are automation-friendly:
- Add `data-testid` attributes to interactive elements (buttons, inputs, links, forms)
- Use consistent naming: `{component}-{element-role}` (e.g., `login-form-submit-button`, `user-list-search-input`)
- Avoid dynamic or auto-generated IDs that change between renders
- Keep `data-testid` values stable across code changes (only change when element purpose changes)

## Completion Criteria
- Story Selection completed (Step 0) and the implemented story recorded in the Story Tracker
- Complete code generation plan created and announced
- All steps in the code generation plan marked [x]
- The selected story implemented according to plan
- Unit Test & Coverage gate passed (Step 11a): changed-line coverage ≥ 90%, all tests passing, proof saved to `reports/unit-test-evidence/<story-key>/`
- API contract tests passing for every endpoint the story added or changed, or `N/A` (Step 11a.5)
- Test placement verified (Step 11b) and full regression clean against the baseline (Step 11c)
- Static evals clean: zero NEW findings on changed files against the static baseline (Step 11c.5)
- Judge score checkpoint: J1 and J2 each at or above 0.85, or `N/A` with the reason (Step 11c.6)
- Eval scorecard written, verdict `PASS` (Step 11c.7)
- The story's manual test plan exists in its test-plan folder under `test-plans/` (Step 11d)
- Post-implementation Story Tracker update applied (status + timestamps)
- Deployment artifacts generated
- Story ready for build and verification
