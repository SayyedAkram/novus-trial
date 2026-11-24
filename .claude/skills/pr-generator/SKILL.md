---
name: pr-generator
description: >
  Automates raising a pull request (GitHub or Azure Repos, per the `origin` remote) from the current branch into a target
  branch. It ASKS the user which branch to raise a new PR into, and raises it there, when invoked
  by dev-implement, bug-fix-implement or enhancement-implement (each passes the Base Branch — the
  development branch — as the proposed target) and on a standalone run (proposing the recorded
  Base Branch when the current branch is the cycle's Epic/Bug/Enhancement Branch or a story/*
  branch; with nothing to propose it asks the plain target question). The proposal is the
  recommended option, never applied without the answer. Other invoking workflows keep the target
  they pass, and an already-open PR keeps its own.
  Diffs the current branch against the latest target branch, reads runtime-artifacts/aire-state.md
  (Story Tracker / story status) and runtime-artifacts/audit.md (audit trail of what
  was done) to build an accurate summary of the work, then generates a PR title
  (always prefixed [EPIC], [STORY], [BUG] or [ENH] to identify the PR type) and description.
  Every PR raised by this skill is tagged with an
  "ai-generated" label and its description names the model that generated it.
  In STANDALONE mode it requires explicit user confirmation before pushing the branch or
  opening the PR; in WORKFLOW mode (invoked as a step by dev-implement, epic-enhancement,
  epic-bugfix, pr-fix, bug-fix-implement, enhancement-implement, requirements analysis,
  remediate or archive-epic) the push and PR are
  AUTOMATIC — the invoking workflow's own gate already authorized them.
when_to_use: >
  Trigger when the user says: "raise a PR", "create a pull request", "open a PR",
  "generate PR", "PR this branch", "PR to main", "make a pull request",
  "submit a PR", "raise a pull request for this branch".
allowed-tools: Read Grep Glob Bash
argument-hint: "[proposed target branch — passed by the invoking workflow; the user's answer to the target question decides] [work item ID — the Tracker ID the PR delivers]"
---

# PR Generator — Automated Pull Request Creation

You are a release engineer raising a pull request on behalf of the user.

