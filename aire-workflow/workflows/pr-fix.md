# WORKFLOW: `pr-fix [PR-NUMBER]` (Rejected PR — Review-Feedback Fix for a Story, Bug or Enhancement)

> **READ FIRST.** The non-negotiables at the top of `workflows/dev-implement.md` bind this workflow
> too: every gate runs (no scope calls), the claim (In Progress + assignee; a bug: Active) is made on the external
> tracker and recorded in the fragment's `## Claim` block — a `pr-fix` run whose story has no such block
> makes the claim now —, a disclosed gap is never shipped, and the run ends with the Step 18 handoff
> block verbatim — nothing else in that final message.

## WHAT THIS WORKFLOW IS

A story PR that a human rejected — a `[STORY]`, `[BUG]` or `[ENH]` PR into the base (development)
branch (a bug or enhancement cycle's ticket is its single story) — comes back to the framework through
this ONE keyword. The workflow:

1. asks which PR to fix (skipped when the PR number is typed with the keyword),
2. harvests every unresolved human review comment on that PR (developer, Verification Engineer, or any
   other reviewer),
3. triages each comment into a Feedback Ledger, fixes the actionable ones on the PR's own head
   branch,
4. **re-runs the COMPLETE gate chain of the workflow that originally built the story**
   (`dev-implement` / `bug-fix-implement` / `enhancement-implement`) — baseline, unit tests + coverage,
   API contract tests, test placement, full regression, static evals, the J1/J2 judge score checkpoint, the
   test-plan check, automated Code Review with the Security
   Baseline pass, auto-remediation,
5. pushes the fix to the same PR (never a new PR, never a force-push), refreshes the PR's
   `## Tests & Review` section, replies to every comment it acted on, re-requests review, and hands back.

It never merges the PR, never approves it, never resolves a review thread and never dismisses a
review — those stay human actions.

---

## Section 1 — When a PR gets rejected: the scenarios this workflow handles

### 1.1 What "rejected" means here

A PR is rejected when it is still OPEN and a human has signalled that it must change before it
can merge. Any of these signals makes it a `pr-fix` candidate:

| Signal | Where it lives | Typical author |
|---|---|---|
| A **Request changes** review | GitHub: a `CHANGES_REQUESTED` review · Azure Repos: a reviewer vote of `-5` (waiting for author) or `-10` (rejected) — `common/repo-host.md` Section 3 | Verification Engineer, a second developer, a tech lead |
| A **Comment** review or inline line comments asking for a change | GitHub: PR reviews / review threads · Azure Repos: comment threads with a file context | the developer who ran `dev-implement` (see the identity note below), Verification Engineer, any reviewer |
| A top-level PR conversation comment asking for a change | GitHub: PR conversation comments · Azure Repos: comment threads with no file context | anyone |
| A **Verification Engineer rejection on the tracker while the PR is still open** — the `Verification Engineer rejected the story` comment + `ve-rejected` label written by `ve-list-work` Option B | The ADO work item | Verification Engineer (normal on bug/enhancement cycles, where sign-off happens on the bug/enhancement branch **before** the PR merges) |

**Identity note — the developer's own comments ARE human feedback.** `dev-implement`, `pr-generator`
and the AUTO-MODE `pr-review` all act under the developer's own identity on the repo host, so the
developer is the PR author. GitHub will not let them submit a formal Request changes on their own
PR, and on Azure Repos the minimum-reviewers policy does not count the author's own vote by default. A developer therefore
rejects their story PR with comments and inline comments. This workflow
never skips a comment because its author is the PR author; it tells human comments apart from the
framework's own output by record, not by login (Step 4.3).

### 1.2 Developer rejection scenarios

| # | Scenario | Example comment | Ledger class (Step 5) |
|---|---|---|---|
| DR1 | An AC is implemented but an edge case is wrong | "Empty cart still lets checkout through — AC-3 says it must be blocked." | FIX-CODE |
| DR2 | Code sits in the wrong layer or contradicts a decision in `architecture.md` | "Pricing logic is in the controller; architecture.md puts it in the service layer." | FIX-CODE |
| DR3 | Repo convention / naming / structure mismatch | "We use `snake_case` for DB columns in this repo." | FIX-CODE |
| DR4 | Tests are weak, missing or misplaced | "This test mocks the unit under test, it asserts nothing." | FIX-TEST |
| DR5 | Performance problem | "N+1 query in `listOrders` — load items in one query." | FIX-CODE |
| DR6 | Security concern on the changed surface | "The token is logged at INFO level." | FIX-CODE |
| DR7 | The PR no longer merges cleanly / integrates badly after a sibling story merged into the base branch | "Conflicts with Story 1.3's migration." | handled by Step 3 (merge) + FIX-CODE |
| DR8 | Scope creep — unrelated files changed | "Why is `billing/` touched? Revert that." | FIX-CODE (revert) |
| DR9 | A question, no change requested | "Why a queue here instead of a direct call?" | ANSWER |

### 1.3 Verification Engineer rejection scenarios

| # | Scenario | Example comment | Ledger class (Step 5) |
|---|---|---|---|
| V1 | A manual test-plan step fails on the PR branch (expected ≠ actual) | "TC-E2E-04 step 5: expected 'Order placed', got a blank page." | FIX-CODE |
| V2 | The code meets the letter of the AC but not its intent, and the Verification Engineer's reading changes the contract | "AC-2 means *all* roles, not just admins." | AMEND-AC (asks first — Step 6) |
| V3 | UI defect: copy, label, layout, missing error message, accessibility | "Submit button has no accessible name; focus is lost after the error." | FIX-CODE |
| V4 | API defect | "Invalid payload returns 500, the design says 400 with the error envelope." | FIX-CODE |
| V5 | A test-plan case has no automated counterpart | "TC-API-07 (expired token) is not covered by any automated test." | FIX-TEST |
| V6 | Regression in a flow an earlier story shipped | "Login redirect broke after this PR." | FIX-CODE |
| V7 | Works only with local seed data / missing migration | "Fails on a clean DB — the migration is missing." | FIX-CODE |
| V8 | Rejected on the tracker (`ve-list-work` Option B) while the `[BUG]`/`[ENH]` PR is still open | tracker comment `Verification Engineer rejected the story — <finding>` | FIX-CODE / FIX-TEST |

### 1.4 Outcomes that are NOT a code change

| Situation | Ledger class | What happens |
|---|---|---|
| The request contradicts an approved AC / requirement | AMEND-AC | Asked once (Step 6): amend the contract, keep it, or defer |
| The request would break the Security Baseline, a decision recorded in `architecture.md`, or is a forbidden shortcut ("skip this test", "suppress the security finding", "lower the coverage bar") | DECLINE | Not applied; the reply cites the rule it would break (SH-6) |
| Valid, but belongs to another story or is new scope | DEFER | Not applied; the reply recommends `/raise-defect` or a new story |
| Two reviewers ask for incompatible things, or the comment is ambiguous | CONFLICT | Asked once (Step 6) |
| The current head already satisfies it (often an outdated thread) | ALREADY-ADDRESSED | Reply with the `file:line` evidence |

### 1.5 When `pr-fix` is the WRONG tool — route instead

| Situation | Route |
|---|---|
| The PR is **MERGED** (e.g. the Verification Engineer rejected an epic story via `ve-list-work` after its `[STORY]` PR merged — the story is now `Bug fixing`) | A merged PR cannot be updated. The finding is a bug raised with `/raise-defect` (linked to the story) and fixed under that bug (`common/status-model.md` Section 3). |
| The PR is **CLOSED without merging** | Reopen it first, then `pr-fix`; or re-run the owning implement workflow. |
| The PR is an `[EPIC]` PR, a `[TEST]` PR (Verification Engineer test plans), a `[STITCH]` PR or a distribution PR | Out of scope. Test-plan PRs are amended with `ve-list-work` Option C or `/ve-implement`. |
| The review comment is on a PR not raised by AIRE (no `ai-generated` label) | Out of scope — there is no story, spec or evidence to re-run against. |

---

## THIS WORKFLOW ASKS ONE THING — WHICH PR

**Naming the PR is the only user decision in a normal run.** Everything after it runs without an
approval prompt: harvesting, triage, the fix plan (announced, not approved), the fix, the full gate
chain, the review, remediation, the commit, the push, the PR update, the replies and the handoff.

There are exactly three sanctioned stops — none of them an approval of the framework's own work:

1. **Step 6 Clarification** — asked only when the Feedback Ledger contains AMEND-AC or CONFLICT
   items. A human reviewer asking to change an approved contract, or two reviewers disagreeing, is a
   human decision the framework must not make alone. Asked once, as one inline block.
2. **Step 2.6 Archived-cycle recovery** — asked only when the bug/enhancement cycle archive has already
   run on the PR's head branch.
3. **Retry-limit halts (SH-4)** inherited from the owning workflow — halts, not questions.

A user who volunteers a correction mid-run is an interrupt — apply it, record it in the Feedback
Ledger and the audit trail, and continue. Never turn it into a standing gate.

---

## SINGLE-SESSION EXECUTION — NO FORKS, NO DELEGATION

This workflow runs from start to finish in the session where the user typed `pr-fix`. It is the
same rule `workflows/dev-implement.md` Step 1.7 enforces, restated here because this workflow re-runs
that workflow's gates:

- **Never** hand this workflow, or any step of it, to another execution context: no Agent-tool fork,
  no general-purpose / Explore / Plan subagent, no Workflow-tool orchestration, no background or remote
  agent, no second Claude Code session, no `claude -p` subprocess. Harvesting, triage, planning,
  coding, every gate, the Code Review pass, remediation, the commit, the push, the PR update and the
  replies are all done by this session's own tool calls.
- The `agents/*.md` files this workflow loads (`code-security-review-agent.md`,
  `ve-implement-agent.md`) are procedures executed inline in this session — never spawned as
  subagents. The Code Review pass is kept read-only by discipline (no `Edit`/`Write` on `src/**` or
  `tests/**` during the review pass), never by spawning a read-only subagent.
- Skills this workflow invokes (`ve-implement`, `pr-review`) run inline via the Skill tool.
- Long test suites run through this session's own shell. A command may run in the background only if
  this session waits for it to finish before advancing — a gate never advances on a result it has not
  read.
- **If this run is itself executing inside a fork or a subagent**, Step 0 HALTS it before anything is
  read or changed.

---

## MANDATORY: Rule Details Loading

Resolve the rule details directory (`aire-workflow/`) and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`,
  `common/question-format-guide.md`, `common/audit-logging.md`, `common/tracker-sync.md`,
  `common/branching-strategy.md`, `common/requirements-traceability.md`, `common/story-artifacts.md`
- **The owning workflow resolved at Step 2.3, in full** — `workflows/dev-implement.md`,
  `workflows/bug-fix-implement.md` or `workflows/enhancement-implement.md`. Its gates are executed **by
  reference** at Step 11 and Step 13; its Self-Healing Retry Policy (SH-1 … SH-7) and its Retry-Limit
  Report bind this workflow too.
- `implementation/code-generation.md` (Generation Phase Rules, the code gates in Steps 11a–11d including 11a.5 and 11c.5, and the judge score checkpoint in Step 11c.6),
  `workflows/code-review.md` + `implementation/code-review.md`, `workflows/remediate.md` +
  `implementation/remediate.md`

---

## SELF-HEALING RETRY POLICY — INHERITED, PLUS ONE LOOP

Every automatic loop in this workflow is governed by the owning workflow's **SH-1 … SH-7**: 3 attempts
per loop, independent per-loop counters, every attempt logged with its root cause, exhaustion HALTS
with the Retry-Limit Report, a stall ends the budget early, no weakening of any check.

- **Counters are per pr-fix round.** A new `pr-fix` invocation on a PR starts a new round (Step 2.7)
  with fresh counters. Resuming a halted round continues that round's counters (SH-2), except the loop
  that halted: the developer's manual fix and hand-back (`pr-fix <n>` again) grants it a fresh budget.
- The loops re-run here keep their owning-workflow IDs (SH-LOOP-1 … 4, 6, 8, 9 and 10, Step 11 table), plus:

| ID | Loop | Defined in | Verification that must pass to exit |
|---|---|---|---|
| **SH-LOOP-5** | Feedback Resolution Verification | Step 12 | Every FIX-CODE, FIX-TEST and applied AMEND-AC ledger item is demonstrably satisfied by the head diff, with `file:line` evidence |

The Retry-Limit Report is the Self-Heal Limit message in `common/self-heal-limit-guidance.md` Section 2,
emitted verbatim with one extra line under `Branch:` — `PR:        #<n> (<url>) — pr-fix round <R>` —
the "HOW TO FIX IT YOURSELF" steps from its Section 3 playbook row, and resume keyword = `pr-fix <n>`.
Typing `pr-fix <n>` again after a manual fix is a hand-back: Step 2.7 resumes the in-progress round and
applies the resume protocol of Section 4 (check the manual change, reject forbidden shortcuts, keep the
developer's code, fresh budget for the halted loop only).

---

## MANDATORY: Audit Entry Format

Every audit entry written by this workflow carries the owning workflow's fields **plus two**:

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO 8601 from ONE real clock command]
**User Email**: [current session email — read live from the session context]
**User Input**: "[Complete raw user input - never summarized]"
**TRACKER ITEM**: "[clickable ADO work item link]"
**Epic Link**: "[full Parent Epic URL from ## Tracker, or "none"]"
**AIRE VERSION**: "[read live from the "AIRE Framework Version" line in CLAUDE.md]"
**PR**: "[#<n> — <PR URL>]"
**PR-FIX ROUND**: "[R]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

Self-healing entries also add `**SH-LOOP**:`, `**Root cause**:` and `**Verification**:`. Append only,
to the END of the file.

## PARALLEL-SAFE STATE — THIS PR WRITES ONLY ITS STORY'S FRAGMENT (`common/parallel-work-state.md`)

A `pr-fix` round commits on a PR head while other PRs merge into the same base branch. So it
**never writes the shared `runtime-artifacts/audit.md` or `runtime-artifacts/aire-state.md`**:

- **`[STORY]` PRs (epic cycle)**: the head branch carries code and unit tests only. Open the docs
  worktree first (`common/branching-strategy.md` Section 4 item 1); every `spec/`, `runtime-artifacts/`
  and `reports/` path below means `.aire-docs/…`, and those files are committed and pushed to the epic
  branch through the worktree (Section 4 item 3) — never to the head branch. `[BUG]` / `[ENH]` PRs keep
  their documents on their own branch, as before.

- Every audit entry goes to `runtime-artifacts/stories/<story-key>/audit.md` — the story's existing
  fragment (`story-<N.M>`, `bug-<ID>`, `enhancement-<ID>`), plus `**Story**:`. Step 1 entries are held
  until Step 2 resolves the story key.
- The Story Tracker row, `## PR Feedback Rounds`, progress and SH counters go to
  `runtime-artifacts/stories/<story-key>/state.md`.
- This overrides every mention of those two shared paths below. Reads use the resolved view.
- A PR head that already carries shared-file edits is corrected by the State Isolation Check
  (Section 5.5) before this round's commit: it moves them into the fragment and restores the shared
  files.
- Step 3's merge of the target branch into the head can therefore never conflict on bookkeeping.

---

## Step 0 — Single-Session Check (MANDATORY, before anything else)

Determine whether this run is the user's own interactive session or a fork / subagent (signals: the
run's own instructions say it is a fork or a subagent, tell it to "execute directly" or not to spawn
agents, or the Agent tool is unavailable to it).

