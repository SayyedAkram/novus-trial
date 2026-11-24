# Self-Heal Limit Guidance — What the Developer Sees, and How They Take Over

**Purpose**: when an automatic self-healing loop uses its 3 attempts and the gate still fails (SH-4), or a
stall ends the budget early (SH-5), the developer must be able to **see exactly what is wrong, fix it
themselves, and hand the work back** — without reading the workflow files. This file is the single
source of truth for:

1. the Self-Heal Limit message every implement workflow emits at SH-4 (Section 2),
2. the per-gate manual-fix playbook that fills its "HOW TO FIX IT YOURSELF" block (Section 3),
3. the resume protocol that picks the work up again after a manual fix (Section 4).

It is used by `workflows/dev-implement.md`, `workflows/bug-fix-implement.md`,
`workflows/enhancement-implement.md`, and — through them — `epic-enhancement`, `epic-bugfix`,
`epic-change-request` and `pr-fix`.

**The stop signal.** If you catch yourself wanting to wrap up, "keep the session moving", make a
"scope call", or list gaps for the user to accept, that is not a reason to ship — it is the signal to
either do the missing work now or HALT with the message in Section 2. A PR raised with a gate unrun, a
tracker transition unmade or an evidence file missing is a framework violation, however honestly it is
disclosed.

---

## 1. State left behind at the halt

When SH-4 fires, before emitting the message:

- **Nothing is committed, pushed or raised on the story branch**, no tracker status changes, the story stays
  `In Progress` (a bug: `Active`) on its branch.
- **The 3 attempted fixes stay in the working tree** — the developer inspects them with `git diff`.
- **Record the halt** in the story's state (`runtime-artifacts/stories/<story-key>/state.md`
  `## Progress`, per `common/parallel-work-state.md`):
  ```markdown
  HALTED — <SH-LOOP-ID> <loop name> exhausted at <step / gate> — <ISO timestamp>
  Head at halt: <sha> · Working tree: 3 attempted fixes, uncommitted
  Resume keyword: <dev-implement | bug-fix-implement | ticket-implement <ID> | epic-enhancement | epic-bugfix | epic-change-request | pr-fix <n>>
  ```
- Log the full message in the story's audit trail under
  `## Self-Healing Retry Limit Reached — <SH-LOOP-ID> (<story>)`.
- **On an epic cycle, close the docs worktree**: the story's state (with the `HALTED —` record),
  audit and evidence so far are committed and pushed to the epic branch, and `.aire-docs/` is closed
  (`common/branching-strategy.md` Section 4 item 6). The code fixes above stay uncommitted on the
  story branch.

---

## 2. The Self-Heal Limit message — emit VERBATIM, every bracketed value substituted

Fill every bracket from the run's own evidence. Never ship an unsubstituted placeholder, never write
"unclear" or "complex" as a diagnosis, and take the "HOW TO FIX IT YOURSELF" lines from the Section 3 row
for this SH-LOOP.

```
SELF-HEALING LIMIT REACHED — I could not fix this on my own. Please take a look.

   Gate:       [step number + gate name]   ([SH-LOOP-ID] — 3 of 3 attempts used | ended early: no progress)
   Story:      [Story N.M — title | Bug TICKET-ID — title | Enhancement TICKET-ID — title]
   Branch:     [branch]
   Status:     STOPPED at this gate. Nothing was committed, pushed or raised as a PR, and no tracker
               status changed. My 3 attempted fixes are still in your working tree (see step 3 below).

─────────────────────────────────────────────────────────────────────
WHAT IS FAILING
   Measured:   [pass/fail counts | coverage X% vs required 90% | N new regression failures]
     1. [identifier] — [file:line] — [one-line message]
     2. [identifier] — [file:line] — [one-line message]
     [… every outstanding failure, most important first]

WHY I STOPPED
   [The specific blocker — the constraint, contradiction, missing dependency, environment limitation or
    ambiguous requirement that an automatic fix cannot resolve.]

WHAT I TRIED  (all three changes are in your working tree)
   1. Cause: [diagnosis] → changed: [files] → result: [outcome]
   2. Cause: [diagnosis] → changed: [files] → result: [outcome]
   3. Cause: [diagnosis] → changed: [files] → result: [outcome]

─────────────────────────────────────────────────────────────────────
HOW TO FIX IT YOURSELF
   1. Reproduce it:     [exact command, and the folder to run it from]
   2. Read the detail:  [evidence file paths — logs, reports]
   3. Review my tries:  git diff -- [files changed by the 3 attempts]
                        Keep, adjust or revert any of them — they are only suggestions.
   4. Fix it:           [gate-specific guidance from the playbook — where to look, what usually fixes it]
   5. Check your fix:   [same command as step 1] → must show: [the pass criterion]
   6. Hand it back:     type  [resume keyword]
                        I detect this halted story, check what you changed, re-run every gate
                        from [first gate to re-run] on your code, and — when all pass — review, commit and
                        raise the PR myself.

   Please do NOT: [gate-specific forbidden shortcuts from the playbook]. The gates detect these and
     will stop again. Also do not commit, push or open the PR yourself — hand it back instead, so every
     gate re-verifies your change.

Please fix this manually yourself, then type [resume keyword] to continue.
```

