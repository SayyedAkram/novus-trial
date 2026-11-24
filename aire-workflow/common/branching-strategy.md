# Branching Strategy (Development Branch ← Story Branches; Epic Branch for Docs; Bug Branch)

**Purpose**: Single source of truth for ALL git branching in aire. Loaded by Workspace Detection (epic branch creation), Requirements Analysis Step 10 (epic branch commit and push), `workflows/dev-implement.md` (story branches and the docs worktree), and the bug workflows (`workflows/bug-fix.md` / `bug-fix-implement.md` — see the Bug Branch Model at the end). The model is identical on GitHub and Azure Repos; every PR operation it relies on dispatches on `## Repo Host` per `common/repo-host.md`.

## The Model

```text
develop  (the Base Branch = the team's development branch; its CI/CD deploys to DEV)
 ├── epic/4800-payment-portal        ← DOCS ONLY: spec/, runtime-artifacts/, reports/
 ├── test-plans/4800-payment-portal  ← TEST PLANS ONLY: [TEST] PR into develop (Section 7)
 ├── story/1.1-user-registration     ← CODE ONLY: cut from develop, [STORY] PR into develop
 ├── story/1.2-login-endpoint        ← cut from develop
 └── story/2.1-profile-page          ← cut from develop once 1.1 is merged into it
```

- **Base Branch = the development branch.** Story PRs merge straight into it, so each merged story is
  deployed to DEV by the team's own pipeline and moves through the status lifecycle
  (`common/status-model.md`) on its own.
- **Epic branch** → created ONCE at workflow start from the Base Branch and carries **only the cycle's
  documents**: `spec/`, `runtime-artifacts/` and `reports/`. It never carries `src/` or `tests/`. At
  cycle end `archive-epic` moves those documents into `aire-archives/` and raises the `[EPIC]` PR, which
  carries only the archive.
- **Story branches** → one per story at `dev-implement`, cut from the refreshed Base Branch, carrying
  only code and unit tests (`src/` or the recorded Code Root, `tests/unit/`). Their PRs target the
  Base Branch.
- **Docs worktree** → during a story run the epic branch is checked out beside the code at
  `.aire-docs/` (Section 4), so the run's documents are committed to the epic branch while its code is
  committed to the story branch.
- **Test plans** → the one document that reaches the Base Branch during the cycle. They live in
  `test-plans/<cycle>/`, published by their own `[TEST]` PR (Section 7), so parallel epics on the same
  Base Branch never touch each other's files.

---

## 1. Epic Branch Creation (at workflow start — automatic)

Runs during Workspace Detection, AFTER the runtime-artifacts/aire-state.md resume check and Parent Epic capture. Skip if `## Branching` already exists in `runtime-artifacts/aire-state.md` (resumed project) — verify the recorded epic branch still exists and switch to it.

1. Record the **Base Branch**: `git branch --show-current` — the development branch the story PRs merge into and the epic branch is cut from. It is NOT assumed to be `main` or `develop`; use whatever the repo is on, and announce it plainly so a wrong start is caught now:
   ```text
   Base Branch: <base> — story and bug PRs merge here, and its CI/CD deploys them to DEV.
   (If your development branch is a different one, say so now.)
   ```
   A correction is an interrupt: switch to the named branch (it must exist on origin), re-record it, log the raw response.
2. **Approval policy check (non-blocking)**: read the Base Branch's required approvals with `common/repo-host.md` RH-11. Fewer than 2, or not readable → warn once, log it, continue:
   ```text
   Note: <base> does not require 2 approvals on a pull request (found: <n | not readable>).
   AIRE never approves or merges — ask a repo admin to set a 2-approval branch policy.
   ```
3. Derive the epic branch name:
   - Epic ID + title available (from `## Tracker` / epic-brief): `epic/<EPIC-ID>-<kebab-case-epic-title>` (e.g., `epic/4800-payment-portal`). Truncate the title part to keep the whole name ≤ 60 chars.
   - No Epic provided (plain natural-language request): derive a short kebab slug from the intent. ** AUTOMATIC — do NOT ask the user to confirm the derived name**; announce it instead (` Epic branch: <name> (docs only, cut from <base>)`). The user can rename it later with an ordinary git command if they dislike it.
4. Create it automatically (working tree must be clean; if not, show `git status` and ask how to proceed — that is the ONLY question in this section):
   ```
   git fetch origin
   git checkout -b epic/<EPIC-KEY>-<kebab-title>
   ```