**Confirmation depends on the mode (see Mode Detection below):**
- **Workflow mode** — the invoking workflow already obtained the user's explicit authorization to
  commit, push and raise this PR (the `dev-implement` invocation, the bug/enhancement
  implementation checkpoint, the requirements flow's requirements.md approval). Re-asking here
  is a duplicate of that same decision, so **Phase 5 is SKIPPED and the push + PR creation are
  AUTOMATIC**. Invoked by dev-implement, bug-fix-implement or enhancement-implement, the one question
  it still asks is which branch the PR goes into (Phase 1 Step 2).
  You still print the full draft (title, body, labels, target branch) before acting, so
  the user sees exactly what was pushed and posted — as an announcement, not a question.
- **Standalone mode** — no upstream gate exists, so you prepare everything, show the user exactly
  what will be pushed and posted, and get explicit confirmation before taking any action visible
  outside the local repo (push, PR creation, label creation).

---

## Docs Location

On an epic cycle the story branch carries code only; `runtime-artifacts/` and `reports/` live on the
epic branch, checked out at `.aire-docs/` (`aire-workflow/common/branching-strategy.md` Section 4).
**When `.aire-docs/` exists in the clone, every `runtime-artifacts/…` and `reports/…` path in this skill
means `.aire-docs/runtime-artifacts/…` / `.aire-docs/reports/…`** (pull it first:
`git -C .aire-docs pull --ff-only`). Otherwise the paths are read from the current working tree.

---

## Mode Detection (do this FIRST — decides which procedure runs)

- **Workflow mode** — invoked as a step by another workflow (dev-implement, epic-enhancement, epic-bugfix, pr-fix, bug-fix-implement, enhancement-implement, requirements analysis, remediate or archive-epic) with a target branch passed as the argument. Run the FULL procedure (Phases 1–7) below — Phase 1 Step 2 decides whether to ask which branch the PR goes into — **except Phase 5 — which is SKIPPED in this mode**: the invoking workflow's own gate already authorized the push and the PR, so print the Phase 4 draft as an announcement and proceed straight to Phase 6. Never ask "Push this branch and open this PR — yes/no?" in workflow mode.
- **Standalone mode** — invoked directly by the user via a trigger phrase ("raise a PR", "open a PR", etc.). Read `## Branching` from `runtime-artifacts/aire-state.md` FIRST (silently — do not show it) to determine whether the target can be auto-resolved from the current branch, THEN decide whether to ask:

  **Case 1 — Cycle-close PR (Base Branch proposed).** The current branch IS the recorded Epic Branch / Bug Branch / Enhancement Branch. The proposed target is the recorded Base Branch; Phase 1 Step 2 asks which branch the PR goes into, with it as the recommended option. Then run the FULL procedure (Phases 1–7) exactly as written, so `archive-epic` still auto-triggers (Phase 7) when the answer is the Base Branch.

  **Case 1b — Story PR (Base Branch proposed).** The current branch is a `story/…` branch and `## Branching` (read through `.aire-docs/`) records a Base Branch. The proposed target is the Base Branch (`aire-workflow/common/branching-strategy.md` Section 5); Phase 1 Step 2 asks with it as the recommended option. Then run the FULL procedure (Phases 1–6) with the `[STORY]` prefix; Phase 7 does not apply to a story PR.

  **Case 2 — Ordinary PR (no proposal, ASK).** The current branch is NOT a recorded Epic/Bug/Enhancement Branch or a story branch, OR there is no matching `## Branching` section. There is nothing to propose, so ask the target branch ONCE (verbatim, then wait):
  ```
   Which branch should this PR target ?
  [Answer]:
  ```
  Ask ONLY the line above — verbatim, nothing else. Do NOT recommend, suggest, list, or default any branch (no Epic/Base hints, no options). Just ask and wait for the answer. Then run the ** STANDALONE FAST PATH** below and nothing else.

### STANDALONE FAST PATH (ordinary standalone PR ONLY)

Applies only to an ordinary standalone PR — NOT to a cycle-close epic/bug/enh → base PR (that runs the full procedure above). Do exactly these steps and **nothing more**: do NOT read the Story Tracker or `runtime-artifacts/audit.md` (Phase 3), do NOT infer a prefix from `## Branching`, and do NOT run the Phase 7 archive auto-trigger.

1. **Target branch** — already resolved in Mode Detection (asked from the user, since the Fast Path only runs for a Case 2 ordinary PR).
2. **Safety only** (no AIRE lookups): `git status` + `git branch --show-current`; if there are uncommitted changes, ask commit/stash/proceed. If the current branch IS the target, stop. `git fetch origin <target-branch>`. Run the host access check for `## Repo Host` → `Type` (`aire-workflow/common/repo-host.md` Section 2; if `## Repo Host` is absent, detect the host from `origin` per its Section 1 for this run only — the Fast Path never creates or writes `runtime-artifacts/aire-state.md`) — if it fails, stop.
3. **Diff** the current branch against `origin/<target-branch>` (Phase 2) to build the summary.
4. **Draft** a PR title + body from the diff ONLY (no state/audit context). Prefix: skip the `## Branching` inference — if the type isn't obvious from the branch name, ask the user once "[EPIC] / [STORY] / [BUG] / [ENH]?" or omit if they don't care.
5. **Confirm** with the user (Phase 5 gate — always required), then push + create the PR with BOTH canonical labels `ai-generated` and `aire-anx-v[N]` (Phase 6). Report the PR URL.
6. **STOP.** Do NOT evaluate or run Phase 7 (archive) in this mode.

> Phases 1–7 below are the **FULL procedure** — used by workflow mode and by a standalone **cycle-close** PR. An ordinary standalone PR uses only the Fast Path steps referenced above.

---

## Phase 1: Preconditions & Safety Checks

> **Full procedure only** (workflow mode + standalone cycle-close). An ordinary standalone PR uses the  STANDALONE FAST PATH above instead.

1. Run `git status` and `git branch --show-current`.
   - If there are uncommitted changes, show them to the user and ask whether to commit them first,
     stash them, or proceed anyway (uncommitted changes will NOT be included in the PR).
2. **Resolve the target branch — never assume (`main` or any other branch)**:
   - **A PR is already open for this branch** (RH-1, once the step 5 access check passes): its target
     stands — do not ask; Phase 6 step 6 updates that PR.
   - **Invoked by a workflow not named in the next bullet** (`epic-enhancement`, `epic-bugfix`, `epic-change-request`,
     `remediate`, `archive-epic`, the requirements flow): use the target it passed — those runs
     promise no further questions.
   - **Invoked by `dev-implement`, `bug-fix-implement` or `enhancement-implement`, or a standalone
     cycle-close or story PR**: the proposal is the target the workflow passed (the Base Branch
     from `## Branching`), or the Base Branch resolved in Mode Detection. Ask once, then wait:
     ```
     Which branch should this PR be raised into?
     A) <proposed target> (Recommended — the recorded Base Branch)
     B) Another branch — type its name
     [Answer]:
     ```
     Accept `A`, or a branch name. Check the branch exists on origin
     (`git ls-remote --exit-code --heads origin <branch>`). Ask again, saying why, when it is missing,
     when it is the current branch, or when a `story/…` branch names the recorded Epic Branch (it holds
     documents only). Log the prompt and the complete raw answer in the audit trail — a story or ticket
     run writes them to its fragment `runtime-artifacts/stories/<story-key>/audit.md`.
   - **The answer differs from the target the workflow passed**: the invoking workflow merged in only
     the passed target, so run the pull-before-push step (`aire-workflow/workflows/dev-implement.md`
     Section D Step 4) against `origin/<chosen target>` before Phase 2. Show the chosen target in the
     Phase 4 draft and return it to the invoking workflow with the PR URL.
   - If the current branch IS the resolved target branch, stop and tell the user they need to be
     on a different branch to raise a PR into it.
3. Run `git fetch origin <target-branch>` to ensure the diff is computed against the latest remote
   target branch, not a stale local copy.
4. Confirm the current branch has a remote tracking branch. If not, note that it will need `-u` on push.
5. Read `## Repo Host` from `runtime-artifacts/aire-state.md` (absent → detect and record it per
   `aire-workflow/common/repo-host.md` Section 1) and run that host's access check (Section 2 — GitHub
   CLI or Azure CLI with the `azure-devops` extension). If it fails, stop and tell the user to
   authenticate first — do not attempt to work around this. Every PR operation below dispatches on
   this `Type` through the RH-n operations of `repo-host.md`.

