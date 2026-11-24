# Remediate - Detailed Steps

**Purpose**: Fix defects identified in a code-review report — story-wise (from a `<story-key>` report — `story-*`, `bug-*` or `enhancement-*`) or across all stories (from an `all-stories` report) — using fix → unit test → green — and annotate the report in place with resolution evidence.

> **Report format intake** (matches what `implementation/code-review.md` produces): issues are named `ISS-XXX` (story reports), `S[N.M]-ISS-XXX` (all-stories reports), **`SEC-ISS-XXX`** (Security Baseline findings from the review's Phase 2.5) or **`CG-ISS-XXX`** (coding-guideline findings from Phase 2.6), each tied to a specific **AC/Requirement**, **SECURITY-XX rule** or **coding guideline file**, with ONLY two severities — **Blocker** (AC/requirement Not Met, a defect that breaks it, or a Critical security violation) and **High** (AC/requirement Partially Met / deviates from spec, a High security violation, or a broken coding guideline). There are no Medium / Low findings; the report's `##  Security — Advisory (non-blocking)` section is **out of scope here**.

**Recommended execution**: Run as a code-editing workflow, scoped strictly to the issues in the named report.

## Agent Role
**DEV** — fixes code based on a review report; every fix lands with a unit test.

## Before Starting
- [ ] **Automatic mode** (the SH-LOOP-4 loop of an implement workflow): the report is passed in — `story-<N.M>-`, `bug-<TICKET-ID>-` or `enhancement-<TICKET-ID>-code-review-v<X>.md` — so skip this check and Step 1.
- [ ] **Standalone — check for reports** (do NOT read yet): `reports/reviews/<key>-code-review-v*.md` for every story key (`story-*`, `bug-*`, `enhancement-*`) and `reports/reviews/all-stories-code-review-v*.md`
- [ ] If none exist, **STOP**: "Run Code Review (implementation/code-review.md) first to produce a report to remediate from."

---

## Step 1 — Tell Me Which Report to Remediate (ask FIRST)

**Never guess.** Enumerate the newest version per story (plus the newest all-stories report) and present all available reports:

```
Which report should I remediate from?

 CODE REVIEW REPORTS (reports/reviews/):
  STORY REPORTS (fix one story):
  1. story-1.2-code-review-v2.md      —  CHANGES REQUESTED  (2 Blocker, 1 )
  2. story-2.1-code-review-v1.md      —  APPROVED WITH COMMENTS (0 Blocker, 3 )
  ALL-STORIES REPORTS (fix across all stories):
  3. all-stories-code-review-v1.md    —  CHANGES REQUESTED  (1 Blocker, 4 )

Type your choice (e.g., "1"):
```

Read the chosen report end-to-end before touching code.

## Step 2 — Load Review Target Context
- [ ] **Determine report type** from the filename:
  - `<story-key>-*` (`story-*`, `bug-*`, `enhancement-*`) → story report: read the story from `spec/plans/stories.md` — acceptance criteria, IN/OUT of scope
  - `all-stories-*` → all-stories report: read the `## Story Tracker` in `runtime-artifacts/aire-state.md` and, for every story that has issues in the report (per the `S[N.M]-ISS-*` prefixes / per-story sections), its acceptance criteria from `stories.md`
- [ ] Read the related code summaries from `reports/ticket-summary/` and the actual files named in the report's File column

## Step 3 — Build Remediation Backlog & Confirm Scope
- [ ] Build a backlog from the report: `{id, severity, ac/requirement, file:line, summary}` (issue IDs are `ISS-XXX`, or `S[N.M]-ISS-XXX` in all-stories reports — keep the ID exactly as the report names it)
- [ ] **Skip already-resolved items** — any issue already carrying a `Status:  Resolved` marker (re-entrant; surface the skipped count)
- [ ] **Severity scope**: reports contain only Blocker + High — BOTH are MANDATORY to fix (an issue is always an unmet/partially-met AC or requirement, a Security Baseline violation, or a broken coding guideline)
- [ ] ** `SEC-ISS-XXX` issues are security-baseline findings** from the review's Phase 2.5 — fix them exactly like any other Blocker/High, using the SECURITY-XX rule, the violated verification criterion and the remediation the report gives. NEVER "fix" one by suppressing it — no `// nosec`, no `eslint-disable-next-line security/*`, no allowlist widening, no downgrading it to advisory. Suppression is not remediation; the finding must be closed in the code
- [ ] **Ignore the report's `##  Security — Advisory (non-blocking)` section entirely** — Medium/Low findings and pre-existing violations on untouched lines are deliberately NOT in scope here (they belong to `/raise-defect`). Pulling them in restarts the churn loop the severity scope exists to prevent
- [ ] **Scope confirmation depends on how this was invoked**:
  - ** AUTOMATIC MODE — invoked by a workflow** (`dev-implement`, `bug-fix-implement`, `enhancement-implement` auto-remediate loop): SKIP the confirmation entirely. Every Blocker/High finding is in scope by definition, nothing is deferred, and the invoking workflow has no approval gate. Announce the backlog and start fixing:
    ```
     Auto-remediating <report> — fixing all findings:
       ISS-001 — [AC-2, Story 1.2 — summary]   ISS-002 — [AC-3, Story 1.2 — summary]
    ```
  - **STANDALONE MODE — the user typed `remediate`**: summarize the plan and HALT until the user confirms (deferring an issue requires explicit user consent):
    ```
    Remediation plan from <report>:
      Will fix:  ISS-001 — [AC-2, Story 1.2 — summary]   ISS-002 — [AC-3, Story 1.2 — summary]
     Proceed? (yes / adjust scope / cancel)
    ```
    Do NOT touch code before this confirmation.
- [ ] **Do NOT change the Story Tracker status.** Every story being remediated keeps its status (`In Progress` while it is being built) — the statuses and who moves each one are defined only in `common/status-model.md`. You MAY refresh `Recorded` → now to note that remediation started, but leave `Status` unchanged.

## Step 4 — Remediate Per Issue

Iterate the backlog in severity order (Blocker → High). Every fix follows the team's coding guidelines, re-read at their latest version (`implementation/code-generation.md` Step 1.8). For EACH issue:
- [ ] 1. **Apply the fix**: follow the report's "Suggested Fix" when sound; deviate only with a logged justification
- [ ] 2. Write/Update a unit test that reproduces the defect scenario against the fixed code; run it — must pass
- [ ] If the issue is non-testable — pure rename/doc — note this explicitly instead of a test
- [ ] **Run the unit tests of the story (or stories) in scope** — 100% pass; fix any breakage you cause immediately
- [ ] **Mark the issue resolved in the report** (append a Resolution block — never delete original text)

## Step 4.5 — Full Regression (once, after the whole backlog)
- [ ] Re-run the ENTIRE repo test suite and diff it against the story's `baseline-regression.log`, exactly as the Full Regression gate does (`implementation/code-generation.md` Step 11c) — zero NEW failures — then re-run the static evals against their baseline (Step 11c.5) — zero NEW findings. In automatic mode the invoking workflow's remediate loop performs these re-runs; in standalone mode run them here. Refresh `full-regression.log`, `reports/eval-evidence/<story-key>/static/`, the scorecard (`implementation/code-generation.md` Step 11c.7) and the changed-line coverage figure in the story's `evidence-manifest.md`.

## Step 5 — Annotate the Source Report (in place)
- [ ] **Stamp the top-of-report status banner** (template below): ` Resolved` if all in-scope issues fixed, else `Partially Remediated (X/Y)`
- [ ] Append a Remediation Section at the end of the report (template below)
- [ ] **Never create a separate remediation log file** — all evidence lives inside the source report (one source of truth)

## Step 6 — Record Remediation Outcome (NO Status Change)
- [ ] **Do NOT change the Story Tracker status.** Every story covered by the remediation keeps its status (it moves to `Ready for Testing` only after two approvals, the merge into the development branch and the DEV deploy — by the developer, on the board, `common/status-model.md` S4). You MAY refresh `Recorded` → now, but leave `Status` unchanged.
- [ ] Because no status changes, there is normally no tracker transition here. If your team's process requires a board comment/move on remediation, apply the Tracker Sync Rule (`common/tracker-sync.md` Section 4/Section 10, confirm-first, verify) with an evidence comment (tests X/X; coverage %) — but do NOT change the local tracker Status.
- [ ] Log the remediation outcome — findings fixed by severity, files changed, unit-test evidence — in `runtime-artifacts/audit.md` with timestamps

---

## Output

### Top-of-Report Status Banner (insert directly under the report's H1)
```markdown
> ##  Remediation Status:  Resolved
> - **Remediated**: [YYYY-MM-DD] by DEV (aire)
> - **Fixed**: [N] issue(s) — [a] / [b]
> - **Deferred (with user consent)**: [M] — see Remediation Section
> - **Tests**: [P/P] passing | **Coverage**: [Z]%
```
(Use `Partially Remediated (X/Y)` if anything was deferred.)

### Per-Issue Resolution Block (append under each fixed issue)
```markdown
**Resolution** ([YYYY-MM-DD], DEV):
- Fix: [1-line description]
- Change ref: `path/file.ext:45-58`
- Test evidence: `path/file.test.ext` (all green)
- Status:  Resolved
```

### Remediation Section (append to END of the report)
```markdown
---
# Remediation — [YYYY-MM-DD]
**Severity Scope**: Blocker + High
**Target**: [Story N.M | All Stories]

## Issues Remediated
| ID | Severity | AC/Requirement | File:Line | Summary | Resolution | Test Added |
|----|----------|----------------|-----------|---------|------------|------------|

## Issues Deferred (with user consent)
| ID | Severity | Reason |
|----|----------|--------|

## Files Changed
| File | Change Type | Description |
|------|-------------|-------------|

## Testing Summary
- Targeted tests added: [X]
- Story unit tests: [Y/Y] passing | Coverage: [Z]%
- Full regression: [0] new failures vs baseline

## Next Steps
- [ ] Re-request Code Review (implementation/code-review.md) — required if any fixed
```

> **Re-runs**: if a Remediation Section dated today already exists, replace it; older dates are kept (append a new dated section). Always update the top banner to the latest state.

---

## Rules
- ALWAYS read the source report end-to-end before touching code
- Confirm scope BEFORE writing code in STANDALONE mode only — HALT until the user says proceed. In AUTOMATIC mode (invoked by a workflow's auto-remediate loop) the confirmation is SKIPPED — all Blocker/High findings are fixed without asking, and nothing is deferred
- Fix order is always fix → unit test → green. No fix lands without a test (unless non-testable — note it)
- Run the in-scope story's unit tests after EVERY issue, and the full regression once after the whole backlog (Step 4.5)
- Never silently downgrade a Blocker/High — if you cannot fix it, STOP and surface it
- Never modify the report's original issue text — only APPEND (banner, per-issue Resolution blocks, end Section). The `Status:  Resolved` line is the idempotency marker; skip such items on re-runs
- No tracker writes without explicit user confirmation, and always VERIFY on the board

---

## After Remediation — Mandatory Next-Step Output

** AUTOMATIC MODE (invoked by a workflow's auto-remediate loop)**: present NO menu and ask NOTHING. Report the round's outcome and hand control straight back to the invoking workflow, which re-runs Code Review automatically:
```
 Auto-remediation round complete — <report filename>
   Fixed: [X] ([a] [b])
   Tests: [P/P] | Coverage: [Z]%
Re-running automated Code Review.
```

**STANDALONE MODE (the user typed `remediate`)**: present the menu:
```
 Remediation complete — <report filename>
   Fixed: [X] ([a] [b])  |  Deferred: [Y]
   Tests: [P/P] | Coverage: [Z]%

Next step:
1.  Code Review (implementation/code-review.md)  ← required if any was fixed
2.  Satisfied with the remediation? Raise a PR of these changes (Step 7)

Type your choice (1 / 2).
```

Log this prompt and the user's complete raw choice in `runtime-artifacts/audit.md` with timestamps.

## Step 7 — On Choice 2: Raise the PR via pr-generator

When the user picks 2 (standalone invocations only — the automatic mode never shows this menu):
1. Invoke the `pr-generator` skill (`.claude/skills/pr-generator`) via the Skill tool, passing the appropriate target branch (a story, bug or enhancement branch targets the recorded Base Branch from `runtime-artifacts/aire-state.md` `## Branching`). Follow the skill EXACTLY as written — do NOT modify it or bypass its own confirmations (it handles uncommitted changes, pushes the branch, and raises the PR with confirm-first gates).
2. Log the resulting PR URL in `runtime-artifacts/audit.md` with timestamp.
3. If the user picks 1 instead, the changes stay local — a PR can be raised anytime later by invoking the pr-generator skill.