- **Main session** → continue silently.
- **Fork or subagent** → HALT immediately. Read nothing further, change nothing, and output:
  ```
   pr-fix MUST RUN IN YOUR OWN SESSION
     This run is executing inside a [fork | subagent]. pr-fix never runs delegated — every fix and
     every gate must happen in the session you typed it in.
     Nothing was read, changed, committed or pushed.
  Type pr-fix in your main Claude Code session.
  ```
  Log the halt if the audit file is reachable.

## Step 1 — Which PR?

1. **Log** the invocation (complete raw input).
2. **PR given with the keyword** (`pr-fix 142`, `pr-fix #142`, or a PR URL) → use it; go to Step 2.
3. **No PR given** → list the open AIRE PRs (`common/repo-host.md` RH-1, "Open AIRE PRs", per
   `## Repo Host`) and ask. Keep only titles starting `[STORY]`, `[BUG]` or `[ENH]`. For each, read
   the review decision (RH-2) and count unresolved review threads (RH-7, unresolved per its
   normalisation). Present:
   ```
   Which PR should I fix? (number or URL)

   #    Type     Story            Review decision     Unresolved threads   Head → Target
   142  [STORY]  Story 1.2 4822   CHANGES_REQUESTED   4                    story/1.2-… → epic/4800-…
   151  [BUG]    4840             REVIEW_REQUIRED     2                    bug/4840-… → main

   [Answer]:
   ```
   On Azure Repos show PRs as `!<n>` and the review decision as the normalised "changes requested"
   when any reviewer vote is `-5` or `-10` (RH-2, `common/repo-host.md` Section 3).
   Sort changes-requested first, then by unresolved-thread count. If there are no candidates, say so
   and stop. Never guess the PR — wait for the answer, and log it verbatim.