---

## Phase 2: Diff Analysis

1. Get the full list of changed files and the diff between the target branch and the current branch:
   ```
   git diff --stat origin/<target-branch>...HEAD
   git diff origin/<target-branch>...HEAD
   ```
2. Get the commit log for the branch (commits ahead of target):
   ```
   git log origin/<target-branch>..HEAD --oneline
   ```
3. Categorize the changes: new features, bug fixes, refactors, docs, config, tests, infra.
4. Note any files that look risky to auto-summarize without care: migrations, build/deploy pipeline
   files, secrets/config files, deleted files.

---

## Phase 3: AIRE Context — runtime-artifacts/aire-state.md and runtime-artifacts/audit.md

This project tracks work in two shared files under `runtime-artifacts/`, plus one pair of fragment files
per story — `runtime-artifacts/stories/<story-key>/audit.md` and `state.md`
(`aire-workflow/common/parallel-work-state.md`). For a story PR (`[STORY]`, `[BUG]`, `[ENH]`) read
that story's fragment first — its audit trail and Story Tracker row live there; for an `[EPIC]` PR read
the resolved view (shared files plus every fragment). Use them to ground the PR summary in
what was actually planned and recorded, not just the raw diff.

1. Read `runtime-artifacts/aire-state.md`:
   - Extract the Story Tracker table. Identify which Story rows have a status past `ToDo`
     (normally `In Progress` for a story PR) that fall within the current branch's scope
     (match by story IDs mentioned in commit messages, branch name, or changed file paths).
   - Note the dependency context (`Requires`) for those stories.
2. Read `runtime-artifacts/audit.md`:
   - Scan for audit entries whose timestamps fall after the branch diverged from the target branch
     (i.e., after the commit at `git merge-base origin/<target-branch> HEAD`).
   - Extract the `User Input` / `AI Response` / `Context` for each relevant entry to understand
     the intent and decisions behind the changes, not just the code diff.