5. Record in `runtime-artifacts/aire-state.md`:
   ```markdown
   ## Branching
   - Base Branch: develop         (the development branch — story PRs merge here)
   - Epic Branch: epic/4800-payment-portal   (docs only)
   - Docs Worktree: .aire-docs
   - Test Plan Folder: test-plans/4800-payment-portal/   (on the Base Branch — Section 7)
   - Epic PR: (not raised — raised by archive-epic at cycle end)
   ```
6. Log the creation (name, base branch, the policy check result) in `runtime-artifacts/audit.md`.
7. **All Planning and design artifacts are committed on the epic branch** — never directly on the Base Branch.

## 2. Epic Branch Commit & Push (after requirements.md approval — Requirements Analysis Step 10)

1. Commit the Planning artifacts produced so far (`spec/` requirements, state, audit) on the epic branch.
2. Push the epic branch to origin (`git push origin <epic-branch>`). Do NOT raise an Epic → Base PR at this point. The `[EPIC]` PR is raised by `archive-epic` at cycle end, once every story is `Closed`, and carries only the archive.
3. Log the commit hash and push confirmation in runtime-artifacts/audit.md.
4. The epic branch keeps receiving document commits all cycle long (planning, design, and every story run's state, audit and evidence through the docs worktree). It never receives code or test plans — those go to the Base Branch through Section 7.

## 3. Story Branch Creation (at `dev-implement`, per story)

Runs after Story Selection resolves the story and the Doability Gate passes, BEFORE any code generation.

1. Derive the story branch name automatically: `story/<N.M>-<kebab-case-story-title>` (the Story ID `N.M` is the prefix — a bare numeric work item ID reads poorly as one — and the Tracker ID is mentioned in the PR body per `common/tracker-sync.md` Section 11 — e.g., `story/1.2-login-endpoint`). ** AUTOMATIC — do NOT ask the user to confirm or override the name.** The name is fully determined by the story ID and title, so announce it (` Story branch: <name> (cut from <base>)`) and create it. The only exception is a name collision with an existing branch — then append a short disambiguating suffix automatically and announce that too. Never generate code on the Base Branch or the epic branch.
2. Refresh first — ALWAYS: `git fetch origin`.
3. **Dependency-merge check**:
   - Read the story's `requires` from `dependency-graph.yml`.
   - For EACH prerequisite story, determine whether its PR has been MERGED into the Base Branch (its live state via `common/repo-host.md` RH-2, or `git branch -r --merged origin/<base>` listing its story branch). In the normal `dev-implement` flow the Doability Gate ran first and already checked this live (`implementation/story-selection.md` Step 4) — the gate never merges anything itself, so anything still unmerged here is exactly what the Doability Gate already stopped on. This check stays as a safety net (e.g. a merge reverted between the gate and the branch cut). A prerequisite's status is never proof of a merge (`common/tracker-sync.md` Section 4.1).
   - **Case A — no prerequisites, or ALL prerequisites merged into the Base Branch**: cut from the refreshed Base Branch:
     ```
     git checkout -b story/<N.M>-<kebab-title> origin/<base>
     ```
   - **Case B — one or more prerequisites NOT yet merged**:  WARN AND STOP (mandatory — never proceed, never offer an alternative base):
     ```
      Cannot start Story [N.M] yet.
        It depends on story [X.Y], whose PR is NOT yet merged into <base> —
        its code would be missing from any branch cut now.

     Get story [X.Y]'s PR approved and merged into <base> first, then run `dev-implement`
        again to start Story [N.M]. (Unmerged prerequisites: [list all])
     ```
     Do NOT create a story branch. Do NOT cut from the unmerged dependency's branch. Log the warning, revert the story's status from `In Progress` back to `ToDo` in the Story Tracker (and on the ADO board, verified) since development is not starting, and END the `dev-implement` run — the user re-invokes it after the merge.
4. Verify the branch is active (`git branch --show-current`), record the story branch name + base used in the story's fragment audit, and carry it forward as the commit/push/PR target. (This is a self-check, not a user prompt.)

## 4. The Docs Worktree (every story run on an epic cycle)

A story run needs the cycle's documents (stories, architecture, the dependency graph) and
writes its own state, audit and evidence — but none of them may enter the story branch, which merges
into the development branch.

1. **Open it at the start of every story run, before Story Selection** — selection already reads
   `stories.md`, the dependency graph and the Story Tracker. Every run closes it when it ends
   (item 6), so it is always added fresh:
   ```bash
   git fetch origin
   grep -qxF '.aire-docs/' .git/info/exclude || echo '.aire-docs/' >> .git/info/exclude
   git checkout <base>                               # only if the main tree is on the epic branch
   git worktree add .aire-docs <epic-branch>
   ```
   **Already present** (left by a run that ended without closing it, for example a closed session),
   on any branch: remove it automatically, without asking, then add it as above:
   ```bash
   git -C .aire-docs status --porcelain               # record what is uncommitted, if anything
   git worktree remove --force .aire-docs
   git worktree prune
   ```
   Every committed document is already on origin, so only files nothing committed are lost. Log the
   branch it held and each uncommitted path in the run's audit entry, and say it in one line:
   `Removed a leftover .aire-docs/ on <branch> (<n> uncommitted files discarded, listed in the audit).`
   **Never move, rename or copy `.aire-docs/`**, and never create a second docs folder beside it.
   The exclude is local to the clone — nothing is committed to ignore it. Git allows a branch in one
   worktree only, so the main tree leaves the epic branch first (planning ends there; the working tree
   must be clean). The main tree then holds the Base Branch or a story branch, never the epic branch.
2. **Path rule**: in a story run, every `spec/…`, `runtime-artifacts/…` and `reports/…` path in any
   rule file, skill or agent means **`.aire-docs/spec/…`, `.aire-docs/runtime-artifacts/…`,
   `.aire-docs/reports/…`**. Code (`src/` or the Code Root) and `tests/unit/` stay in the main working
   tree on the story branch.
3. **Docs commit**: commit in the worktree, then push with a rebase so parallel developers never block
   each other (each story writes only its own fragment and evidence paths, so the rebase cannot
   conflict). `<own paths>` always include the story's hook log `reports/hooks-log/<story-key>/` when
   present: the hooks append to it on every write, and a modified tracked file left unstaged makes
   `pull --rebase` refuse to run:
   ```bash
   git -C .aire-docs add <own paths> && git -C .aire-docs commit -m "<msg>" -m "AIRE-Version: [N]"
   git -C .aire-docs pull --rebase && git -C .aire-docs push origin <epic-branch>
   ```
   Documents can be committed at any point of the run — before or after the PR exists — because they
   never change the PR's head.
4. **Docs Isolation Check** before every story-branch commit:
   `git diff --name-only --cached -- spec/ runtime-artifacts/ reports/ aire-archives/ test-plans/` must
   print nothing. Anything listed is unstaged from the story branch, moved to its worktree path and
   committed per item 3 — a test plan through Section 7.
5. **The Verification Engineer's skills** (`ve-list-work`, `ve-implement`, `raise-defect`) start on
   whatever branch the clone holds, usually the Base Branch, and never change what the main tree
   holds:
   - **Find the cycle on origin.** `git fetch origin`, then list the cycle branches that still hold
     state (`archive-epic` removes it at cycle close):
     ```bash
     git for-each-ref --format='%(refname:short)' refs/remotes/origin/epic/ refs/remotes/origin/bug/ refs/remotes/origin/enhancement/
     git cat-file -e <ref>:runtime-artifacts/aire-state.md      # succeeds = the cycle is open
     ```
     A story or Tracker ID named → the cycle whose state holds it
     (`git grep -l "<ID>" <refs> -- runtime-artifacts/`). Otherwise one open cycle → use it; several
     → ask which, listing each branch with its Parent Epic. Announce the one chosen.
   - **Read from origin.** Everything the skill only reads (state, the story fragments, `spec/…`) is
     read with `git show <ref>:<path>` and listed with `git ls-tree -r --name-only <ref> -- <folder>`,
     no checkout. Test plans are read per Section 7.3.
   - **Write through the worktree.** Only when the skill writes to the epic branch (Story Tracker
     rows, audit, its own audit fragment): open `.aire-docs/` on it per item 1,
     write and commit per item 3, then close it per item 6. `raise-defect` writes no audit at all, and
     removes `.aire-docs/` after every bug it raises, even one it found already open (its Phase 4
     step 6a).
   - A bug or enhancement cycle branch also carries the fix's code; the skill's own rule says when it
     checks that branch out (always confirm-first, never with uncommitted changes).

   `archive-epic` runs on the epic branch: it uses `.aire-docs/` when it exists in the clone, and
   otherwise checks the epic branch out.
6. **Close it whenever the run ends**: after the PR is raised and the auto PR review has run
   (dev-implement Section F, epic-enhancement Step 14, epic-bugfix Step 16, pr-fix Step 18), and equally
   when the run halts or stops early (a self-heal limit, a Doability or R6 stop, a "no" at a
   checkpoint). First commit and push everything the run wrote there per item 3; on a halt that
   includes its `HALTED —` record, so the resume finds it on origin. Then:
   ```bash
   git -C .aire-docs status --porcelain               # must print nothing
   git worktree remove .aire-docs
   git worktree prune
   git worktree list                                  # .aire-docs must not be listed
   test ! -e .aire-docs                               # the folder must be gone
   ```
   Nothing is lost: every document is on `origin/<epic-branch>`, and the next run, or the resume,
   adds it again (item 1). Never `--force` on the run's own files: they are committed first.
   - Files still listed after the run's own commit → they are not this run's: log each path, then
     `git worktree remove --force .aire-docs`, as item 1 does.
   - The folder still there after the remove (on Windows, usually a file held open by another
     program) → tell the user to close that program and delete `.aire-docs/`, and log it. Never end
     the run with the folder silently left behind.

## 5. Story PR (dev-implement Section D)

- Invoke `pr-generator` passing the Base Branch from `## Branching` as the proposed target; it asks the developer which branch the PR goes into. The PR title carries the `[STORY]` prefix (pr-generator applies it).
- The PR needs two approvals under the Base Branch's policy; humans approve and merge. After the merge the team's CI/CD deploys it to DEV, and the developer moves the story to `Ready for Testing` on the board (`common/status-model.md` S4).
- After the merge, stories that `require` this one become cuttable from the Base Branch (Case A).
- **After every story PR merges into the Base Branch, stitch it**: on the Base Branch run
  `/stitch-delta` (`/stitch-delta-local` when the cycle's `## Existing-System Context` records
  `Source: local-generation` or `local-re`). The existing-system docs then describe the Base Branch as
  it is, so an epic started or running in parallel never designs against code that is missing from
  them. The cycle-close stitch after the `[EPIC]` PR still runs and publishes the cycle's delta.

---

## Rules

- The epic branch is created automatically at workflow start and carries documents only; code lives only on story branches, cut from the refreshed Base Branch.
- ALWAYS run the dependency-merge check; when any prerequisite is unmerged, WARN AND STOP (Case B). NEVER cut a story branch from an unmerged dependency branch, and never proceed silently.
- A story branch never contains `spec/`, `runtime-artifacts/`, `reports/`, `aire-archives/` or `test-plans/` changes (Docs Isolation Check); the epic branch never changes code or test plans (it still holds earlier cycles' plans, untouched, from the Base Branch it was cut from).
- Test plans reach the Base Branch only through Section 7 — an epic cycle's `[TEST]` PR, or a bug/enhancement cycle's own `[BUG]`/`[ENH]` PR — and a cycle writes only inside its own Test Plan Folder.
- Branch names (epic and story) are derived and created automatically — never confirmed with the user; they are announced. Only a dirty working tree (epic branch creation) still asks.
- Story PRs (`dev-implement`, `epic-enhancement`, `epic-bugfix`, `epic-change-request`) and bug/enhancement PRs go to the Base Branch by default. Pass it explicitly to `pr-generator` — invoked this way it runs in workflow mode and pushes and opens the PR automatically (Phase 5 skipped; the invoking workflow's gate is the authorization). From `dev-implement`, `bug-fix-implement` and `enhancement-implement` it first asks which branch the PR goes into, with the Base Branch recommended; the other workflows' PRs go to the Base Branch without the question. Every PR title is prefixed `[STORY]`, `[BUG]`, `[ENH]` or `[EPIC]` accordingly — pr-generator enforces this.
- AIRE never approves, merges or deploys; the two approvals are the Base Branch policy's job (RH-11).
- Record every branch created (name, base, chooser's raw response) in the audit and keep `## Branching` in runtime-artifacts/aire-state.md current.

---

## 6. Bug Branch Model (`bug-fix` / `bug-fix-implement`)

The bug flow uses ONE branch for the entire cycle — no epic branch, no story branches:

```text
develop (the Base Branch — the development branch the workflow started on; its CI/CD deploys to DEV)
 └── bug/4840-login-timeout          ← created at bug-fix start; ALL docs + code live here
```

1. **Creation** (during `bug-fix` workspace detection, automatic): record the base branch (`git branch --show-current` — never assume `main`), then `git fetch origin && git checkout -b bug/<TICKET-ID>-<kebab-case-ticket-title>` (whole name ≤ 60 chars; clean working tree required, else show `git status` and ask). Record in `runtime-artifacts/aire-state.md`:
   ```markdown
   ## Branching
   - Base Branch: develop
   - Bug Branch: bug/4840-login-timeout
   - Test Plan Folder: test-plans/4840-login-timeout/   (rides the [BUG] PR — Section 7)
   - Bug PR: (pending — raised by bug-fix-implement after code review approval)
   ```
   Skip creation if `## Branching` already records a Bug Branch (resumed bug) — verify it exists and switch to it. A bug sent back to `Active` after a failed retest (`common/status-model.md` B9) is fixed in a new cycle on `bug/<TICKET-ID>-<kebab-title>-r2` (`-r3`, …), because the first cycle's branch has already merged. Log in runtime-artifacts/audit.md.
2. **Single PR, at the END**: no PR is raised at requirements approval. `bug-fix-implement` raises the one PR — via `pr-generator`, target = the recorded Base Branch, title prefixed `[BUG]` — only after the automated code review's verdict is clean (findings are auto-remediated and re-reviewed until they are — there is no approval gate).
3. **Rules**: never cut story branches in the bug flow; never commit to the base branch directly; the `[BUG]` PR targets the Base Branch (there is no epic branch to target); record the PR URL in `## Branching` (`Bug PR: <url>`) and log every branching action in runtime-artifacts/audit.md.

---

## 7. Test Plans on the Base Branch

The manual test plans are the one document that reaches the Base Branch during a cycle, and they stay
there after it. They live in their own root, `test-plans/`, with one folder per cycle. A cycle
writes only inside its own folder, so several epics running in parallel from the same Base Branch can
never touch the same file, and their test-plan PRs cannot conflict.

```text
develop
 └── test-plans/
     ├── 4800-payment-portal/                 ← an epic: one sub-folder per story
     │   ├── 4821-user-can-reset-password/
     │   └── 4822-login-endpoint/
     ├── 4850-reporting/                      ← a second epic in parallel — never touches the first
     └── 4840-login-timeout/                  ← a bug or enhancement: the ticket's own plan
```

### 7.1 The folders

- **Test Plan Folder** (one per cycle): `test-plans/<cycle>/`, where `<cycle>` is the cycle branch's
  name without its `epic/`, `bug/` or `enhancement/` prefix (a bug's `-r2` re-fix keeps the first
  cycle's folder). Recorded once in `## Branching` when the cycle branch is created (Sections 1 and 6).
  If the Base Branch already holds that folder from a different, earlier cycle, append `-2` (`-3`, …),
  announce it and record that name.
- **A story's test plan**:
  - epic cycle: `<Test Plan Folder><TICKET-ID>-<title>/` (`implementation/test-plan.md` "Output
    Location" names the `<TICKET-ID>-<title>` part);
  - bug or enhancement cycle: the Test Plan Folder itself, `test-plans/<TICKET-ID>-<title>/`.
- A cycle writes only inside its own Test Plan Folder, and never edits, moves or deletes another
  cycle's folder. There is no shared index file under `test-plans/`.

### 7.2 Epic cycles — publishing through the `[TEST]` PR

The epic branch never carries `test-plans/`. Every write to an epic cycle's test plans is published
with this one procedure: the STOP CHECKPOINT set, a `/ve-implement` refresh, a `ve-list-work`
Option C change, a mid-epic `epic-enhancement` / `epic-bugfix` / `epic-change-request` update, and an
implement workflow's backfill of a missing plan. The content was already approved by the caller's own
gate, so the procedure asks nothing.

1. **Pick the branch.** `git fetch origin`, then find this cycle's open test-plan PR into the Base
   Branch (RH-1 by branch prefix `test-plans/<cycle>`).
   - One is open → reuse its branch.
   - None is open → a new branch cut from `origin/<base>`: `test-plans/<cycle>` the first time, then
     `test-plans/<cycle>-2`, `-3`, … — one higher than any branch a PR of this cycle has used (RH-1 by
     branch prefix, all states), so a deleted merged branch is never reused.

   A cycle never has two open test-plan PRs, so its own changes cannot conflict either.
2. **Open the test-plan worktree** beside whatever the main tree holds:
   ```bash
   grep -qxF '.aire-test-plans/' .git/info/exclude || echo '.aire-test-plans/' >> .git/info/exclude
   git worktree add -b <branch> .aire-test-plans origin/<base>   # new branch
   git worktree add .aire-test-plans <branch>                     # reused branch
   git -C .aire-test-plans pull --ff-only                         # reused branch
   ```
   Already open on that branch (a Request Changes loop) → reuse it as it is.
   While it is open, every `test-plans/…` path in any rule file, skill or agent means
   `.aire-test-plans/test-plans/…`.
3. **Write** the change — the caller's own step (for example `ve-implement` generating a plan).
4. **Commit and push.** A caller's own check on its change (CR10, SH-LOOP-6) diffs the worktree
   against its `HEAD` and runs before this item — a reused branch already holds other pending changes.
   Stage only `test-plans/<cycle>/`.
   `git -C .aire-test-plans diff --name-only --cached | grep -v '^test-plans/<cycle>/'` must print
   nothing. Commit with the `AIRE-Version: [N]` trailer, then
   `git -C .aire-test-plans pull --rebase` (reused branch) and
   `git -C .aire-test-plans push -u origin <branch>`.
5. **Raise or update the PR** — always into the Base Branch, never asked:
   - No open PR → create it with RH-3: source the test-plan branch, target the Base Branch, title
     `[TEST][<EPIC-ID or cycle>] Test plans — <epic title>`, labels `ai-generated` and `aire-anx-v[N]`
     (exact names; read back with RH-2, add a missing one with RH-5). The body lists each story folder
     added or changed with its AC coverage, and ends with `AIRE Framework: v[N]`.
   - An open PR → the push updates it; append one line naming the change to its body with RH-4.

   Humans approve and merge it under the Base Branch's policy. AIRE never merges it.
6. **Close the worktree**: `git worktree remove .aire-test-plans`. Log the branch, the commit and the
   PR URL in the caller's audit (a story run: its own fragment). Audit and state never ride the
   test-plan branch — they are committed on the epic branch, through `.aire-docs/` when it exists.

At the STOP CHECKPOINT the worktree opens (items 1–2) before the first plan is written, and items
4–6 run as soon as the coverage check passes — before the design commit
(`implementation/test-plans-checkpoint.md` Section 3.2).

### 7.3 Reading a test plan

Every reader — the implement workflows' test-plan check, `ve-implement`, `ve-list-work`,
`code-review`, the mid-epic workflows and `archive-epic` — reads the plans the same way:

1. `git fetch origin`.
2. **Epic cycle**: the open test-plan PR's branch of this cycle when one exists (RH-1 as in 7.2 item
   1) — it holds everything already merged plus the pending change. Otherwise `origin/<base>`.
   **Bug or enhancement cycle**: the cycle branch.
3. Read with `git show <ref>:<path>`, list with `git ls-tree -r --name-only <ref> -- <folder>`.

A plan is present when that ref has it. Never read an epic cycle's test plans from the epic branch.

### 7.4 Bug and enhancement cycles

The ticket's plan is written straight into its Test Plan Folder on the bug or enhancement branch and
rides the `[BUG]`/`[ENH]` PR into the Base Branch. There is no `[TEST]` PR. A `ve-list-work`
Option C change is committed and pushed straight to the cycle branch (through `.aire-docs/`), staging
only the Test Plan Folder; when the `[BUG]`/`[ENH]` PR is open, that push updates it. Because the
Verification Engineer may push while code is being built there, the implement workflow merges
`origin/<cycle-branch>` before it pushes (`workflows/dev-implement.md` Section D Step 4).

### 7.5 At cycle close

Test plans are never archived and never removed. `archive-epic` removes `spec/`, `runtime-artifacts/`
and `reports/`, never `test-plans/`. For an epic cycle it first checks that every story's plan is on
the Base Branch and that no `[TEST]` PR of the cycle is still open. It records the Test Plan Folder in
the archive, so the plans stay on the Base Branch as the regression record. `archive-epic` never
removes `tests/e2e/` either: the Novus automation module is team code on the Base Branch (Section 8).

---

## 8. Automation Branches (opt-in Novus automation — `/novus-automate`)

The opt-in `/novus-automate` skill (`extensions/testing/novus-automation/novus-automation.md`) turns a
story's approved manual test plan into Novus tests under `tests/e2e/` (`common/directory-structure.md`
rule 4d). It never writes the developer's checkout or the story branch. Its work lives on its own
branch, in its own worktree, and reaches the Base Branch through its own `[AUTO]` PR.

### 8.1 The branch

- Name: `automation/<TICKET-ID>-<title-kebab>`. `<title-kebab>` is the title part of the story's test
  plan folder (`test-plans/…/<TICKET-ID>-<title>/`), lower-case and hyphenated. The whole branch name is
  cut to at most 60 characters, at a hyphen boundary.
- One branch per story, reused by every later run for that story. It is pushed on every run.

### 8.2 The automation worktree (`.aire-automation/`)

1. **Exclude**: `grep -qxF '.aire-automation/' .git/info/exclude || echo '.aire-automation/' >> .git/info/exclude`
2. **Leftover check** — if `.aire-automation/` already exists:
   - on the same branch with a clean `git -C .aire-automation status --porcelain` → reuse it;
   - on another branch, or with uncommitted changes → STOP: `leftover automation worktree on <branch>;
     inspect it, then run git worktree remove .aire-automation (--force discards it)`.
3. **Open** (when not reused): `git fetch origin`, then
   ```bash
   git worktree add .aire-automation <branch>                          # branch exists on origin
   git -C .aire-automation pull --ff-only
   git worktree add -b <branch> .aire-automation origin/<base>         # new branch
   ```
4. **Base merge** (every run, before generating):
   `git -C .aire-automation merge --no-edit -m "chore(e2e): merge <base> into <branch>" -m "AIRE-Version: [N]" origin/<base>`.
   On a conflict: `git -C .aire-automation merge --abort`, then STOP with
   `base merge conflict in <files>; resolve by hand`.
5. While the worktree is open, every `tests/e2e/…` path in the skill means
   `.aire-automation/tests/e2e/…`.
6. **On a STOP after item 3**, keep the worktree and its uncommitted files for inspection and report the
   path. Never remove it on a failure.
7. **Finish** (after the push and PR step): `git worktree remove .aire-automation`.

### 8.3 Commit and push

- Stage only `tests/e2e/`. `git -C .aire-automation diff --name-only --cached | grep -v '^tests/e2e/'`
  must print nothing.
- Commit message: `test(e2e): Novus automation for <TICKET-ID> — <n> cases`, with the
  `AIRE-Version: [N]` trailer. Then `git -C .aire-automation push -u origin <branch>`.

### 8.4 The merge check and the `[AUTO]` PR

The `[AUTO]` PR is raised only after the item's own code PR has merged, so the Base Branch never holds
tests for a feature it does not contain.

1. **Find the item's PRs** with RH-1 by source-branch prefix, all states:
   - story: `story/<N.M>-` or `story/<TICKET-ID>-<N.M>-` (an `epic-bugfix` bug uses its story prefix);
   - bug: `bug/<TICKET-ID>-`, including `-r2` and later;
   - enhancement: `enhancement/<TICKET-ID>-`.
2. **The check passes** when at least one of those PRs is merged into the Base Branch (RH-2) and none is
   still open. A PR merged into any other branch does not count, and the report says so.
3. **Passed** → create the PR with RH-3, or, when one is already open for this branch, let the push update
   it and append one line to its body with RH-4:
   - title `[AUTO][<TICKET-ID>] Novus tests — <title>`, target the Base Branch;
   - labels `ai-generated` and `aire-anx-v[N]` (verify with RH-2, add a missing one with RH-5);
   - body: case counts per state and the summary path, read from
     `origin/<branch>:tests/e2e/automation/<TICKET-ID>.md`, the story PR it follows, and
     `AIRE Framework: v[N]`;
   - link the work item with RH-12.
4. **Not passed** → report `PR deferred — run /novus-automate <TICKET-ID> --publish after the story merges`.

### 8.5 `--publish`

`/novus-automate <TICKET-ID> --publish` raises a deferred `[AUTO]` PR without a browser, Novus pin,
compile or run. It resolves the cycle, checks enablement and repo-host access, then runs Section 8.4.
If `origin/<branch>` does not exist it stops with `nothing to publish`. It writes the skill's audit entry
but makes no commit on the automation branch.

Humans approve and merge the `[AUTO]` PR under the Base Branch's policy. AIRE never merges it.