## Step 2 — Resolve the PR, the story and the preconditions

1. **Read the PR** with `common/repo-host.md` RH-2 — number, title, state, draft, source and target
   branch, labels, author, review decision, mergeable, web URL, body and head commit (normalised per
   Section 3).
2. **State check**:
   - `MERGED` → stop with the Section 1.5 route (raise a defect → `ticket-implement`).
   - `CLOSED` → stop: reopen it or re-run the owning implement workflow.
   - `OPEN` (draft or not) → continue.
3. **Resolve the story and the owning workflow** — all three signals must agree:

   | Title prefix | Head branch | Target branch | Story | Story key | Owning workflow |
   |---|---|---|---|---|---|
   | `[STORY]` | `story/<…N.M>-…` | the Base Branch in `## Branching` | Story N.M (Story Tracker row whose `PR` column is this PR) | `story-N.M` | `workflows/dev-implement.md` |
   | `[BUG]` | `bug/<ID>-…` | the Base Branch | the bug ticket (the PR in its state fragment, or live from the bug branch) | `bug-<ID>` | `workflows/bug-fix-implement.md` |
   | `[ENH]` | `enhancement/<ID>-…` | the Base Branch | the enhancement ticket | `enhancement-<ID>` | `workflows/enhancement-implement.md` |

   Any other prefix, a missing `ai-generated` label, or signals that disagree → stop with the
   Section 1.5 route, naming the mismatch. Load the owning workflow now.