**The message asks nothing.** It is the last output of the run; the workflow stays halted until the developer
has fixed the problem by hand and typed the resume keyword. That hand-back (Section 4) grants the halted
loop a fresh 3-attempt budget; every other loop keeps the counter it already held (SH-2).

---

## 3. Manual-fix playbook — one row per loop

Use the row for the exhausted loop to fill the message's steps 1, 2, 4, 5 and "Please do NOT". Take the
commands from the "Commands run" table of the story's `evidence-manifest.md` (`common/story-artifacts.md`
Section 2) — never invent a command.

| Loop | 1. Reproduce | 2. Read the detail | 4. Usually fixed by | Do NOT | Re-run from |
|---|---|---|---|---|---|
| **SH-LOOP-1** Unit tests + coverage | the unit-test coverage command, from the project root that owns it | `reports/unit-test-evidence/<story-key>/unit-test-run.log`, `coverage/` (open the HTML report to see the uncovered lines) | a failing test: read its assertion and fix the code it exercises; low coverage: add tests under `tests/unit/<mirror-of-src>/` for the uncovered lines listed in the report | delete, skip or `xfail` a test; add a trivially-true test; exclude files from coverage | Unit tests (the first code gate) |
| **SH-LOOP-2** Test placement | the placement rules applied to the diff | `reports/unit-test-evidence/<story-key>/test-placement-check.log` | move each flagged unit test to `tests/unit/<mirror-of-src>/` and each API contract test to `tests/api/<mirror-of-src>/`, and fix its imports | keep tests under `src/`, unit tests outside `tests/unit/`, or API tests outside `tests/api/` | Unit tests |
| **SH-LOOP-3** Full regression | the full test-suite command (unit and API) | `reports/unit-test-evidence/<story-key>/full-regression.log` vs `baseline-regression.log` — the tests that were green before and are red now | a real regression → fix the code; a test whose expectation this change legitimately changed → update the assertion (and say why); a test for code this change removed → delete it | delete or skip a failing test just to go green | Unit tests |
| **SH-LOOP-4** Review findings | re-read the latest review report | `reports/reviews/<story-key>-code-review-v<X>.md` — each Blocker/High finding with `file:line`, plus `reports/code-security-reviews/` | complete the unmet / partially met acceptance criterion, or fix the Critical/High security issue named | delete a finding from the report, narrow the review scope | Unit tests |
| **SH-LOOP-5** pr-fix feedback resolution | re-read each unresolved comment | `reports/pr-feedback/<story-key>/round-<R>/feedback-ledger.md` | the change the reviewer actually asked for, at the line they commented on | mark an item resolved without the change | Unit tests |
| **SH-LOOP-6** Test impact reconciliation | `git diff --name-status $(git merge-base origin/<base> HEAD) -- tests/` on the story branch, plus the run's `spec/` changes in `.aire-docs/` on an epic cycle | `reports/unit-test-evidence/<story-key>/test-impact-reconciliation.md` | restore a test changed without authorisation and fix the code instead; complete an authorised update left undone | change a test that is not on the Test Change Authorization list | Unit tests |
| **SH-LOOP-8** API contract tests | the API test command with its report flag, from the project root that owns it | `reports/api-contract-test-evidence/<story-key>/api-contract-test-run.log` and `api-contract-test-report.*` — the failing endpoint and checklist item (C1–C6) | fix the endpoint so it returns the documented status, error envelope or schema; add the missing checklist test under `tests/api/<mirror-of-src>/` | weaken an assertion to match the endpoint's current output; mark an applicable checklist item `N/A`; move the test to `tests/unit/` | API contract tests (`implementation/code-generation.md` Step 11a.5) |
| **SH-LOOP-9** Static evals | each failing check's command, as recorded in the scorecard | `reports/eval-evidence/<story-key>/eval-summary.md` and the check's log under `static/`, compared with `static/baseline/` | fix the code at the flagged file and rule; replace a vulnerable dependency version; move a secret to configuration | add an inline disable, an ignore entry or a baseline-file entry; relax the tool's configuration; exclude the file | Static evals (`implementation/code-generation.md` Step 11c.5) |
| **SH-LOOP-10** Judge score checkpoint J1/J2 | re-read the score files and score the cited criteria again on your change | `reports/eval-evidence/<story-key>/judge/architecture-score.json` and `security-score.json` — each criterion below 1.0 with its `file:line`, against `spec/plans/judge-rubrics.md` | change the code at each cited line so the criterion holds, worst weighted loss first | edit `architecture.md` or `judge-rubrics.md`, lower the 0.85 minimum, mark an applicable criterion `N/A`, re-score until a pass appears | Judge score checkpoint (`implementation/code-generation.md` Step 11c.6) |
| **SH-LOOP-7** Figma fidelity | re-read each listed frame's design context and screenshot through the Figma provider | the fidelity table in the Frontend Components Summary — each remaining difference by frame and element | change the component so the element matches the frame value exactly; for a missing value, add the theme token the frame's variable names | restyle, round or re-word the design; record a visual deviation; build from an export or from memory | Fidelity check (`implementation/code-generation.md` Step 1.7) |