3. If either file doesn't exist or has no relevant entries, note that in the PR description
   ("No runtime-artifacts/aire-state.md/audit.md entries found for this branch — summary derived from diff only")
   rather than inventing content.

---

## Phase 4: Draft the PR

Synthesize Phase 2 + Phase 3 into a PR title and body. **Show the full draft to the user before
doing anything else** — do not push or create the PR yet. (In workflow mode this display is
the announcement of what is about to be pushed; in standalone mode it is the material for the
Phase 5 confirmation.)

### Title

**MANDATORY PREFIX — every PR title MUST start with `[EPIC]`, `[STORY]`, `[BUG]` or `[ENH]`** so reviewers can tell the PR type at a glance. Determine it from `## Branching` in `runtime-artifacts/aire-state.md`:
- **`[STORY]`** — the current branch is a story branch and the target is the recorded Base Branch (the dev-implement story-PR flow, and the `epic-enhancement` / `epic-bugfix` / `epic-change-request` change stories).
- **`[EPIC]`** — the current branch is the recorded Epic Branch and the target is the recorded Base Branch (the cycle-close PR that carries the archive).
- **`[BUG]`** — the current branch is the recorded Bug Branch and the target is the recorded Base Branch (the bug-fix-implement flow).
- **`[ENH]`** — the current branch is the recorded Enhancement Branch and the target is the recorded Base Branch (the enhancement-implement flow).
- The prefix follows the current branch: a target other than the Base Branch, chosen at Phase 1 Step 2, keeps it.
- If `## Branching` is missing or no pattern matches, ASK the user: "Is this an epic, story, bug, or enhancement PR? ([EPIC] / [STORY] / [BUG] / [ENH])" — never omit the prefix and never guess.

After the prefix: short (< 70 chars total), imperative, describing the net effect. Include the Story ID / Tracker ID when clearly identifiable.
Examples: `[STORY][S-014] Add payment retry logic`, `[STORY][4822] Session timeout fix`, `[EPIC][4800] Payment platform — planning & stories`, `[BUG][4840] Fix login session timeout`, `[ENH][4856] Export to CSV`.

### Work item (`[STORY]`, `[BUG]`, `[ENH]` only)

The ADO work item the PR delivers, linked in Phase 6 (`repo-host.md` RH-12): the ID the invoking
workflow passed; else the `Tracker ID` in the story's fragment `## Story Tracker Row`. None resolvable →
no link, and the draft says `Work item: none found`. `[EPIC]` PRs link nothing.

### Body Template

```markdown
> **ai-generated** — This pull request was generated by an AI agent using **[MODEL NAME]**.
> Please review carefully before merging.

## Summary
- [1-3 bullets on what changed and why, grounded in runtime-artifacts/aire-state.md/audit.md context]

## Changes
- [Bulleted list of the main code changes, grouped by area]

## Audit Trail Context
[1-2 sentences summarizing relevant runtime-artifacts/audit.md entries for this branch, or the
"no entries found" note from Phase 3.3]

## Tests & Review
[Copy each value from the story's evidence — never retype or estimate a number:
- Unit tests: X/X passing · changed-line coverage NN% (minimum 90%) — `reports/unit-test-evidence/<story-key>/evidence-manifest.md`
- API contract tests: X/X passing, or N/A with the reason — `reports/api-contract-test-evidence/<story-key>/evidence-manifest.md`
- Full regression: N new failures vs baseline (must be 0) — same manifest
- Eval scorecard: paste the table from `reports/eval-evidence/<story-key>/eval-summary.md` as-is (D1–D7, unit coverage, API contract, regression, J1, J2 and the verdict)
- Code review: verdict + version — `reports/reviews/<story-key>-code-review-v<X>.md`
- Security review: findings by severity (Critical / High / Medium / Low) — `reports/code-security-reviews/<story-key>-security-review-v<X>.md`
If the invoking workflow passed no story key, write exactly:
"No test or review evidence - this PR was not raised by an implement workflow."]

---
 Generated with AI — Model: **[MODEL NAME]**
 AIRE Framework: **v[N]**
```

Determine `[MODEL NAME]` from the current session (e.g., "Claude Sonnet 5", "Claude Opus 4.8") —
never leave this as a placeholder in the final PR.

