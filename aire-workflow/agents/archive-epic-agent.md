# Archive Epic Agent — Close a Release Cycle (Epic, Bug, or Enhancement)

## Bug /  Enhancement Mode (read this first)

This agent closes epic cycles, bug cycles (`Workflow Type: bug` in `runtime-artifacts/aire-state.md` `## Tracker`, produced by `bug-fix`/`bug-fix-implement`), AND enhancement cycles (`Workflow Type: enhancement`, produced by `enhancement-implement`). The steps below are written in epic terms; in bug or enhancement mode apply these substitutions everywhere:
- **Cycle ID** = the ticket's work item ID (`Parent Ticket`, e.g. `4840`); cycle name = the ticket title. Wherever the steps say `<EPIC-ID>`/`<epic-name-slug>`, use the ticket ID and its slug.
- **Archive path**: epic cycles archive to `aire-archives/epics/<EPIC-ID>-<epic-name-slug>/`; bug cycles to `aire-archives/bugs/<BUG-ID>-<ticket-name-slug>/`; enhancement cycles to `aire-archives/enhancements/<ENH-ID>-<ticket-name-slug>/`. Wherever the steps say `aire-archives/<EPIC-ID>-<epic-name-slug>/`, read the type-appropriate subfolder path. Never write archives directly under `aire-archives/` — always inside `epics/`, `bugs/`, or `enhancements/`.
- **Invocation mode**: in epic mode the operator runs it once every story is `Closed` (`ve-list-work`'s closing handoff points here) — Step 6.5 then raises the `[EPIC]` PR — and pr-generator still auto-triggers it when an Epic → Base PR is raised by hand. **Bug and enhancement cycles are ALWAYS operator-invoked (manual)**: `bug-fix-implement` (Step 12) and `enhancement-implement` (Step 19) deliberately do NOT invoke this skill, and pr-generator's Phase 7 auto-trigger explicitly excludes `[BUG]`/`[ENH]` → Base PRs. The invocation mode changes who starts the run and which readiness checks apply — it does NOT change Step 6 or Step 6.5, which are automatic in every mode.
  - **Why bug/enhancement archives are manual**: Verification Engineer work lands on the cycle branch on its own schedule and is not synchronised with the `[BUG]`/`[ENH]` PR — any `ve-list-work` Option C amendment to the test plan, and any optional `/ve-implement` rework on its own `ve/...` branch + PR, can land *after* the fix is done. The test plan reaches the Base Branch only on that cycle PR (`common/branching-strategy.md` Section 7.4), and this skill's close commit rides the same PR, so an archive taken automatically at PR time could close the cycle before that work has landed. The operator archives once everything has landed — see Step 2.5's readiness check.
- **Release Readiness (Step 2) in bug/enhancement mode**: the ticket's status is NOT a criterion here. The Verification Engineer tests the fix on the DEV environment only after the `[BUG]`/`[ENH]` PR has merged and been deployed (`common/status-model.md` B7–B9, S4–S8) — which is after this archive, because the archive has to ride that PR. The ticket is normally still `Active` (bug) or `In Progress` (enhancement) here; its later moves are made on the board and with `ve-list-work`, tracker-side, after the merge. What this step checks instead:
  - Verify the `[BUG]` / `[ENH]` PR has been raised and is still open (the PR in the ticket's resolved Story Tracker row, or live via `common/repo-host.md` RH-1 — source `<cycle-branch>`) — it must NOT be merged yet, because this skill's cycle-close commit has to ride it to the base branch. If the PR is already merged, warn loudly: the cycle-close commit will not reach the base branch.

You are a release manager closing a release cycle. You will:
1. **Generate the cycle's reverse-engineering delta** into `spec/plans/delta/<CYCLE-ID>-<slug>/` — the
   change record: what this cycle actually changed about the system, with a path-level evidence table
   and the problems it resolved (Step 3)
2. **Archive** the complete `spec/` (the delta included) + `reports/` + the root `runtime-artifacts/`
   state files (`audit.md`, `aire-state.md`) into a cycle-named archive folder
3. **Delete the live `spec/`, `reports/` and `runtime-artifacts/` trees entirely** — the archive is now
   the only copy, and it is the copy everything downstream reads

**This skill generates the delta and archives it; it NEVER publishes anything.** Refreshing the
deep dive document on Atlas via the Helix MCP belongs to the `stitch-delta` skill
(`agents/stitch-delta-agent.md`), which runs on the base branch after this cycle's PR has merged,
reads this delta out of the archive this skill just created, and refreshes the deep dive against the
merged code — every section, not only the areas this delta names.

That split is what makes the whole flow conflict-free. Because `spec/` is deleted here, in the cycle's
own PR, base carries no `spec/` between cycles: the next cycle inherits nothing, rebuilds `spec/` from
Atlas truth, and contributes back only additions under its own unique
`aire-archives/<type>/<ID>-<slug>/` path. **Do not "helpfully" leave `atlas-deep-dive.md` or
`spec/plans/delta/` behind for the stitch** — a shared, per-cycle-rewritten file on base is the one
merge collision this flow must never have. The delta in the archive is what the stitch reads.

**Where this skill stops to ask, and where it does not.** The gates are all upstream, about whether the cycle is ready to be captured: Step 2 (epic mode: stories or bugs not yet `Closed`, or story PRs not yet merged into the Base Branch), Step 2.5 (a test plan missing, or a Verification Engineer or `[TEST]` PR still open) and Step 5's same-name archive collision. Everything downstream of a verified archive is AUTOMATIC and asks nothing — the removal of the live trees (Step 6), the commit, the push and the PR (Step 6.5). The archive's byte-for-byte verification IS the safety gate; a confirmation prompt on top of a proven copy adds no safety and stalls the close. NEVER delete anything before the archive copy is verified.

---

## Step 0: Load the Source Rules

**MANDATORY**: Read and load `common/content-validation.md` (content validation for any generated documents).

---

## Step 1: Preconditions & Epic Identification

0. **Get onto the docs branch.** Epic mode runs on the epic branch, which carries only documents
   (`common/branching-strategy.md`). When `.aire-docs/` holds it in this clone, run every step of this
   skill inside `.aire-docs/` (git allows the branch in one worktree only); otherwise check the epic
   branch out. Bug/enhancement mode runs on the bug/enhancement branch as before.
1. Verify `runtime-artifacts/aire-state.md` exists. If not, STOP. **Already-archived guard (runs
   first, in every mode, however this skill was started)**: when the branch has no live
   `runtime-artifacts/` but already holds a cycle archive this branch added
   (`git diff --name-only --diff-filter=A origin/<base-branch>...HEAD -- aire-archives/` lists an
   `aire-archives/<type>/<ID>-<slug>/archive-manifest.md`), the cycle is already closed — report
   ` Cycle <ID> is already archived on <branch> (aire-archives/<type>/<ID>-<slug>/); its PR: <URL from RH-1>.`
   and STOP with nothing written. Otherwise tell the user there is no active AIRE project to archive.
   This is what keeps a second trigger — a pr-generator auto-trigger after this skill already raised
   the `[EPIC]` PR, or a manual re-run — from archiving twice.
2. Resolve the **cycle type and ID**:
   - Read `## Tracker` in `runtime-artifacts/aire-state.md`. `Workflow Type: bug` → bug mode; `Workflow Type: enhancement` → enhancement mode (both: Cycle ID = `Parent Ticket`, name from the ticket title / `spec/plans/bug-brief.md` / `spec/plans/enhancement-brief.md`); otherwise epic mode (Cycle ID = `Parent Epic`, name from `epic-brief.md`).
   - Fallback: ask the user:
     ```
      Which Epic, Bug, or Enhancement ticket does this release cycle belong to?
        Provide the ID and name (e.g., "4800, User Authentication",
        "4840, Login timeout (bug)" or "4850, Export to CSV (enhancement)").

     [Answer]:
     ```
3. Derive the archive folder: `aire-archives/epics/<EPIC-ID>-<epic-name-slug>/` (epic mode), `aire-archives/bugs/<BUG-ID>-<ticket-name-slug>/` (bug mode), or `aire-archives/enhancements/<ENH-ID>-<ticket-name-slug>/` (enhancement mode) — kebab-case the name (e.g., `4800-user-authentication`, `4850-export-to-csv`).
4. **MANDATORY**: Log the invocation in `runtime-artifacts/audit.md` (append-only, complete raw input).

---

## Step 2: Release Readiness Check

Read the resolved Story Tracker — the shared `## Story Tracker` in `runtime-artifacts/aire-state.md` combined with every `runtime-artifacts/stories/*/state.md` fragment (`common/parallel-work-state.md` Section 4), so change stories and bugfix stories that exist only in fragments are counted (Step 4 later writes the same resolved table into the shared file):
- **Bug/enhancement mode**: apply the readiness rules above (PR raised and still open; status is not a criterion) and skip the rest of this step.
- **Epic mode** — the cycle is ready when every story and every bug of the cycle is `Closed`,
  read live from the board (`common/status-model.md` Section 6), and every story's PR is MERGED into the Base Branch (`common/repo-host.md` RH-2 —
  `common/tracker-sync.md` Section 4.1). Bugs are the bug rows of the resolved Story Tracker plus the
  bugs linked to the cycle's stories on the tracker. If anything falls short, present it and ask:
  ```
   The cycle is not fully closed:
     • Not Closed: [Story 1.2 (4822) — In Testing, 4841 (bug) — Resolved, …]
     • Story PR not merged into <base-branch>: [Story 2.1 — !34 OPEN, …]

  Archive anyway? (yes / no)
  ```
- Block until the user answers. Log the answer in runtime-artifacts/audit.md. On "no", STOP.
- On "yes", every story whose PR is not MERGED into the Base Branch — still open, or merged into
  another branch — is **Not on Base Branch**: its code is not on base, so no stitch can describe it.
  It is left out of the delta's Changed Surfaces and named in the delta's Notes (Step 3.1) and the
  manifest (Step 5.4), so `stitch-delta` / `stitch-delta-local` can tell the reader what is missing.

### Step 2.5: Test Plan Readiness Check (MANDATORY — the close is one-shot)

The test plans are not archived — they stay on the Base Branch under `test-plans/`
(`common/branching-strategy.md` Section 7.5). What the close can lose is a plan that never reached it.
Before archiving, verify every plan has landed. Never skip this check, in any mode (it is the reason
bug/enhancement archives are manual).

1. **Pull the branch first**: confirm the current branch is the cycle branch (epic mode: the epic branch, in `.aire-docs/` when it is checked out there) and is up to date with origin (`git fetch origin && git status -sb`). If it is behind, run automatic `git pull --ff-only`.
2. **Check for the expected test plans** (paths per `common/branching-strategy.md` Section 7.1, read per Section 7.3):
   - **Epic mode**: every story's plan is on `origin/<base>` under the recorded Test Plan Folder, and no `[TEST]` PR of this cycle is still open (RH-1 by branch prefix `test-plans/<cycle>`).
   - **Bug/enhancement mode**: the ticket's plan is in the Test Plan Folder on this cycle branch, and no `ve/…` PR into `<cycle-branch>` is still open (RH-1 — open PRs with target `<cycle-branch>`).
3. If any expected plan is missing, or one of those PRs is still open, warn and ask — do NOT archive silently:
   ```
    Test plans look incomplete for this cycle:
      • Missing test plan for: [list of tickets/stories]
      • Open test-plan PR(s) not yet merged: [list with URLs]

   Closing now leaves these out of the cycle — the close is one-shot. Recommended: get the
   PR(s) merged, `git pull --ff-only` on <cycle-branch>, then re-run archive-epic.

   Archive anyway? (yes — archive incomplete / no — stop so I can merge the Verification Engineer work)
   ```
   Block until answered. On no, STOP (nothing written). On yes, proceed and record the omission explicitly in runtime-artifacts/audit.md AND in the Step 5.4 `archive-manifest.md` as a `**Known Gaps**:` line naming exactly what was missing.
4. Log the check — plans found, PRs inspected, and the user's raw answer — in runtime-artifacts/audit.md.

---

## Step 3: Generate the Reverse-Engineering Delta (MANDATORY — before the archive copy)

**This step is the single source of truth for the delta format.** `stitch-delta`
(`agents/stitch-delta-agent.md`) reads this schema to apply the delta — locally and to Atlas. Never
change the shape here without updating that agent.

**Runs AFTER the readiness checks and BEFORE the Step 5 archive copy**, so the delta is itself
captured in the archive.

**Output**: `spec/plans/delta/<CYCLE-ID>-<slug>/delta.md` — same `<CYCLE-ID>-<slug>` as the archive
folder (`4800-payment-portal`, `4840-login-timeout`, …). One folder per cycle, so several
pending deltas from parallel cycles never collide.

### 3.1 Inputs — what the delta is derived FROM

Read all of these; the delta is assembled from them, never invented:

| Input | Contributes |
|---|---|
| `spec/plans/atlas-deep-dive.md` | The deep dive as it stands, so the delta can name areas and resolved findings **the way the document names them**. It is NOT a patch target — `stitch-delta` refreshes it from the merged code. |
| `spec/plans/architecture.md` — especially **Section 9 Delta from the Existing System** and Section 2 Component Inventory | The intended change, already approved |
| Bug/enhancement mode: `git diff --name-status <cycle-base-sha>...HEAD` and `git log --oneline <cycle-base-sha>..HEAD`. **Epic mode**: the epic branch carries no code, so read every story PR of the resolved Story Tracker instead — its changed files (`common/repo-host.md` RH-6) and its merge commit into the Base Branch (RH-2); the commit range is `<cycle-base-sha>..<last story merge sha>` on `<base-branch>`, with the story PRs listed. Only story PRs MERGED into the Base Branch contribute; each **Not on Base Branch** story (Step 2) gets a Notes line instead — `Not on Base Branch: Story <N.M> — <PR URL> (<open \| merged into <branch>>)` | What actually shipped — the **commit range** recorded in the ledger |
| `reports/ticket-summary/` | Per-story summaries of what each bug fix / enhancement changed |
| `spec/plans/requirements.md`, `stories.md` | Why it changed — the Summary's narrative |

**Describe what MERGED, not what was planned.** Where `architecture.md` and the real diff disagree,
the diff wins and the discrepancy is noted in the delta's Notes section.

### 3.2 `delta.md` — required structure

The delta is the cycle's **change record**: what shipped, with evidence, and why. It is not a
patch script for the deep dive — `stitch-delta` derives the document's new content from the **merged
code**, using this file for the narrative, the traceability and as a hint about which areas moved.

````markdown
# RE Delta — <CYCLE-ID> <cycle name>

> **Cycle**: <epic | bug | enhancement> · <CYCLE-ID>
> **Branch**: <cycle branch> → <base branch>
> **Commit range**: <base-sha>..<head-sha>
> **Generated**: <ISO 8601, from a real clock>
> **AIRE**: v<N>

## Summary
<3–6 lines: what this cycle changed about the SYSTEM — components, contracts, data, dependencies,
 structure. Not a changelog of stories.>

## Changed Surfaces
<The evidence table. One row per real change, each with a path a reader can open.>

| Surface | Change | Evidence |
|---|---|---|
| `src/organization/` | new module — org hierarchy CRUD + membership | `src/organization/` (14 files) |
| `src/team/`, `src/admin/` | new modules | `src/team/`, `src/admin/` |
| `scripts/seed.ts` | new dev seeding script | `scripts/seed.ts` |
| POST /orgs/{id}/members | new endpoint | `src/organization/routes.ts:88` |
| `organizations`, `org_members` | new tables + FKs | `migrations/0007_org.sql` |
| `@casl/ability` | new dependency (authz) | `package.json` |

## Impacted Deep-Dive Areas
<A HINT, explicitly NON-EXHAUSTIVE. Name the deep-dive areas this cycle plainly affects, so the
 refresh has a starting point. `stitch-delta` still checks EVERY section against the code and is
 never limited to this list — an area missing here is a hint that was not written, never permission
 to leave a section stale.>

- Directory Structure · Comprehensive Statistics · Entry Points · Component Catalog
- Internal Dependencies + Coupling · Database Analysis · Test Coverage
- Security → Authorization · Appendix A (File Inventory) · Appendix B (Dependency List)

## Resolved
<Anything the deep dive currently records as a problem that this cycle FIXED — an anti-pattern, a
 debt item, an open recommendation, a security finding. Name it as the document names it, so the
 refresh can strike or update it rather than leaving a resolved issue on the record.>

| Recorded as | Section | How this cycle resolved it |
|---|---|---|
| "No role model — every authenticated user is an admin" | Security → Authorization | RBAC via `@casl/ability`, enforced in `src/admin/guard.ts` |

## Notes
<Anything a human must know: plan-vs-shipped discrepancies, a capability shipped behind a flag, a
 change deliberately NOT reflected in the system's public behaviour.>
````

### 3.3 Content rules

- **Describe what MERGED, not what was planned.** Where `architecture.md` and the real diff disagree,
  the diff wins and the discrepancy goes in Notes.
- **Every Changed Surfaces row cites a real path** — a file, directory or `file:line` a reader can open.
  A row without evidence is a claim, and the refresh cannot verify a claim.
- **`Impacted Deep-Dive Areas` is a hint, never a contract.** Write it to help, not to bound. Never
  phrase it as "the sections to update" — that framing is exactly what once left `### Directory
  Structure` describing a codebase that no longer existed.
- **`Resolved` is what makes the document stop carrying fixed problems.** A deep dive that still lists a
  resolved anti-pattern is as wrong as one missing a new module; this table is the only place the cycle
  can say "this is no longer true".
- **No anchors, no find/replace payloads, no directive ordering.** Literal `old_string`/`new_string`
  pairs would make the delta a fragile patch whose coverage silently becomes the document's accuracy
  ceiling. The refresh reads the code.

### 3.4 When the cycle changed nothing describable

A cycle that changed no externally describable system surface (a docs-only fix, a test-only change)
still gets a `delta.md` — with a Summary saying so and an explicitly empty Changed Surfaces table:

```markdown
## Changed Surfaces
None — this cycle changed no component, contract, data model, dependency or structure described by the
deep dive.
```

Never skip the file. `stitch-delta` still ledgers it (and still re-verifies the document against the
code, which is how drift from any source gets caught).
### 3.5 Do NOT touch the stitch ledger

`aire-archives/stitch-ledger.md` is written only by `stitch-delta`, and only after a delta's Atlas
write has verified. This skill writes no row of any kind — not a pending one, not a placeholder.

**A delta is pending precisely because it has no ledger row.** Absence is the signal. That is what keeps
the ledger strictly append-only. A pending row that a later run had to *edit into* a stitched row would
turn a one-line append into a read-modify-write on a shared file — reintroducing exactly the collision
this design removes. (`stitch-delta` additionally refuses to start while a stitch PR is open, so the
ledger is only ever written by one run at a time.)

### 3.6 Verify and log

- Validate `delta.md` per `common/content-validation.md`.
- Confirm every Changed Surfaces row cites a path that actually exists in the merged tree — a claim with
  no evidence is fixed now, not discovered by `stitch-delta` on base. Epic mode: the merged tree is
  `origin/<base-branch>` (`git cat-file -e origin/<base-branch>:<path>`), not this docs-only branch.
  A path missing there because its story is Not on Base Branch is not a Changed Surfaces row — its
  story's Notes line covers it.
- Announce: the delta path, the Changed Surfaces count, and the commit range.
- Log all of it in `runtime-artifacts/audit.md` (still live at this point).

---

## Step 4: Fold the Story State and Audit Fragments (MANDATORY — before the archive copy)

Story runs (`dev-implement`, `epic-enhancement`, `epic-bugfix`, `pr-fix`, `bug-fix-implement`,
`enhancement-implement` Phase B, `ve-implement` standalone) never write the shared bookkeeping files —
they write `runtime-artifacts/stories/<story-key>/audit.md` and `state.md`
(`common/parallel-work-state.md`). Fold them now so the archived `aire-state.md` and `audit.md` are the
complete record on their own:

1. If `runtime-artifacts/stories/` is absent or empty, log "no story fragments to fold" and go to
   Step 5.
2. **Story Tracker**: compute the resolved table (`common/parallel-work-state.md` Section 4 — later
   `Recorded` wins per row, then the more advanced status; fragment-only rows appended; any
   `PR: pending` / `Merged: no` resolved live from the story's branch) and write it over the shared
   `## Story Tracker`.
3. **Union sections**: append every fragment's `## PR Feedback Rounds`, `## Defect Provenance Log`,
   `## Dependency Graph Additions` and `## Change Request Additions` rows to the shared sections of the
   same name (creating them if absent), de-duplicated on identical rows; regenerate the shared
   `## Dependency Graph` Mermaid from `spec/plans/dependency-graph.yml` plus the additions.
   `## Change Request Additions` (written by `epic-change-request`) carries the cycle's requirement
   version history — REQ-ID, version transition and class per amendment. It must survive into the
   archive: it is the only record of *why* a requirement reads as it does, and the delta and Atlas
   stitch are built from the archive.
4. **Audit**: append to the END of the shared `runtime-artifacts/audit.md` a section
   `## Story Audit Trails (folded at cycle close)` with one `### <story-key>` sub-heading per fragment
   (sorted by story key) and that fragment's entries verbatim, in timestamp order. Append-only — nothing
   already in the shared file is rewritten.
5. Leave the fragment files in place: Step 5 archives them with everything else, as the unmerged
   originals.
6. Log the fold (fragments folded, rows resolved, entries appended) in the shared `audit.md`.
7. **Atlas Artifact Sync — final pass** (only when `## Atlas Artifact Sync` records `Enabled: Yes`):
   run `common/atlas-artifact-sync.md` Section 6 now, after the fold and before the Step 5 copy, so
   Atlas receives the folded state and audit and the map update is archived with them. A sync failure
   is recorded as Pending and never blocks the archive.

---

## Step 5: Create the Epic Archive

**Path rule for this step and every step after it**: wherever the text below writes a shorthand archive path like `aire-archives/<EPIC-ID>-<epic-name-slug>/`, the REAL path ALWAYS includes the cycle-type subfolder resolved in Step 1.3 — `aire-archives/epics/<EPIC-ID>-<slug>/`, `aire-archives/bugs/<BUG-ID>-<slug>/`, or `aire-archives/enhancements/<ENH-ID>-<slug>/`. Nothing is ever written directly under `aire-archives/`.

1. Append a final audit entry to `runtime-artifacts/audit.md` recording the archive event (epic, timestamp, archive path) — do this BEFORE copying, so the archive carries the complete trail.
2. Create the archive folder resolved in Step 1.3 — `aire-archives/epics/<EPIC-ID>-<epic-name-slug>/`, `aire-archives/bugs/<BUG-ID>-<slug>/`, or `aire-archives/enhancements/<ENH-ID>-<slug>/` — at the workspace root (create the `epics/`/`bugs/`/`enhancements/` subfolder if missing).
   - **If `aire-archives/` (or its subfolders) already exist**: reuse them as-is. NEVER recreate them, and NEVER touch, replace, or delete any OTHER cycle folder inside them — only the folder for THIS cycle is ever written.
   - **If a folder with this exact epic name already exists** inside `aire-archives/`, do NOT silently overwrite — ask:
     ```
      Archive folder aire-archives/<EPIC-ID>-<epic-name-slug>/ already exists.

     Replace it with a fresh archive from this run? (yes / no)
     ```
     - On **yes**: delete only that same-name epic folder and recreate it fresh from this run's `spec/`. All other epic folders remain untouched.
     - On **no**: STOP the archive step — do not write anything into `aire-archives/`. Log the decision in runtime-artifacts/audit.md.
   - Log the collision check and the user's raw answer in runtime-artifacts/audit.md.
3. **Copy the live `spec/` tree, the live `reports/` tree, AND the root `runtime-artifacts/` folder into the archive, each as ONE folder.** The archive is an exact mirror — three copy commands, no unpacking, no per-folder logic, no exclusions:
   ```bash
   ARCH="aire-archives/epics/<EPIC-ID>-<epic-name-slug>"   # or bugs/ | enhancements/
   mkdir -p "$ARCH"
   cp -R spec "$ARCH/spec"
   [ -d reports ] && cp -R reports "$ARCH/reports"                       # generated outputs — mirror if present
   [ -d runtime-artifacts ] && cp -R runtime-artifacts "$ARCH/runtime-artifacts"  # audit.md + aire-state.md
   ```
   Those copies carry everything the cycle was built from and produced:
   - `spec/` — `architecture.md` (`spec/plans/architecture.md`) and all flat docs under `spec/plans/` (requirements, stories, personas, the design docs, `dependency-graph.yml`, `atlas-deep-dive.md` and the flat RE docs), `spec/plans/delta/<CYCLE-ID>-<slug>/` (this cycle's Step 3 delta), `spec/spec-generation/`
   - `reports/` — the generated outputs: `unit-test-evidence/`, `api-contract-test-evidence/`, `eval-evidence/`, `reviews/`, `code-security-reviews/`, `ticket-summary/`, `pr-feedback/` (mirrored only when the live `reports/` folder exists)
   - `runtime-artifacts/` — the cycle's `audit.md` and `aire-state.md` (mirrored only when the live folder exists)
   - `spec/context-project/existing-knowledge/`, `spec/context-project/new-references/` and `spec/context-project/coding-guidelines/` — the human-authored inputs: the notes describing the existing system, the wireframes/specs/mockups that defined the target, and the team's coding guidelines

   **The test plans are not copied.** They live outside these trees, under `test-plans/` on the Base Branch, and stay there (`common/branching-strategy.md` Section 7.5). The manifest records their Test Plan Folder (Step 5.4).

   **Mirror each exactly — same folder name, same structure, same depth.** The archive contains `spec/`, and (when present) `reports/` and `runtime-artifacts/`, not a renamed or unpacked copy. Use `ls -a` to inspect it. Keeping the names identical is what makes the copy verifiable with a single diff and the restore path unambiguous.

   The copy is ALWAYS unfiltered — there are NO exclusions.
   - **Size**: `new-references/` can hold large binaries (mockups, PDFs, videos). Record the archive's total byte size in the manifest so growth stays visible. Do not filter it — an incomplete reference set is worse than a large one.
   - **GUARDRAIL — NEVER flatten**: do NOT copy any tree's *contents* into the archive folder root (never `cp -R spec/. "$ARCH/"` or `cp -R spec/* "$ARCH/"`). The archive folder must contain exactly `spec/`, `reports/` (when present), `runtime-artifacts/` (when present) and `archive-manifest.md` — never `requirements/`, `design/`, `aire-state.md` or `audit.md` sitting loose beside the manifest. Flattening instead of mirroring is the #1 cause of inconsistent archive layouts across cycles.
   - **GUARDRAIL — ARCHIVE EVERYTHING, for EVERY cycle type**: a complete, recursive, unfiltered copy — every folder and every file at every depth, whatever it is named and whoever produced it. **The cycle type only changes the destination subfolder (`epics/` | `bugs/` | `enhancements/`), never WHAT gets copied**: a bug cycle archives the same full tree an epic cycle does. There are NO exclusions in this skill.
     - **NEVER** archive a hand-picked subset, whitelist, or "the folders this cycle touched".
     - **NEVER** skip a folder for looking empty, unused, stale, irrelevant to this cycle type, produced by another role, or authored by a human rather than the framework (`existing-knowledge/`, `new-references/`). If it is inside `spec/`, it goes into the archive.
     - **NEVER** exclude dotfiles/dot-folders, hidden files, or files without a `.md` extension (logs, `.yml`, `.json`, coverage reports, images, binaries). Do not use extension- or name-based filters, and do not apply `.gitignore` rules — untracked and ignored files inside `spec/` are still archived. Use a plain recursive copy, never `git archive`, never a `find … -name '*.md'` loop.
     - **NEVER** move, delete, rewrite, truncate, reformat, summarize, or "tidy" anything while copying — the archive is a byte-for-byte snapshot, not a curated export.

4. Write `aire-archives/<type>/<CYCLE-ID>-<slug>/archive-manifest.md` (as a SIBLING of the `spec/` folder just created — NOT inside it):
   ```markdown
   # Cycle Archive Manifest
   - **Cycle**: [CYCLE-ID] — [Cycle name] ([epic | bug | enhancement])
   - **Archived**: [ISO timestamp]
   - **Stories**: [total] ([n] Closed, [n] other — list any not Closed; bug/enhancement mode: the ticket's status at archive time)
   - **Analyzed At Commit**: [SHA]
   - **Archived Files**: [N] files, [total size] (complete recursive mirror of `spec/` + `reports/` + `runtime-artifacts/`; verified equal to the live trees)
   - **Contents**: spec/ docs · reports/ outputs [present/absent] · runtime-artifacts/ state [present/absent] · context-project [present/absent] · new-references [present/absent, [size]] · coding-guidelines [present/absent, [N] files]
   - **Test Plans**: not archived — [N] story plan(s) ([list slugs]) stay on the Base Branch in `[Test Plan Folder]` (`common/branching-strategy.md` Section 7.5)
   - **Verification Engineer Artifacts**: [plans present: list |  Known Gaps: <what was missing / which test-plan PR was still open> — user chose to archive anyway at Step 2.5]
   - **Not on Base Branch**: [none | Story 2.1 — <PR URL> (open | merged into <branch>), …] — code the stitch cannot describe (Step 2)
   ```
5. **Verify the copy** — check BOTH of the following before proceeding; do NOT proceed until both pass:
   - **Structural check (layout guardrail)**: list the archive folder's immediate children (`ls -a aire-archives/epics/<EPIC-ID>-<epic-name-slug>/`) — it MUST contain EXACTLY `spec/`, `archive-manifest.md`, and (when the corresponding live folder exists) `reports/` and `runtime-artifacts/`. If any OTHER entry appears at this level (e.g. `requirements/`, `design/`, `aire-state.md`, `audit.md`), the copy was flattened instead of mirrored — redo Step 5.3 before continuing.
   - **Content check**: spot-check key files exist at their mirrored paths: `runtime-artifacts/aire-state.md`, `runtime-artifacts/audit.md`, `spec/plans/architecture.md`, `spec/plans/atlas-deep-dive.md`, and (when `reports/` was copied) one evidence file such as `reports/unit-test-evidence/<story-key>/evidence-manifest.md`.
   - **Completeness check (BLOCKING — same for every cycle type)**: prove nothing was dropped, by comparing each live tree against its archived copy — every diff MUST be **completely empty**:
     ```bash
     diff <(cd spec && find . | sort) \
          <(cd "aire-archives/<type>/<CYCLE-ID>-<slug>/spec" && find . | sort)
     [ -d reports ] && diff <(cd reports && find . | sort) \
          <(cd "aire-archives/<type>/<CYCLE-ID>-<slug>/reports" && find . | sort)
     [ -d runtime-artifacts ] && diff <(cd runtime-artifacts && find . | sort) \
          <(cd "aire-archives/<type>/<CYCLE-ID>-<slug>/runtime-artifacts" && find . | sort)
     ```
     (PowerShell equivalent: `Compare-Object` on the `-Force` relative-path lists.)
     Every diff must be empty. Any line at all means the copy dropped or added something — re-run the full recursive copy of Step 5.3 and re-verify.
     Do NOT proceed to Step 6 (which deletes the live docs) until every diff is empty. Report the archived file count in the completion message and the manifest.
   - Log the structural check, the file count, and the completeness-diff result in the live `runtime-artifacts/audit.md` (Step 6 has not yet deleted it at this point).

**MANDATORY reference layout** — every archive folder produced by this skill MUST match this shape exactly (no exceptions, no variation between epic/bug/enhancement cycles):
```
aire-archives/epics/<EPIC-ID>-<epic-name-slug>/
├── spec/                  ← the ENTIRE spec/ tree, folder name preserved
│   ├── plans/                         ← architecture.md, atlas-deep-dive.md + flat RE docs, requirements,
│   │   │                                 Stories/Personas, design docs, dependency-graph.yml
│   │   └── delta/<CYCLE-ID>-<slug>/    ← this cycle's RE delta (Step 3) — stitched later on base
│   ├── spec-generation/               ← *-generation.md plan/clarifying-question files
│   ├── context-project/               ← human-curated inputs
│   └── …                         ← EVERY other folder/file that exists under spec/, at every depth
├── reports/                       ← the ENTIRE reports/ tree (generated outputs), when it exists
│   └── …                         ← unit-test-evidence/ + reviews/ + code-security-reviews/ + ticket-summary/ + pr-feedback/, at every depth
├── runtime-artifacts/             ← the ENTIRE runtime-artifacts/ tree, when it exists
│   ├── audit.md
│   └── aire-state.md
└── archive-manifest.md           ← sibling of spec/, reports/ and runtime-artifacts/, never inside them
```
(`bugs/<BUG-ID>-<slug>/` and `enhancements/<ENH-ID>-<slug>/` follow the identical shape and the identical full-tree contents — the folders shown above are illustrative, not a whitelist: archive whatever exists, nothing less.)

> The **latest cycle archive folder** is a complete snapshot of the cycle — workspace detection can offer to restore human-curated context from it when a new cycle starts. Current-system truth (`atlas-deep-dive.md` and the flat RE docs) is refreshed fresh from Atlas each cycle, not restored from the archive.

---

## Step 6: Remove the Live Trees (AUTOMATIC — no confirmation, in every mode)

**THIS STEP ASKS NOTHING.** Not in epic mode, not in bug or enhancement mode, not on a standalone
invocation. The archive's own verification is the gate — Step 5's structural check, content check
and three empty completeness diffs. Once those pass, the live trees are redundant by proof, and a
confirmation prompt on top of a byte-for-byte verified copy adds no safety, only a stall in the middle
of a cycle close.

**Announce it, then do it:**

```
 Archive verified at aire-archives/<type>/<CYCLE-ID>-<slug>/ ([N] files, [size]).
   Removing the live spec/, reports/ and runtime-artifacts/ trees —
   all mirrored, every completeness diff empty.
   Human-authored context is preserved at:
     aire-archives/<type>/<CYCLE-ID>-<slug>/spec/context-project/
```

### 6.1 The removal itself — use `git rm -r`, not `rm -rf`

```bash
git rm -r --quiet spec reports runtime-artifacts
```

- **Why `git rm -r` and not `rm -rf`**: it removes the files **and stages the deletions in one
  operation**, so Step 6.5 cannot commit a partial reset by forgetting to stage a removal. It also
  fails loudly on a path that is not tracked, rather than silently destroying untracked work.
- `reports/` is legitimately absent on a cycle that produced none — omit any
  path that does not exist rather than letting the command fail on it.
- **Never add `test-plans/` to the removal.** The test plans stay on the Base Branch
  (`common/branching-strategy.md` Section 7.5); on a bug or enhancement branch this cycle's plan rides
  the cycle PR there.
- **Untracked residue** (tool caches, an untracked evidence file) survives `git rm`. Clean only what is
  genuinely left inside those three roots:
  ```bash
  git clean -fd spec reports runtime-artifacts
  ```
  Never widen that to the repo root, and never add `-x` (it would delete ignored files elsewhere).
- **If the environment's own safety classifier prompts for approval on the delete command, that is an
  environment permission, not an archive-epic gate.** Answer it and continue — do not add a question
  of your own on top of it, and do not treat the prompt as a reason to skip the removal.

### 6.2 Preconditions — assert, do not ask

All three must hold before the command runs. Any failure → STOP and fix, never prompt for permission to
proceed anyway:

1. Step 5's completeness diffs were run and were all empty.
2. `<archive>/spec/` exists (and `<archive>/reports/`, `<archive>/runtime-artifacts/` for whichever live
   trees exist). If `<archive>/spec/` is missing, redo Step 5.
3. `git status` shows those roots as tracked paths about to be deleted — nothing outside them.

**THERE ARE NO SURVIVORS — `spec/` is removed in FULL**, `plans/` (including `atlas-deep-dive.md` and
this cycle's `plans/delta/`), `spec-generation/` and `context-project/` alike, together
with `reports/` and `runtime-artifacts/`. The one root that survives is `test-plans/`, which is not part
of the reset. **Do NOT keep
`atlas-deep-dive.md` or `plans/delta/` back for the stitch** — `stitch-delta` reads the delta out of the
archive, on base, after this PR merges. A shared, per-cycle-rewritten file left on base would make this
flow conflict-prone.

**`runtime-artifacts/audit.md` and `runtime-artifacts/aire-state.md` go with everything else — do NOT
seed a replacement.** The archive copy holds the cycle's complete trail; the next cycle's Workspace
Detection creates fresh ones. This is also what keeps parallel cycles conflict-free: no two PRs carry
competing audit/state files onto the base branch.

**MANDATORY**: From this point on the live `runtime-artifacts/audit.md` no longer exists — log the
removal and everything in Step 6.5 by APPENDING to the archived copy at
`aire-archives/<type>/<CYCLE-ID>-<slug>/runtime-artifacts/audit.md`, so the trail stays complete.

---

## Step 6.5: Commit, Push & Ensure the PR (AUTOMATIC — no confirmation)

Everything this skill produced so far exists only in the working tree. **If it is not committed and
pushed, the cycle PR will NOT carry the archive or the workspace reset.** So this step asks nothing
either — it commits, pushes, and makes sure a PR exists, announcing each action as it goes.

1. **Stage the cycle-close changes**:
   - `aire-archives/<type>/<CYCLE-ID>-<slug>/` (the verified archive — includes the mirrored `spec/`,
     `reports/` and `runtime-artifacts/`, and therefore this cycle's delta)
   - The Step 6 removals — already staged by `git rm -r`; confirm with `git status` that `spec/`, `reports/`
     and `runtime-artifacts/` show as deletions and that nothing outside them was touched
   - **Nothing under `aire-archives/stitch-ledger.md`** — this skill never writes it (Step 3.5)
2. **Commit on the current (cycle) branch**, with the `AIRE-Version:` trailer read live from the
   canonical `AIRE Framework Version` line in `CLAUDE.md` — never hardcode the number:
   ```
   docs: close cycle <CYCLE-ID> — release archive, workspace reset

   AIRE-Version: [N]
   ```
3. **Push to origin automatically** — `git push origin <cycle-branch>`, then verify
   (`git log origin/<cycle-branch> -1`). No confirmation: the cycle-close commit is worthless off
   origin, and the user already chose to close the cycle by invoking this skill.
   - On a rejected push (branch moved): `git fetch` + rebase onto `origin/<cycle-branch>`, re-verify the
     archive paths survived the rebase, and retry once. If it still fails, report the exact git error
     and STOP — never force-push a cycle branch.
4. **Ensure the PR exists — automatic, in every cycle type**:
   - Find the open PR for the cycle branch (`common/repo-host.md` RH-1 — source `<cycle-branch>`,
     open; GitHub or Azure Repos per `## Repo Host`).
   - **A PR is already open** (an `[EPIC]` PR raised by hand through `pr-generator`, which then
     auto-triggered this skill, or the `[BUG]`/`[ENH]` raised by the implement workflow): it tracks the
     branch, so the push above already added the commit. Verify that — the PR's head commit (RH-2)
     equals `git rev-parse HEAD` — and continue.
   - **No PR is open** (the normal epic case — the `[EPIC]` PR carries only this archive, since every
     story's code already merged into the Base Branch through its own `[STORY]` PR): raise it now by
     invoking the `pr-generator` skill in WORKFLOW mode (always workflow mode — its Phase 7
     archive auto-trigger runs only for a standalone invocation, so this call can never re-enter this
     skill),
     passing target branch = the Base Branch recorded in `## Branching` — workflow mode skips its
     Phase 5 confirmation, so the push and PR happen automatically. It applies the correct
     `[EPIC]`/`[BUG]`/`[ENH]` prefix and the `ai-generated` + `aire-anx-v[N]` labels itself. Never
     hand-roll a PR create here — pr-generator owns PR mechanics.
5. **Update the PR description** so reviewers aren't surprised by the cycle-close diff: fetch the current
   body (`common/repo-host.md` RH-2) and append (via RH-4, never replacing the existing content; on
   Azure Repos mind RH-3's 4,000-character description cap), then read it back to confirm:
   ```markdown
   ##  Cycle-Close Commit (added after PR creation)
   This PR also includes the cycle-close commit from `archive-epic`:
   - **Added**: release archive at `aire-archives/<EPIC-ID>-<slug>/` (complete `spec/` + `reports/` + `runtime-artifacts/` snapshot incl. audit trail and state)
   - **Added**: this cycle's RE delta ([N] changed surfaces), archived at `aire-archives/<type>/<CYCLE-ID>-<slug>/spec/plans/delta/<CYCLE-ID>-<slug>/`
   - **Removed**: the live `spec/` tree in full (including `context-project/`), the `reports/` tree, and `runtime-artifacts/` (`audit.md`, `aire-state.md`) — all mirrored in the archive above
   - **After merging**, run `/stitch-delta` on `<base-branch>`: it reads the delta from that archive and publishes it to the deep dive on Atlas. Its own PR is a single ledger row.
   ```

---

## Step 7: Completion Message

```markdown
# Cycle Archive Complete

- **Archive**: `aire-archives/<EPIC-ID>-<epic-name-slug>/`
- **Contents**: `spec/` (all planning/design artifacts) + `reports/` (generated outputs) + `runtime-artifacts/` (audit.md, aire-state.md)
- **Test plans**: stay on the Base Branch in `[Test Plan Folder]` — not archived
- **Not on base**: [stories whose code is not on `<base-branch>` — named in the delta and manifest]
- **Delta**: [N] changed surface(s), commit range [base-sha]..[head-sha] — archived at
  `aire-archives/<type>/<CYCLE-ID>-<slug>/spec/plans/delta/<CYCLE-ID>-<slug>/delta.md`
  ↳ pending until `/stitch-delta` publishes it (it has no ledger row yet — that IS the pending signal)
- **Workspace**: `spec/`, `reports/` and `runtime-artifacts/` removed — all mirrored in the archive
  ↳ human-authored context to restore next cycle: `aire-archives/<type>/<CYCLE-ID>-<slug>/spec/context-project/`
- **Cycle-close commit**: pushed to `origin/<cycle-branch>` — included in PR <URL> [| PR raised via pr-generator: <URL>]

NEXT ACTION — in order:
   1.  Merge the open PR into `<base-branch>`: <PR URL>
       (the cycle-close commit above rides this PR)

   2.  On `<base-branch>`, after that merge, type: /stitch-delta
       It reads this delta from the archive and publishes it to the deep dive on Atlas via the
       Helix MCP, then appends one ledger row — in its own PR for you to review.

Type `/stitch-delta` EXACTLY as shown — the cycle is not closed until the delta reaches Atlas.
```

**Rules for this message**:
- Substitute every placeholder with real values (`<base-branch>` and the PR web URL from `## Branching` / `common/repo-host.md` RH-1) — never ship a placeholder to the user. Drop the Not on base line when the manifest records `none`.
- The push is automatic, so there is no "not pushed" variant of this message. If the push genuinely failed (Step 6.5 item 3 exhausted its one retry), do not print this completion block at all — report the exact git error and STOP, so the failure is not dressed up as a successful close.
- **Local RE cycles**: if the archived `## Existing-System Context` records `Source: local-generation` or
  `local-re` (option B at the Helix gate), print `/stitch-delta-local` instead of `/stitch-delta` in
  item 2 and in the closing line. Its item 2 text becomes: "It refreshes the local RE docs in
  `aire-archives/local-re/spec/plans/` against the merged code and appends one ledger row, in its own
  PR for you to review."
- **Always the handoff**: never replace NEXT ACTION item 2 with "there is nothing to stitch". Every
  cycle has a delta (Step 3.4), so every cycle has a stitch.
- Output nothing after this block — no options menu, no further suggestions.