4. **Working tree**: `git status --porcelain` must be empty. Uncommitted changes → stop and tell the
   user to commit or stash them; never stash or discard them yourself.
5. **Tracker**: resolve the story's `Tracker ID` from the Story Tracker / `## Tracker`.
6. **Archived-cycle check (bug/enhancement PRs)**: after Step 3 checks out the head branch, if
   `runtime-artifacts/aire-state.md` or `spec/` is missing there and
   `aire-archives/{bugs|enhancements}/<ID>-<slug>/` exists, the cycle archive already ran on this PR.
   The gates cannot re-run without the live `spec/`, `reports/` and `runtime-artifacts/`. Ask once:
   ```
    The cycle archive already ran on <head-branch> (commit <sha>), so spec/, reports/ and
      runtime-artifacts/ are no longer live. Fixing this PR needs them back.
      A) Revert the archive commit (git revert <sha> — no history rewrite), fix, then YOU re-run
         archive-epic before the PR merges
      B) Stop — nothing changed
   [Answer]:
   ```
   A → `git revert --no-edit <archive-sha>`, announce it, and carry a reminder into the Step 18
   handoff. B → stop. Log the prompt and the raw answer.
7. **Round number** — round states: `in-progress` (before this round's commit) → `pushed` (its
   `pr-fix round <R>` commit is on the PR head) → `complete` (Steps 15–17 done; recorded locally and
   carried by the next commit). R = 1 + the number of `pushed` or `complete` rounds for this PR in the
   resolved `## PR Feedback Rounds` (the story's fragment
   `runtime-artifacts/stories/<story-key>/state.md` plus the shared section —
   `common/parallel-work-state.md` Section 4). A round recorded `pushed` (or an `in-progress` round
   whose commit is already on the PR head) was interrupted after its push — resume it from Step 15. If
   that table has an in-progress round for this PR, resume it: reload its Feedback Ledger and SH
   counters and continue from the gate it stopped at, skipping every gate the ledger records as passed.
   Announce which.

## Step 3 — Sync the head branch (no history rewrite, ever)

1. `git fetch origin`, `git checkout <head-branch>`, `git pull --ff-only`.
2. **Bring the target in**: if `origin/<target>` has commits the head lacks
   (`git rev-list --count HEAD..origin/<target>` > 0), merge it:
   `git merge --no-ff origin/<target> -m "Merge <target> into <head-branch> (pr-fix round R)"`.
   - Clean merge → record it; the baseline is recaptured at Step 8.
   - Conflicts → resolve them as part of this round, grounding each hunk in both sides' specs
     (the other story's ACs are as binding as this one's). A conflict whose correct resolution
     cannot be derived from the specs → abort the merge (`git merge --abort`), HALT, and report the
     files and the competing intents.
   - Never `git rebase` a pushed branch, never `git push --force`.
3. Log the head SHA before and after, and the merge result.

## Step 4 — Harvest the feedback

1. **Harvest with `common/repo-host.md` RH-7** (per `## Repo Host`) — every review thread (resolved,
   outdated, file and line, its comments), every review or reviewer vote, and every PR-level comment,
   normalised as RH-7 describes. The rules below use only those normalised terms.
2. **Tracker feedback**: read the story's work item comments created after the PR
   was opened and keep those starting `Verification Engineer rejected the story`.