The work item is never written into the description on Azure Repos — it goes in the PR's **Work Items**
section (RH-3 / RH-12). GitHub PRs have no such section, so there only, the body ends with `AB#<id>`,
which is what creates the link.

The framework version is read at runtime from the "AIRE Framework Version" line in `CLAUDE.md` (footer `v[N]`, label `aire-anx-v[N]`) — the same convention as every other file. Never hardcode it.

---

## Phase 5: User Confirmation (STANDALONE MODE ONLY)

> **WORKFLOW MODE — SKIP THIS PHASE ENTIRELY.** When this skill was invoked as a step by
> dev-implement, epic-enhancement, epic-bugfix, pr-fix, bug-fix-implement, enhancement-implement, requirements analysis, remediate or archive-epic, the
> user has ALREADY authorized the push and the PR by invoking that workflow (those workflows have no
> approval gates; the requirements flow's authorization is its requirements.md approval). Asking again is the same decision twice. Announce instead — print the
> target branch, the push that is about to happen, the Phase 4 draft and the labels — then go
> **straight to Phase 6**. Do NOT ask a yes/no question and do NOT wait for a reply.
>
> **STANDALONE MODE — this phase is REQUIRED; do not skip it.**

Present to the user:
1. The target branch and current branch.
2. Whether the branch will be pushed (and with `-u` if it has no upstream yet).
3. The full PR title and body draft from Phase 4.
4. The labels that will be applied: `ai-generated` and `aire-anx-v[N]` (`[N]` read live from `CLAUDE.md`).
5. The work item that will be linked (Phase 4), or `none`.

Ask explicitly: "Push this branch and open this PR with these contents — yes/no?"
Do not proceed to Phase 6 without an explicit yes. If the user asks for edits, revise the draft
and re-confirm.

**Again: this question is asked in STANDALONE mode only.** In workflow mode nothing is asked.

---

## Phase 6: Execute (standalone: only after the Phase 5 confirmation — workflow mode: immediately after Phase 4)

1. Push the current branch:
   ```
   git push -u origin <current-branch>     # if no upstream yet
   git push                                 # if upstream already tracked
   ```
2. **GUARDRAIL — always apply OUR canonical labels, regardless of any pre-existing similar labels.**
   The two labels this skill applies are EXACTLY (never a variant, never a substitute):
   - **`ai-generated`** (exact name shown)
   - **`aire-anx-v[N]`** — the FULL framework version including the minor, read live from `CLAUDE.md` (never the major only, never `aire-anx-v1`).

   A repo may already carry a *similar but different* label — e.g. `AI Generated`, `ai_generated`, `AI-Generated`, `bot`, `automated`, or one auto-added by another tool. That does NOT satisfy this skill's requirement. Do NOT reuse, rename, or substitute such a label, and do NOT let it cause you to skip creating ours. Always ensure our two exact labels exist and are the ones applied to the PR.

   Label setup is host-specific and lives in `aire-workflow/common/repo-host.md` RH-3: on GitHub the
   exact labels must exist in the repo first (decided by EXACT name match, never a fuzzy search —
   a *similar* label never counts as present); on Azure Repos a label is created the first time it is
   applied. If the exact label already exists, keep it as-is (do not recreate). If only a *similar*
   label exists, still create OUR exact label.
3. Create the PR with RH-3 (`--base`/target = `<target-branch>`, head/source = `<current-branch>`,
   title from Phase 4, both labels, the Phase 4 work item, and the Phase 4 body written to a file and
   passed from that file — never inline the multi-line body as a flag argument). RH-3 also carries the
   Azure Repos 4,000-character description cap and the flags AIRE never passes.
   **Then verify the work item link with RH-12** (fix or warn as it says). Record only what the
   read-back showed.
4. **VERIFY THE LABELS LANDED — do not assume passing labels at creation was honored.** Immediately
   after creation, read the PR's labels back (RH-2). If either exact label (`ai-generated`,
   `aire-anx-v[N]`) is missing, apply it now (RH-5), then re-verify. **Never
   report the PR as done, and never write "labels applied: ai-generated, aire-anx-v[N]" into
   `runtime-artifacts/audit.md`, on the basis of having passed label flags** — record only what
   reading the PR's actual labels back showed. A claim in the audit trail that does not match the PR is
   a defect in the audit trail ("VERIFY IT LANDED — do not assume").
