# Dependency Graph Generation (Planning — immediately after User Stories)

**Purpose**: Analyse story dependencies. Each story gets a `requires` list; stories whose prerequisites are all merged into the Base Branch (the development branch — `common/tracker-sync.md` Section 4.1) have no dependencies on each other and can be implemented in parallel by different developers. `Requires` is stamped onto every story in the Story Tracker and in `stories.md`. The graph is shaped for the pod's `team_size` — the number of developers the user gave in User Stories Step 1 — and independent stories never touch the same file (R6 — a HARD constraint), so their PRs can never conflict.

**Always executes** right after User Stories. Produces `spec/plans/dependency-graph.yml` and records each story's `Requires` in the Story Tracker.

**This stage is also the single commit point for all Planning-phase story artifacts** — `stories.md`,
`personas.md` (both written by User Stories but left uncommitted until now) and `dependency-graph.yml`
(written here) are committed and pushed to the Epic branch (the docs branch) together, once, at Step 9 below. User
Stories itself performs no commit/push of its own.

## Execution Steps

1. **MANDATORY**: Log start of Dependency Graph stage in runtime-artifacts/audit.md
2. **Reuse `team_size` from `runtime-artifacts/aire-state.md`** — the pod size the user gave in User Stories Step 1. Do not ask it again here. The graph aims for at least `team_size` independent stories being available at any time where the architecture allows, so no developer is idle waiting on another's in-progress work. If the value is missing from state (a project that predates the question), ask it now with the User Stories Step 1 question, once, record it and continue.
3. **Determine story dependencies —  AUTOMATIC, INFERRED. Do NOT ask the user.** For each story, derive its `requires` from the approved story set itself: the acceptance criteria, each story's `**Touches**:` line, the files/components each story creates vs consumes, and the TRUE-PARALLELISM RULES below (R1 seed files, R2 compile/runtime need, R3 mocks, R4 no narrative chains, R5 parallelism target, R6 conflict-free independence — HARD). Every inferred edge MUST be justifiable in one line ("1.3 requires 1.1 — needs the `User` entity to exist at compile time"; an R6 edge reads "1.4 requires 1.2 — conflict: both touch `src/routes.ts`"); record that justification per edge in the `## Dependency Graph` section so the user can audit the reasoning in the announcement. Never ask "which stories must be merged before Story N.M?" — the stories were just generated, approved at the Story Set Approval, and pushed to Azure DevOps Boards, and they contain everything needed to infer this.
3.5. **R6 check (MANDATORY — silent and blocking)**: run the R6 plan-time check (Section "R6 — Conflict-Free Independence" below) over the complete graph. The stage does not complete while any two independent stories share a touched path.
3.6. **Shape the graph for the pod**: compute the waves (stories grouped by dependency depth — wave 1 has no prerequisites; wave k needs only stories from earlier waves) and the lanes (a suggested split of the stories across `dev-1` … `dev-<team_size>`: fill each wave's stories into the lanes in story-ID order, keeping a story in the same lane as the prerequisite it extends when that keeps the lanes even). Lanes are a suggestion for the pod — any developer may pick any ready story; the Doability Gate is what enforces readiness. Record the maximum parallel width (the largest wave); when it is below `team_size`, name the edges (true dependencies or R6 conflict edges) that limit it.
4. **Update every story** in `spec/plans/stories.md` and the Story Tracker in `runtime-artifacts/aire-state.md` with its `Requires` list
5. **Write `spec/plans/dependency-graph.yml`** (see schema below)
6. **Add `## Dependency Graph` section to `runtime-artifacts/aire-state.md`** containing:
   - Mermaid `graph TD` of the dependency chain
   - Ready-stories summary: which stories have no prerequisites and can start immediately, and which are blocked by what
   - The waves and the suggested lanes (one row per developer)

7. **Announce and proceed —  AUTOMATIC, no approval gate.** The graph is derived from the generated story set, and it is enforced later by live machine gates (`dev-implement`'s Doability Gate, the branch-cut dependency-merge check, and the R6 build-time check), so a wrong edge cannot silently cause bad work — it surfaces at story pick or before the PR. Show the graph and summary as an **announcement**:
   ```
    Dependency Graph complete (auto-generated — no approval needed).
   - Total stories: K  |  Immediately startable (no prerequisites): M
   - Pod size (team_size): N  |  Max parallel width: W  [if W < N: limited by <edges>]
   - Conflict-free (R6): independent stories share no file — S shared paths ordered by R6 edges
   - Waves: 1: [ids] · 2: [ids] · …
   - Suggested lanes: dev-1: [ids] · dev-2: [ids] · …
   - Inferred edges: [story → requires, with the one-line justification for each]

   Proceeding to Workflow Planning. (Tell me any time if an edge is wrong and I'll revise the graph.)
   ```
   **Do NOT ask "Proceed? (yes / revise graph)" and do NOT block.** If the user volunteers a correction, apply it and re-announce — that is an interrupt, not a gate.
8. **MANDATORY**: Log in runtime-artifacts/audit.md that the graph was generated and auto-approved, with the complete inferred edge list + justifications; log verbatim any correction the user volunteers afterwards

## Step 9: Epic Branch Commit & Push (MANDATORY — immediately after the Dependency Graph is generated)

**Runs automatically, no gate, right after Step 8's log entry, for both greenfield and brownfield
work.** The epic branch was already created at
workflow start (Workspace Detection Step 4.5 → `common/branching-strategy.md` Section 1) — do NOT
create a new branch here. This is the single commit point for `stories.md`, `personas.md` and
`dependency-graph.yml` — none of these three files are committed anywhere before this step.

1. Confirm the active branch is the Epic Branch recorded in `runtime-artifacts/aire-state.md`
   `## Branching` (`git branch --show-current`); switch to it if not.
2. Stage and commit exactly: `spec/plans/stories.md`, `spec/plans/personas.md`,
   `spec/plans/dependency-graph.yml`, `runtime-artifacts/aire-state.md`, `runtime-artifacts/audit.md`.
   Commit message trailer carries `AIRE-Version: [N]` ([N] read live from CLAUDE.md).
3. Push the epic branch to origin (`git push origin <epic-branch>`). **Do NOT raise an Epic → Base
   PR at this point.** The Epic PR is raised by `archive-epic` at the end of the cycle
   (`common/branching-strategy.md` Section 2). No PR is opened here.
4. Log in `runtime-artifacts/audit.md`: commit hash and push confirmation, with an ISO 8601 timestamp.
5. If the push fails, tell the user to push manually — do not silently continue with unpushed commits.
6. Then proceed to the Workflow Planning stage (remaining on the epic branch).

## TRUE-PARALLELISM RULES (apply when computing `requires`)

- **R1 Seed story**: If a file doesn't exist yet and is needed by 2+ stories, one seed story must create it first; all others `requires` that seed — prevents unmergeable git conflicts
- **R2 Contract rule**: A story only `requires` another when it needs that story's code to exist at compile/run time, not merely its API shape
- **R3 Mock rule**: A frontend/consumer story MAY drop a `requires` edge when its tests use mocks/stubs AND a separate integration story verifies real wiring
- **R4 No artificial chains**: Don't add `requires` for narrative ordering — only for genuine runtime/compile-time dependencies
- **R5 Parallelism target**: Aim for at least `team_size` independent stories being available at any time where the architecture allows — never at the cost of R6
- **R6 Conflict-free independence (HARD)**: two stories with no `requires` path between them never touch the same file — full rules below

## R6 — Conflict-Free Independence (HARD constraint — single home)

**Two stories are *independent* when neither reaches the other through `requires` (directly or
transitively). Independent stories may be built and opened as PRs at the same time, so they MUST NOT
create, modify, delete or rename the same file.** "Different lines of the same file" is still an
overlap — never rely on git merging it cleanly. This rule outranks R5: a narrower graph is acceptable,
a conflicting one is not.

**Touch sets.** Every story carries a `**Touches**:` line in `stories.md` and a `touches` list in
`dependency-graph.yml`: the repository paths it will create, modify, delete or rename — application
code, its unit and API contract tests, and every shared file the change needs. A directory glob is allowed only when the
story owns everything under it (e.g. a new module folder). Paths owned by one story by construction
never count as overlaps: its fragment `runtime-artifacts/stories/<key>/`, its evidence under
`reports/**/<key>…`, its plan `spec/spec-generation/story-<N.M>-…` and its test plan
`test-plans/<cycle>/<TICKET-ID>-…/` (never in a story's PR — it rides the cycle's `[TEST]` PR).

**Shared hotspots — name them explicitly in `touches`, they are where parallel PRs collide**: dependency
manifests and lockfiles, route / DI / plugin registration tables, barrel or index exports, migration
files and their index, shared configuration and environment files, shared schema / type / constant
files, shared test helpers and fixtures, i18n bundles, and for mid-epic change stories
`spec/plans/stories.md` and `spec/plans/requirements.md`.

**Plan-time check (Dependency Graph Step 3.5; re-run at the STOP CHECKPOINT and whenever a story is
added mid-epic):**
1. For every pair of independent stories, intersect their `touches` (a glob overlaps every path under
   it).
2. Resolve each overlap — in User Stories Part 2, before the Story Set Approval, prefer extracting
   the shared mechanical edit (adding the cycle's new third-party dependencies, registering routes,
   exporting symbols, adding config keys, a migration index entry) into ONE foundation story that both
   stories then require (R1). After the Story Set Approval the story scopes are fixed, so this stage
   only **orders**: add a `requires` edge so the overlapping stories can never be open at the same time
   — the story that consumes or extends the other's change requires it; when neither does, the higher
   story ID requires the lower.
3. Re-run until no two independent stories share a path. List every shared path with the stories that
   touch it under `shared_files` (each pair now ordered).
4. Log the overlaps found and the extraction or edge applied for each.

**STOP CHECKPOINT re-check.** The touch sets written during planning are predicted from the stories and
the existing code. Once `architecture.md` is written (STOP CHECKPOINT Step 1.1), refine every story's
`touches` to the concrete paths of the component layout, re-run the plan-time check, add any new R6
edges, and update `dependency-graph.yml`, the `Requires` column and `stories.md` — in the design commit.
Announce the edges added (`R6 re-check: 2 new edges — 2.3 requires 2.1 (src/app.module.ts) …`).

**Build-time check (R6-B — `dev-implement` Section D Step 2.5; also before every `pr-fix` commit and
right after every story PR is raised).** The predicted sets can miss a file, so the real diff is
checked before any PR can exist:
1. `git fetch origin`, then the changed set `C = git diff --name-only <merge-base with
   origin/<base-branch>>..HEAD` plus uncommitted changes, minus the story-owned paths above.
2. Collect every story independent of this one that is not yet MERGED (`common/repo-host.md`
   RH-2) from the resolved graph (`dependency-graph.yml` + every fragment's `## Dependency Graph
   Additions`). Its footprint is its `touches` plus, when it has an open PR, that PR's changed files
   (RH-1, RH-6).
3. **No overlap** → record `R6 build check: clean` with `C`, and add any path of `C` missing from this
   story's `touches` to the fragment's `## Dependency Graph Additions` (touch additions). Continue.
4. **Overlap with a story that has not started** (`ToDo`, no branch on origin, no PR)
   → add the edge `<that story> requires <this story>` to this story's `## Dependency Graph Additions`,
   announce it, and continue — that story now waits for this PR to merge.
5. **Overlap with a story already in flight** (`In Progress`, a branch on origin, or an open PR) →
   do NOT commit, push or raise the PR. Add the edge `<this story> requires <that story>` to the
   fragment, record `HALTED — R6 conflict with Story X.Y on <paths>` in `## Progress`, and stop with:
   ```
    Story N.M cannot raise its PR yet — it changes files that Story X.Y (in flight, PR <ref>) also changes:
      <paths>
    Independent stories must never conflict. Get Story X.Y's PR approved and merged into <base> first,
    then type dev-implement to resume — the pull-before-push merge brings Story X.Y in before this PR opens.
   ```
   On resume (`dev-implement` Step 1.8) the run restarts at Section D Step 2.5 once Story X.Y is MERGED.
6. **Right after the PR is raised**, re-run steps 1–2 against open PRs only. If an independent story's
   PR that overlaps was opened in the meantime, record the edge `<later PR's story> requires <earlier
   PR's story>`, post a PR-level comment on the later PR (`common/repo-host.md` RH-8) naming the PR that
   must merge first, and say so in the handoff.

A story whose path overlaps only with stories that are already MERGED is not a conflict — the
pull-before-push merge (`dev-implement` Section D Step 4) brings their changes in before the PR opens.

## `spec/plans/dependency-graph.yml` Schema

```yaml
version: 1
generated_at: YYYY-MM-DD
team_size: 3              # the pod size given in User Stories Step 1
max_parallel_width: 3

shared_files:             # every path touched by 2+ stories — each pair is ordered by requires (R6)
  - path: package.json
    stories: ["1.1", "2.1"]   # 2.1 requires 1.1
  - path: src/routes.ts
    stories: ["1.2", "1.4"]   # 1.4 requires 1.2 (R6 edge)

waves:                    # stories startable together once every earlier wave has merged
  - ["1.1"]
  - ["1.2", "1.3", "2.1"]

lanes:                    # suggested split across the pod — one developer per lane, top to bottom
  dev-1: ["1.1", "1.2"]
  dev-2: ["1.3"]
  dev-3: ["2.1"]

stories:
  - id: "1.1"
    title: Story title
    tracker_id: "4821"    # the ADO work item ID from the tracker push (Part 3 of User Stories)
    requires: []          # story IDs that must be merged before this starts
    enables: ["1.2"]      # reverse edges (informational only)
    touches:              # paths this story creates, modifies, deletes or renames (R6)
      - package.json
      - src/users/user.entity.ts
      - tests/unit/users/user.entity.test.ts
```

## Story Tracker Table Format

Create/update in `runtime-artifacts/aire-state.md` under `## Story Tracker` after this stage:

| Story | Title   | Requires | Tracker ID | Status         | PR         | Merged | Start      | End        | Recorded           |
|-------|---------|----------|------------|----------------|------------|--------|------------|------------|--------------------|
| 1.1   | [Title] | none     | —          | ToDo           | —          | —      |            |            | [YYYY-MM-DD HH:MM] |

- **Status**: one of the canonical statuses in `common/status-model.md` Section 1 — stories `ToDo`, `In Progress`, `Ready for Testing`, `In Testing`, `Bug fixing`, `Closed`; a bug row uses the bug set. Moves made on the board are brought in by the live read (`common/status-model.md` Section 6).
- **Requires**: Assigned by this Dependency Graph stage.
- **Tracker ID**: Populated from Part 3 of User Stories (the tracker push; each pushed story is linked to the Parent Epic in `## Tracker`). The value is the story's ADO work item ID (e.g. `4821`).
- **PR**: The story's Pull Request URL, recorded by `dev-implement` when the PR is raised (Section D). `—` until a PR exists.
- **Merged**: `no` once the PR is raised, `yes` once the PR is confirmed merged into the Base Branch (checked live via `common/repo-host.md` RH-2 — `common/tracker-sync.md` Section 4.1), `—` before a PR exists. Merge state is never inferred from `Status`.
- **Start**: Timestamp when the story is claimed (`ToDo → In Progress`).
- **End**: Timestamp when the story moves to `Closed` (set by `ve-list-work` Option B when the Verification Engineer approves it).
- **Recorded**: Timestamp of the last tracker update for this row.