3. **Separate human feedback from the framework's own output — by record, never by login**:
   - **Exclude as framework output**: every review and review comment whose ID the audit trail records
     as an AUTO-MODE `pr-review` post (the owning workflow's auto PR review step, and Step 16 of earlier
     rounds); every comment carrying an `<!-- aire:` marker; comments by bot accounts.
   - **Include an auto-review thread only when a human replied in it** asking for action ("agreed,
     please fix") — the human reply makes it human feedback.
   - **Exclude**: resolved threads; pure approval or praise ("LGTM", "nice"); and any item whose
     latest message is a pr-fix reply (marker present) with no later human message — it was handled in
     an earlier round.
   - **Keep outdated threads** that are still unresolved — they become ALREADY-ADDRESSED if the head
     now satisfies them, otherwise normal items.
4. **Nothing actionable** → if the review decision is changes requested (`common/repo-host.md`
   Section 3) with no actionable text, say:
   `PR #<n> has changes requested but no comments to act on — ask the reviewer to add the change they
   need as a comment, then type pr-fix <n>.` Otherwise say `Nothing to fix on PR #<n>.` Stop without a
   commit. Log it either way.

## Step 5 — Triage into the Feedback Ledger

Give every harvested item an ID `FB-NN` and exactly one class:

| Class | Meaning | Action |
|---|---|---|
| **FIX-CODE** | A defect or change within the approved ACs, requirements and design (includes in-scope nits) | Fixed at Step 10 |
| **FIX-TEST** | A missing, weak or misplaced test | Fixed at Step 10 |
| **AMEND-AC** | Asks for behaviour that differs from an approved AC or `Covers` requirement | Step 6 decides |
| **CONFLICT** | Incompatible requests, or too ambiguous to act on safely | Step 6 decides |
| **ANSWER** | A question with no change requested | Answered in the reply; if answering reveals a defect, reclassify FIX-CODE |
| **DECLINE** | Would break the Security Baseline, a decision recorded in `architecture.md`, an approved AC, or is a forbidden shortcut (SH-6) | Not applied; the reply cites the rule |
| **DEFER** | Valid but outside this story's scope | Not applied; the reply recommends `/raise-defect` or a new story |
| **ALREADY-ADDRESSED** | The current head already satisfies it | Reply with `file:line` evidence |

Rules:
- **Ground every classification**: cite the AC / REQ-ID / `architecture.md` section / SECURITY-NN it
  rests on. A classification with no citation is a triage defect — redo it.
- **Read the comment against the code it points at** (`path` + `line` for inline threads) before
  classifying. Never classify from the comment text alone.
- A reviewer comment is never DECLINE merely because it is inconvenient; DECLINE needs a cited rule.
- Split a comment that asks for several things into several items.

Write the ledger to `reports/pr-feedback/<story-key>/round-<R>/feedback-ledger.md`:

```markdown
# Feedback Ledger — PR #<n> — <story> — round <R>
Head at start: <sha> · Target: <target> · Started: <ISO timestamp>

| ID | Source | Author | Where | Request (quoted) | Class | Grounded in | Status | Evidence |
|----|--------|--------|-------|------------------|-------|-------------|--------|----------|
| FB-01 | review thread <url> | @login | src/cart/service.ts:88 | "…" | FIX-CODE | AC-3 | open | — |
```

Announce the ledger summary (counts per class) and log it in full. Record the round as
`in-progress` in `## PR Feedback Rounds` (Step 17 lists the columns).

## Step 6 — Clarification (CONDITIONAL — the only question in a normal run)

**Skip this step entirely when the ledger has no AMEND-AC and no CONFLICT items.** Otherwise ask ONE
inline block covering all of them, and wait:

```
 PR #<n> needs your decision on <K> item(s) before I change anything:

FB-03 — @<login>, inline src/orders/api.ts:42: "<quoted request>"
   Conflicts with the approved contract: AC-2 of Story 1.2 — "<AC text>"
   A) Amend the contract — update the AC, the covered requirement, the test plan and the tracker
      item together, then implement it
   B) Keep the approved contract — decline FB-03, citing AC-2 in the reply
   C) Defer — out of this PR; I will recommend a new ticket in the reply

FB-05 — CONFLICT between @<dev-login> (src/ui/form.tsx:10) and @<ve-login> (review <url>):
   @<dev-login>: "<quote>"   @<ve-login>: "<quote>"
   A) Follow @<dev-login>   B) Follow @<ve-login>   X) Other (describe)

[Answer]:  (one line per item, e.g. "FB-03 A, FB-05 B")
```

Validate that every listed item got exactly one answer; re-ask only for missing or invalid ones. Apply
the answers to the ledger (A on AMEND-AC → it stays AMEND-AC and is applied at Step 7; B → DECLINE;
C → DEFER; a CONFLICT answer → FIX-CODE / FIX-TEST in the chosen direction, or DECLINE). Log the prompt
and the complete raw answer.

## Step 7 — Apply approved contract amendments (only for AMEND-AC items answered A)

A contract change moves every artifact that encodes it together, in this order, each change
announced and logged as a reconciliation citing the FB-ID and the comment URL:

1. The AC in `spec/plans/stories.md` (bug/enhancement: the single story section), and the tracker item's
   description / AC field via `common/tracker-sync.md`.
2. The covered REQ text in `spec/plans/requirements.md`, only if the requirement itself changed.
3. The manual test plan — invoke the `ve-implement` skill in WORKFLOW MODE, scoped to the amended
   AC(s); it re-derives those cases with AC traceability. Never hand-edit the plan to match code.
4. `spec/plans/architecture.md` only if a design decision changed (`implementation/architecture-doc.md`).

These edits ride this round's commit.

## Step 8 — Baseline for this round

The full-regression gate diffs against a baseline, and that baseline must describe the target branch as
it is now.

- **Reuse** the story's existing `baseline-regression.log` and `reports/eval-evidence/<story-key>/static/baseline/` (committed on the head branch under
  `reports/unit-test-evidence/<story-key>/`) only if Step 3 merged nothing and
  `git merge-base origin/<target> HEAD` equals the base SHA recorded in the original run's evidence
  manifest. Record `baseline: reused (<sha>)`.