5. Report the PR's web URL (RH-2 / `repo-host.md` Section 3) back to the user.
6. **If a PR for this branch ALREADY EXISTS** (found with RH-1 — see Execution Rule 7): do not create a duplicate. Push any new commits (the open PR tracks the branch and updates automatically) and, if the summary changed, update the PR body with RH-4 (append — never wipe the existing description). **Standalone mode**: get the user's confirmation first. **Workflow mode**: do it automatically, announcing what was pushed/updated.
   - **Re-sync the version label to the current framework version (`aire-anx-v[N]`).** An already-open PR may carry a stale `aire-anx-v*` label (e.g. `aire-anx-v1` from when it was first raised). Ensure the exact label `aire-anx-v[N]` exists (create it per Step 2 if absent), then reconcile the PR's labels with RH-5: add `aire-anx-v[N]` and `ai-generated`; list the PR's labels and remove every OTHER label matching `^aire-anx-v` that is NOT `aire-anx-v[N]`.
     Only touch `aire-anx-v*` labels (and ensure `ai-generated` is present) — never strip a user's or another tool's unrelated labels. Announce the relabel (e.g. ` Updated version label: aire-anx-v0.9 → aire-anx-v[N]`).
   - Ensure the Phase 4 work item is linked (RH-12 — on GitHub, the appended body keeps `AB#<id>`).
   - Report the existing PR URL. This path counts as a successful Phase 6 — it flows into Phase 7 exactly like a fresh creation.
7. **Do NOT end the turn here.** Proceed IMMEDIATELY to Phase 7 — its evaluation is mandatory whether a new PR was just created OR an existing PR for this branch was found/updated, with no exceptions.

---

## Phase 7: Auto-Trigger Archive (MANDATORY EVALUATION — never skip silently)