---

## 4. Resume protocol — handing the work back

The developer types the resume keyword the message named. The workflow detects the halt instead of
starting fresh.

1. **Detect**: before story/ticket selection, look for a `HALTED —` record in `## Progress` of the story
   on the current branch (and, for `dev-implement`, of any story fragment in this clone whose branch is
   checked out). Found → announce:
   ```
   Resuming [story], stopped at [gate] ([SH-LOOP-ID]) on [date].
     Checking what you changed since then…
   ```
   Skip selection, branch creation and the baseline — the baseline from the original run still holds.
   (If `origin/<base>` — the branch the PR targets — has moved on and the branch is behind, merge it in
   first — no rebase — and recapture the baseline, saying so. On an epic cycle, the docs worktree is
   opened fresh from origin first, `common/branching-strategy.md` Section 4 item 1.)
2. **See what changed** since the halt: `git status --porcelain` plus `git diff <head-at-halt>` (and
   any commits the developer made on the branch).
   - **Nothing changed** → say `Nothing has changed since the stop — the gate would fail the same way.`,
     re-show the Section 2 message, and do not spend any attempt.
   - **A forbidden shortcut** (from the playbook's "Do NOT" column, or anything SH-6 lists: a deleted,
     skipped or `xfail`ed test; a new suppression comment; an edited existing test plan) → stop and show
     each one with its `file:line`:
     ```
     These changes would pass the gate by weakening it, so I can't continue with them:
        • [file:line] — [what was changed]
       Please revert them, fix the underlying problem manually, and type [resume keyword] again.
       If you believe the requirement itself is wrong, raise it with the story owner —
       that change goes through its own review, never through this gate.
     ```
   - **Otherwise** → continue.
3. **Re-verify from the first code gate** (unit tests + coverage) through every later gate, because a
   manual change can affect any of them.
4. **Budgets**: the halted loop gets a fresh 3-attempt budget (the hand-back is the explicit user
   instruction SH-4 requires); every other loop keeps its counter. **Never revert the developer's
   changes** — if the gate still fails and self-heals, it builds on their code.
5. **Record**: replace the `HALTED —` record with
   `RESUMED — <timestamp> — changes: <file list> — re-running from <gate>`, and log the hand-back
   (complete raw input, the change list, the re-run start) in the story's audit trail.
6. From there the workflow continues exactly as it would have — review, then commit, push, PR and
   handoff.

---

## 5. Rules

- The message is written for the developer: plain words, exact commands, real paths, every bracket
  filled. It is always the last thing the halted run outputs.
- Every "HOW TO FIX IT YOURSELF" line comes from the playbook row and the run's real evidence — never
  a generic "please investigate".
- The forbidden shortcuts are always named, so the developer does not spend time on a change the gate
  will reject.
- Resuming never skips a gate, never reverts the developer's work, and never commits before every gate
  passes on the final code.