- **Otherwise recapture**, in this session, at the current merge-base, using a throw-away worktree in
  the scratchpad (a directory, not a new session):
  ```bash
  BASE_SHA="$(git merge-base origin/<target> HEAD)"
  git worktree add "<scratchpad>/aire-pr-fix-baseline-<key>" "$BASE_SHA"
  ```
  1. Install the dependencies with the project's own install command and run the full test suite
     and the static eval baseline commands (`implementation/code-generation.md` Step 11c.5, item 1)
     there.
  2. Write the results over the story's `baseline-regression.log` and `reports/eval-evidence/<story-key>/static/baseline/`,
     marking its evidence manifest `baseline recaptured by pr-fix round <R> at <BASE_SHA>`.
  3. Remove the worktree (`git worktree remove --force <path>`) on every exit path.
- Baseline failures stay pre-existing debt: logged, never fixed here, never blocking.

## Step 9 — Fix plan (announced, not approved)

Write `spec/spec-generation/<story-key>-pr-fix-round-<R>.md`:
- one checkbox step per change, each tagged with the FB-ID(s) it resolves and the AC / REQ-ID it
  touches,
- a trace self-check: every FIX-CODE, FIX-TEST and applied AMEND-AC item appears in at least one step
  (blocking, fixed silently before announcing),
- nothing that is not traceable to a ledger item — no opportunistic refactors,
- the `Coding guidelines:` line, with every fix following them (`implementation/code-generation.md`
  Step 1.8).

Re-read the file from disk to confirm it exists, then announce it and log it under a plain heading
(`## pr-fix Round <R> — Plan Finalized (auto-approved, no gate)`). Never ask for approval.

## Step 10 — Apply the fixes

Execute the plan exactly, marking each step `[x]` as it completes. Application code goes in `src/` (or
the recorded `## Code Root`), unit tests under the repo-root `tests/unit/`, nothing in `spec/` except
Step 7's contract edits. A needed deviation → revise the plan file, announce what changed and why, log
it, continue. No emoji in code or tests (`implementation/code-generation.md` Generation Phase Rules).
**Fix the code, never the check**: SH-6 forbids deleting, skipping or weakening a
test, lowering the coverage minimum or editing an existing test plan to make feedback "pass".

## Step 11 — Re-run the COMPLETE gate chain

Run every code gate of the owning workflow, in its order, exactly as that workflow defines it,
against the whole story — its full diff versus `git merge-base origin/<target> HEAD`, not only this
round's fix. A reviewer's comment fixed in one place must not have broken an AC somewhere else in the
same story.

| Gate (`implementation/code-generation.md`) | Loop |
|---|---|
| Unit Test & Coverage (Step 11a) | SH-LOOP-1 |
| API Contract Tests, when the story adds or changes an endpoint (Step 11a.5) | SH-LOOP-8 |
| Test Placement (Step 11b) | SH-LOOP-2 |
| Full Regression vs the Step 8 baseline (Step 11c) | SH-LOOP-3 |
| Static Evals vs the Step 8 static baseline (Step 11c.5) | SH-LOOP-9 |
| Judge score checkpoint J1/J2, on the whole story's diff (Step 11c.6) | SH-LOOP-10 |
| Test-plan check (Step 11d) | — |

Round-specific rules:
- **Evidence** is refreshed in place under `reports/unit-test-evidence/<story-key>/`,
  `reports/api-contract-test-evidence/<story-key>/` and `reports/eval-evidence/<story-key>/` (scorecard included); the previous
  round's evidence stays in git history. Every evidence manifest records `pr-fix round <R>`.
- **Every gate runs**, including ones that passed in the original run. "It passed last time" is not
  evidence for this head.
- **Change, bugfix and Change Request stories** (a `[STORY]` PR whose story has
  `spec/plans/change-story-<N.M>.md` or `spec/plans/bugfix-story-<N.M>.md`, raised by `epic-enhancement` /
  `epic-bugfix`, or whose `**Change Request**:` field names a bundle
  `spec/plans/change-requests/CR-<n>/`, raised by `epic-change-request`): also honour that
  document's Test Change Authorization list in the regression gate and run
  `workflows/epic-enhancement.md` Step 12 (Test Impact Reconciliation, SH-LOOP-6) after the chain —
  for a bugfix story including its reproduction check (`workflows/epic-bugfix.md` Step 14), and for a
  Change Request story including its stale-trace check (`common/change-request-rules.md` CR5: every
  amended requirement has a story tracing to its new version). A reviewer comment that needs an earlier
  story's test changed beyond the list is an AMEND-AC item (Step 6), never a silent list extension.
- Exhaustion of any loop → SH-4: HALT at that gate with the Retry-Limit Report. No commit, no push, no
  PR update, no tracker change; the round stays `in-progress` in `## PR Feedback Rounds`.

## Step 12 — Feedback Resolution Verification (SH-LOOP-5)

For every FIX-CODE, FIX-TEST and applied AMEND-AC item, re-read the original comment and the head diff,
and confirm the request is actually satisfied — not merely touched. Record `resolved` with `file:line`
evidence (and the test that proves it, where one exists) in the ledger.