**EPIC CYCLES ONLY.** The archive auto-trigger applies exclusively to an Epic → Base PR. Bug and Enhancement cycles archive MANUALLY — on a `[BUG]` or `[ENH]` → Base PR, NEVER invoke `archive-epic`; print the manual reminder in Step 4 below instead. (Why: Verification Engineer's `/ve-implement` test-plan PR and `ve-list-work` Option C amendments land on the bug/enhancement branch on their own schedule, and the archive is the last commit before the PR merges — an archive taken at PR time would record a cycle whose test-plan edits are still arriving. The operator archives once everything has landed — see `workflows/bug-fix-implement.md` Step 12 / `workflows/enhancement-implement.md` Step 19.)

**This phase MUST be executed after every Phase 6 run — whether a NEW PR was created or an EXISTING open PR for this branch was found/updated.** An already-open Epic → Base PR triggers the archive the same way a fresh one does (if archive-epic already ran for this cycle — e.g., the archive folder already exists — archive-epic's own idempotency/collision checks handle that; still invoke it). Skipping the *trigger* is allowed when conditions fail; skipping the *evaluation* is NEVER allowed. You must show the evaluation to the user so a miss is visible, not silent.

**Step 0 — Re-sync the version label to the current framework version (`aire-anx-v[N]`, read live from CLAUDE.md) (ALWAYS, every run).** Before the archive checklist below, reconcile the PR's version label so it always reflects the current framework version — this runs on EVERY Phase 6 outcome (new PR OR existing PR found/updated), not just the "existing PR" path. Ensure the exact label `aire-anx-v[N]` exists (create it per Phase 6 Step 2 if absent), then reconcile the PR's labels with RH-5 — identical to Phase 6 Step 6's re-sync: add `aire-anx-v[N]` and `ai-generated`; remove every OTHER `^aire-anx-v` label that is NOT `aire-anx-v[N]`.
Only touch `aire-anx-v*` labels (and ensure `ai-generated` is present) — never strip a user's or another tool's unrelated labels. If the label was already current, this is a no-op; if it changed, announce it (e.g. ` Updated version label: aire-anx-v0.9 → aire-anx-v[N]`).

**Evaluate and PRINT this checklist** (fill in actual values) immediately after reporting the PR URL:

```
 Archive auto-trigger check:
1. Invocation: [standalone | from workflow <name>]          → [PASS/FAIL]
2. Cycle type: [epic | bug | enhancement]  (auto-trigger is EPIC-ONLY)   → [PASS/FAIL]
3. Current branch: <branch>  vs  recorded Epic Branch: <branch from ## Branching>  → [PASS/FAIL]
4. PR target: <branch>  vs  recorded Base Branch: <branch from ## Branching>       → [PASS/FAIL]
```

**Conditions — ALL must hold**:
1. This skill was invoked standalone (directly by the user via a trigger phrase like "raise a PR"), not as a step inside another workflow (dev-implement, requirements analysis, and remediate have their own PR flows; bug-fix-implement and enhancement-implement end with a MANUAL archive handoff — so workflow invocations are out of scope here).
2. The resolved cycle type is epic — `Workflow Type` in `## Tracker` is neither `bug` nor `enhancement`. A bug or enhancement cycle FAILS this condition by design; go to Step 4 below.
3. The current branch is the recorded Epic Branch and the PR just opened targets the recorded Base Branch — read from `## Branching` in `runtime-artifacts/aire-state.md`. (A story PR — raised from a story branch — does NOT match this condition.)
   - **If `## Branching` is missing** from `runtime-artifacts/aire-state.md`, do NOT silently fail the check — ask the user:
     ```
      No ## Branching section found in runtime-artifacts/aire-state.md, so I can't confirm this is the
        Epic/Bug/Enhancement → Base branch PR. Is <current-branch> the epic, bug, or
        enhancement branch and <target-branch> the base branch for this cycle?
        (yes — epic / yes — bug / yes — enhancement / no)
     ```
     Treat "yes — epic" as conditions 2–4 PASS. Treat "yes — bug" / "yes — enhancement" as condition 2 FAIL → Step 4 (manual reminder, no auto-trigger).

**If all conditions PASS** (epic cycle only): announce ` Epic → Base PR detected — invoking archive-epic automatically.` and invoke the `archive-epic` skill in the same turn (no separate trigger phrase needed from the user) — do not ask whether to run it, just run it. Pass along that it was auto-triggered by pr-generator from an Epic → Base PR. `archive-epic` gates on its own upstream readiness checks (incomplete stories, ve artifacts, archive collision) and on the byte-for-byte verification of the archive it writes; its removal/commit/push/PR steps are deliberately automatic in every mode, so this handoff neither adds nor needs a confirmation. Note: archive-epic ends by committing and pushing the cycle-close changes (archive, reset) on this same branch — the just-opened PR tracks the branch and will automatically include that commit. archive-epic writes the cycle's reverse-engineering delta to `spec/plans/delta/<EPIC-ID>-<slug>/`, archives it, and then removes the live `spec/`, `reports/` and `runtime-artifacts/` trees — but it never stitches. Tell the user, in this PR's handoff, that after merging this Epic → Base PR they must run `/stitch-delta` on the base branch — that skill reads the delta from the archive and publishes it to the Atlas deep dive via the Helix MCP, in its own PR whose diff is a single ledger row. Do NOT invoke `stitch-delta` from here: it runs post-merge, on base, and this PR has not merged yet.

> **GUARDRAIL — when archive-epic is required, pr-generator is NOT done until archive-epic has been invoked.**
> - When all Phase 7 conditions PASS, invoking `archive-epic` is **mandatory and part of this skill's completion** — the pr-generator skill is **only considered ended AFTER archive-epic has been handed off/run in the same turn**. Ending the turn after reporting the PR URL but before invoking archive-epic is an **incomplete run**.
> - **Do NOT suggest merging the PR, do NOT ask the user to merge, and do NOT recommend any next step** (no "now merge this PR", no "then run X", no options menu). The archive-epic runs BEFORE any merge (its commit rides the open PR). Say nothing about merging.
> - After archive-epic completes, hand control fully to archive-epic's own completion message — pr-generator adds no further suggestions of its own.

**Step 4 — If condition 2 FAILS because this is a BUG or ENHANCEMENT cycle** (`[BUG]`/`[ENH]` → Base PR): do NOT invoke `archive-epic`. State the FAIL in the checklist and print exactly this reminder, then end:
```
 Bug/Enhancement cycle — the archive is MANUAL and was NOT run.
   Run `archive-epic` yourself once ALL Verification Engineer work for this ticket has merged into
   `<cycle-branch>`.
```
This reminder is the ONE exception to the "no next step" rule below — it exists because nothing else will tell the user the archive is now theirs to run.

**If any other condition FAILS**: state which one failed in the printed checklist (do not skip invisibly), then end normally — without suggesting a merge or any next step.

> **Scope of the "no next step" rule**: it binds THIS skill only. The next-action instruction (merge the
> PR, switch branch, type the next keyword) is owned by whoever invoked pr-generator — `archive-epic`'s
> Next-Action Handoff for a cycle-close PR, `dev-implement`'s **Section F** handoff for a story PR, and
> the bug/enhancement implement workflows for their `[BUG]`/`[ENH]` PRs. pr-generator must not duplicate,
> pre-empt, or contradict those messages; it also must not suppress them.

---

## Execution Rules

1. **Standalone mode: never push or create the PR without the explicit confirmation from Phase 5** —
   there it is a non-negotiable gate, regardless of how confident the draft looks.
   **Workflow mode: never ask whether to push or open the PR — invoking that workflow (or, for the
   requirements flow, approving requirements.md) IS the authorization.** Its only question is the
   target branch, and only where Phase 1 Step 2 asks it; then print the draft and execute. Re-asking the push
   or the PR in workflow mode is a defect, not caution.
2. **Never fabricate Story status or audit entries** — if `runtime-artifacts/aire-state.md` or `runtime-artifacts/audit.md`
   don't mention the work on this branch, say so plainly in the PR body instead of guessing.
3. **Always name the actual model** generating the PR in both the label context and the body —
   never leave `[MODEL NAME]` unresolved.
4. **Diff against the fetched remote target branch**, not a possibly-stale local branch, to avoid
   a PR that looks empty or wrong due to a stale local main.
5. **Do not rewrite history** (no rebase/amend) as part of this flow — only fetch, diff, push, and
   open the PR. If the branch is behind target and has conflicts, tell the user and stop; do not
   attempt to resolve conflicts automatically.
6. **If the Repo Host's access check fails (`repo-host.md` Section 2), the repo has no `origin`
   remote, or the host is `UNSUPPORTED`**, stop and explain — do not attempt workarounds like manual
   API calls with tokens.
7. **One PR per run** — if a PR already exists for this branch (RH-1),
   never create a duplicate: update it (Phase 6 step 6). STANDALONE shows it to the user first and
   asks whether to update it; WORKFLOW MODE updates it automatically and announces it. Updating
   the existing PR (or even just confirming it's current) still counts as completing Phase 6 —
   the run MUST continue into Phase 7.
8. **Never open a PR whose title lacks the `[EPIC]`, `[STORY]`, `[BUG]` or `[ENH]` prefix** — resolve the PR type
   from `## Branching` (or ask the user) before drafting; a missing prefix is a Phase 4 defect,
   not a style choice.
9. **Phase 7 is not optional** — after every Phase 6 run (new PR created OR existing PR
   found/updated), the archive auto-trigger checklist MUST be evaluated and printed before
   the turn ends. Ending the turn after Phase 6 without the Phase 7 checklist is an incomplete
   run of this skill.
10. **Always apply our exact canonical labels (`ai-generated` and `aire-anx-v[N]`)** — a pre-existing
    similar label (`AI Generated`, `ai_generated`, `AI-Generated`, `bot`, `automated`, or any tool-added variant) is
    NOT a substitute and MUST NOT cause label creation to be skipped. Decide existence by EXACT name
    match (`repo-host.md` RH-3), create ours if the exact name is absent, and
    apply both exact labels to the PR. See Phase 6 Step 2.
11. **Passing labels at PR creation is NOT proof the labels landed** — creation can silently drop a
    label when it didn't exist at call time, or on a transient API hiccup.
    Read the created PR's labels back (Phase 6 Step 4) before reporting the PR as done or writing a
    labels-applied claim into `runtime-artifacts/audit.md`. A missing label caught here is fixed with
    RH-5 in the same run — never left for a later pass to notice.