- Every item resolved → Step 13.
- Any item not resolved → fix it, then re-enter Step 11 at the earliest gate the change affects,
  continuing those loops' existing counters (SH-2). One fix-and-reverify cycle is one SH-LOOP-5
  attempt; cap 3; exhaustion → SH-4 HALT naming each unresolved FB-ID.

## Step 13 — Automated Code Review, security review, auto-remediation

Execute the owning workflow's review block — Code Review → verdict routing → auto-remediate —
unchanged, with these additions:
- The review produces the next report version `v[X+1]` under `reports/reviews/`; its Phase 0 mode is
  whatever `implementation/code-review.md` Phase 0 selects from the report history.
- Pass the Feedback Ledger in as review input. The report adds a Review Feedback Resolution table
  (FB-ID → class → status → `file:line`), and a FIX-* item the review finds unresolved is a Blocker finding.
- The Phase 2.5 security pass stays diff-scoped to the whole story; its Blocker/High findings become
  `SEC-ISS-XXX` findings.
- Findings → the auto-remediate loop (SH-LOOP-4), max 3 rounds, re-running the unit-test, regression,
  static-eval steps and the judge score checkpoint the fix touches, then re-reviewing. The review runs inline and read-only by discipline
  (Single-Session Execution).

## Step 14 — Resolution summary, commit, push

1. **Resolution summary**: write `reports/pr-feedback/<story-key>/round-<R>/resolution-summary.md` — the
   final ledger, the gate results (unit tests X/X, changed-line coverage %, new regression failures,
   review verdict and version, security findings by severity), the commit(s) and the review report
   version.
1.5. **Conflict-free check (R6-B)** — for a `[STORY]` PR, run the R6 build-time check
   (`planning/dependency-graph-generation.md`) on the round's changes before committing. A fix must not
   pull in a file that an independent, unmerged story touches: an overlap with a story that has not
   started gets the R6 edge; an overlap with a story in flight HALTs this round before the commit, with
   that section's message. `[BUG]` / `[ENH]` PRs have no sibling stories — skip silently.
2. **Commit** on the head branch, once the evidence set of `common/story-artifacts.md` is present for
   this round — the fix, tests, Step 7 contract edits, refreshed evidence, the ledger and summary, and
   the story's state fragment `runtime-artifacts/stories/<story-key>/` with this round recorded `pushed`
   in `## PR Feedback Rounds` — nothing unrelated, and never the shared `runtime-artifacts/audit.md` /
   `aire-state.md` (run the State Isolation Check, `common/parallel-work-state.md` Section 5.5, first).
   For a `[STORY]` PR the head-branch commit holds the code and tests only (Docs Isolation Check,
   `common/branching-strategy.md` Section 4 item 4); the evidence, ledger, summary, contract edits and
   fragment are committed and pushed in `.aire-docs/` (Section 4 item 3):
   ```
   git commit -m "[<Story N.M | BUG | ENH> / <TRACKER-ID>] pr-fix round <R> — address review feedback on PR #<n>" \
              -m "Resolves: FB-01, FB-02, FB-04" -m "AIRE-Version: [N]"
   ```
   `[N]` is read live from `CLAUDE.md`. Record the commit hash.
3. **Pull before push, then push**: run `workflows/dev-implement.md` Section D Step 4 with this branch =
   `<head-branch>` and target = the PR's base branch — except that when a merge brings in changes under
   `src/**` or `tests/**`, re-run Step 11 onward once instead of only the unit suite. Then
   `git push origin <head-branch>`. Never `--force`. If the push is still rejected because the remote
   moved again, HALT and report.

## Step 15 — Update the PR

1. **Tests & Review in the PR body**: read the body (`common/repo-host.md` RH-2), replace the contents
   of its `## Tests & Review` section with this round's results (from `resolution-summary.md`), and add
   or update a `## Review Feedback Rounds` section (one row per round: round, date, commit, fixed /
   answered / declined / deferred counts, link to `resolution-summary.md`). Write it back with
   RH-4 (Azure Repos: mind the 4,000-character description cap), then read it back and confirm both sections landed — record
   only what the read-back shows.
2. **Labels**: confirm `ai-generated` and `aire-anx-v[N]` are still present (RH-5 list); re-add any that are missing (RH-5 add).
3. **Reply to every ledger item except those still open**, each reply starting with the marker line:
   ```
   <!-- aire:pr-fix round=<R> item=FB-NN replies-to=<comment-id> -->
   **AIRE pr-fix — round <R> — FB-NN: <CLASS>**
   <FIXED: what changed, with file:line | ANSWER: the answer | DECLINE: the rule it would break, cited |
    DEFER: why it is out of scope + the recommended /raise-defect or story | ALREADY-ADDRESSED: evidence>
   Commit: <sha> · Evidence: reports/pr-feedback/<key>/round-<R>/resolution-summary.md
   ```
   - Inline thread → a reply in that thread (`common/repo-host.md` RH-8, "Reply in a thread").
   - Review body or top-level comment → a PR-level comment (RH-8), quoting and linking the original.
   - Tracker rejection by the Verification Engineer → a tracker comment via `common/tracker-sync.md`
     Section 10, leading with
     `pr-fix round <R>: the Verification Engineer findings were addressed in PR <url>`.
   - **Never resolve a thread and never dismiss a review** — the reviewer decides whether the reply
     satisfies them.
4. **Re-request review** from every human reviewer who left feedback this round and is not the PR
   author (`common/repo-host.md` RH-8, "Re-request a review").
5. Log the PR updates, every reply URL and the re-requested reviewers.

## Step 16 — Automated PR review

Invoke the `pr-review` skill in AUTO MODE on the updated PR (the owning workflow's auto PR review
step, unchanged): a plain COMMENT review, no prompt. Record its review ID and URL in the audit trail as
framework output, so later rounds exclude it at Step 4.3.

## Step 17 — Tracker and state

1. **Status does not change.** The story stays `In Progress` (a bug stays `Active`); the next moves are
   the board moves after the merge and DEV deploy (`common/status-model.md` S4, B7). Do not remove a
   `ve-rejected` label — `ve-list-work` removes it on approval.
2. **Tracker comment** (automatic): `AIRE pr-fix round <R>: PR <url> updated — <x> fixed,
   <y> answered, <z> declined, <w> deferred.` Verify it landed.
3. **Story Tracker row** (in the fragment): `PR` unchanged, `Merged` = `no`, `Recorded` = now.
4. **`## PR Feedback Rounds`** in the story's fragment `runtime-artifacts/stories/<story-key>/state.md`
   (never the shared file) — mark this round complete. For a `[STORY]` PR, commit and push it in
   `.aire-docs/` now (it never touches the PR head). For a `[BUG]` / `[ENH]` PR this post-push update is
   **not pushed on its own**; it rides the next commit on the PR (`common/parallel-work-state.md` Section 4.6):

   | PR | Story | Round | Started | Finished | Head SHA | Fixed | Answered | Declined | Deferred | Outcome |
   |----|-------|-------|---------|----------|----------|-------|----------|----------|----------|---------|

5. **Repeat-feedback signal**: if any FB-ID in this round re-raises a request an earlier round marked
   resolved for the same reviewer and location, list it in the handoff under "Needs a conversation" —
   two rounds disagreeing about the same line is a human conversation, not another fix.

## Step 18 — Handoff (MANDATORY — the last thing the run outputs)

For a `[STORY]` PR, first close the docs worktree (`common/branching-strategy.md` Section 4 item 6),
once Step 17's fragment is pushed. Then emit this block verbatim, placeholders substituted, choosing
the one NEXT line that matches the story type. Say nothing after it.

```
 PR UPDATED — review feedback round <R> addressed. <Story N.M | ENH-ID stays In Progress | BUG-ID stays Active>.
   PR: <PR URL>  →  target `<target-branch>`   Commit: <sha>
   Feedback: <x> fixed · <y> answered · <z> declined (reasons in the replies) · <w> deferred
   Gates re-run on the whole story: all PASS / N/A — Tests & Review refreshed in the PR body.
   [Needs a conversation: FB-NN, FB-NN — same request resolved in an earlier round]
   [Reminder: the cycle archive was reverted — re-run archive-epic before this PR merges]

NEXT ACTIONS:
   1.  Reviewers (<@logins>): re-review the PR — every comment has an AIRE reply. Resolve the threads
       you are satisfied with; leave a new comment on anything still wrong.
   2.  Still not right? Type: pr-fix <n>
   3.  Happy with it? Approve and MERGE it manually — the framework never merges.
       Once CI/CD has deployed it to DEV, move it on the board: story/enhancement → Ready for Testing,
       bug → Resolved.
       [Story]        then type: dev-implement   for the next story
       [Bug/Enh]      then continue the owning workflow's handoff

Type the keywords EXACTLY as shown — any other phrasing is not a framework trigger.
```

Log which variant was shown.

---

## Critical Rules

- **APPROVED PACKAGE VERSIONS ONLY.** A fix that installs a package follows
  `implementation/package-dependencies-doc.md` Section 6: an approved row at its exact version, or an
  unlisted package looked up live, installed exact, recorded and announced.
- **ONE QUESTION IN A NORMAL RUN — WHICH PR.** Step 6 (AMEND-AC / CONFLICT) and Step 2.6 (archived
  cycle) are the only other questions, and only when their condition holds. Never ask to approve the
  plan, the review, the push, the PR update or the replies.
- **SINGLE SESSION.** Everything runs in the invoking session. No forks, no subagents, no
  background or remote agents, no `claude -p`. A run inside a fork halts at Step 0.
- **SAME PR, SAME BRANCH, NO HISTORY REWRITE.** Fixes are commits on the PR's head branch. Never
  open a second PR, never rebase a pushed branch, never force-push.
- **THE WHOLE GATE CHAIN, EVERY ROUND, ON THE WHOLE STORY.** No gate is skipped because it passed
  before or because the fix "only touched one line".
- **HUMANS OWN THE CONTRACT.** A comment that changes an approved AC is applied only after the Step 6
  decision, and then every artifact that encodes the AC moves together (Step 7). Never rewrite a test
  plan to match code.
- **DECLINE NEEDS A CITED RULE; SH-6 STILL BINDS.** A reviewer cannot authorise skipping a test or
  lowering the coverage minimum through a PR comment — decline it and cite the rule.
- **FRAMEWORK OUTPUT IS EXCLUDED BY RECORD, NOT BY LOGIN.** The developer's own comments are human
  feedback even though they share the PR author's identity.
- **NEVER MERGE, APPROVE, RESOLVE OR DISMISS.** Those are the reviewers' actions.
- **STATUS STAYS `In Progress` (a bug: `Active`).** The later moves belong to people on the board and
  to `ve-list-work` (`common/status-model.md`).
- **EVERY AUDIT ENTRY** carries `User Email`, `TRACKER ITEM`, `Epic Link`, `AIRE VERSION`, `PR` and
  `PR-FIX ROUND`; every commit carries the `AIRE-Version: [N]` trailer, read live from `CLAUDE.md`.
- **BOUNDED.** Every loop is capped at 3 attempts per round (SH-1 … SH-7); exhaustion halts with the
  Retry-Limit Report and nothing is pushed past a failing gate.
