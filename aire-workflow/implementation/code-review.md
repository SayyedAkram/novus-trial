# Code Review - Detailed Steps

> **REVIEW-ONLY WORKFLOW.** The REVIEWER role MUST NOT edit source code, tests, or configs. It may write ONLY to `reports/reviews/` and update the Story Tracker in `runtime-artifacts/aire-state.md`. Findings are produced as a report; fixes are performed during **Remediate** (`implementation/remediate.md`). If issues are found, this workflow MUST recommend Remediate as the next step.

**Purpose**: Strictly verify that each story's acceptance criteria and mapped requirements are completed by the code — nothing more. Produce a versioned review report. Reviews can target a specific story or all stories together (the full Story Tracker reviewed against the code in one pass).

> **SCOPE DISCIPLINE (HARD RULE)** — Report a finding ONLY if it is one of:
> 1. An **acceptance criterion NOT met** (or only partially met) by the code
> 2. A **requirement mapped to the story NOT implemented** as specified
> 3. A **genuine defect** (bug, crash, security hole, broken flow) that prevents an AC/requirement from actually working
>
> Do **NOT** report: style/naming/formatting nits, refactoring or SOLID suggestions, "could be improved" / "consider adding" / nice-to-have items, missing docs/comments, or hypothetical future concerns. **A clean review (zero findings) is a valid and expected outcome — NEVER invent findings to justify the review.** This review runs automatically after every `dev-implement`; padding it with advisory items creates endless remediate loops.

**Recommended execution**: Run as a read-only workflow (no code-editing tools) so the reviewer physically cannot modify source. The orchestrator reads the returned report path and verdict.

## Agent Role
**REVIEWER** — analyzes and reports only.

---

## Tell Me What to Review

**DO NOT guess what to review. Present this prompt and wait:**

```text
What would you like me to review?

Options:
  a) A specific story                    (e.g., "story 1.2" — remediate can then fix that story alone)
  b) All stories together against the code   (type "all stories")
```

**Then, based on the answer, resolve the review target:**
- **Story**: identify the story number (e.g., N.M) and confirm it exists in the Story Tracker.
- **All stories**: every story in the resolved Story Tracker (the shared `## Story Tracker` plus the `runtime-artifacts/stories/*/state.md` fragments, `common/parallel-work-state.md`) whose implementation has begun — any Status past `ToDo` (`In Progress` through `Closed`) — is in scope. **EXCLUDED**: `ToDo` stories (no code yet). Note that an `In Progress` story may still be mid-build (actively claimed by a developer, or awaiting its PR) — call this out so the user knows the review reflects its current, possibly-incomplete state. List the in-scope story IDs AND the excluded IDs (with reason) back to the user before starting.

---

## Phase 0: Review History Check (Prevents Endless Loops)

Before reviewing, ALWAYS check for a previous report matching the review target, then determine the review mode. Apply the rules below for the chosen target.

### If reviewing a story (story N.M)
1. **Previous review** — Does `reports/reviews/<story-key>-code-review-v*.md` exist? If yes, read the latest version; note its status (APPROVED / CHANGES REQUESTED) and prior issues. Also check for a newer `all-stories-code-review-v*.md` that covers this story — if one exists and is newer, surface its findings for this story so they are not double-reported or missed.
2. **Determine review mode**:
   - No previous review → INITIAL_REVIEW (Blocker + High — the only severities in this review)
   - Previous APPROVED + code unchanged → **SKIP**: " Story [N.M] already approved. Code unchanged since last review."
   - Previous APPROVED + code changed → NEW_CHANGES (Blocker + High in changed files only)
   - Previous CHANGES REQUESTED → FIX_VERIFICATION (verify prior issues fixed + new Blocker/High only)

### If reviewing all stories
1. **Previous review** — Does `reports/reviews/all-stories-code-review-v*.md` exist? If yes, read the latest version; note its status (APPROVED / CHANGES REQUESTED) and prior issues per story. Also check individual `story-*-code-review-v*.md` reports newer than the last all-stories report — carry their open issues into this review so nothing is lost between the two report types.
2. **Determine review mode**:
   - No previous review → INITIAL_REVIEW (Blocker + High — the only severities in this review)
   - Previous APPROVED + code unchanged → **SKIP**: " All stories already approved. Code unchanged since last review."
   - Previous APPROVED + code changed → NEW_CHANGES (Blocker + High in changed files only)
   - Previous CHANGES REQUESTED → FIX_VERIFICATION (verify prior issues fixed + new Blocker/High only; apply per-story)

---

## Phase 1: Preparation
1. **Load review scope** — varies by review target:

   **If reviewing a story:**
   - [ ] Read the story from `spec/plans/stories.md`
   - [ ] Extract its acceptance criteria
   - [ ] Identify the files implementing this story (from `reports/ticket-summary/` summaries and the actual workspace code)
   - [ ] Note what is IN and OUT of scope

   **If reviewing all stories:**
   - [ ] Read the resolved Story Tracker (shared `## Story Tracker` + story fragments) — enumerate every in-scope story (any Status past `ToDo`; exclude `ToDo`)
   - [ ] For every in-scope story, read its acceptance criteria from `spec/plans/stories.md`
   - [ ] Read `spec/plans/application-design.md` (if Application Design ran) and `spec/plans/epic-brief.md` (if captured) for structural context — used only to locate code
   - [ ] Identify all implementation files (from `reports/ticket-summary/` summaries and workspace code)
   - [ ] Group findings by story in the report

2. **Read context** — error handling, logging, naming, and testing patterns from the design artifacts and any enabled extensions
3. **Read the code** — open all files to review, trace the main flows

## Phase 2: AC & Requirements Verification (the ONLY review checklist)
- [ ] **Acceptance Criteria — verify each one**: for EVERY acceptance criterion of every in-scope story, trace the code and record a verdict:
  - **Met** — cite the evidence (`file:line` of the implementing code)
  - **Partially Met** — state exactly what part of the AC is missing or deviates from the spec
  - **Not Met** — state what is absent
- [ ] **Requirements coverage**: verify each requirement mapped to the story (from `requirements.md` / the story narrative) is implemented as written — same Met / Partially Met / Not Met verdicts with evidence
- [ ] **Genuine defects only**: report a bug, crash, security hole, or broken flow ONLY when it prevents an AC/requirement from actually working (e.g., the AC's flow throws, auth required by the story is absent, data required by an AC is never persisted)
- [ ] **Tests as AC evidence — STATIC check only, never re-run**: verify unit tests covering the ACs exist by READING them (they were generated + executed during the Unit Test & Coverage gate, `implementation/code-generation.md` Step 11a). Do NOT re-execute the unit test suite or re-measure coverage in this review — when invoked via `dev-implement`, the gate just ran in the same session; reuse the passed-in/audit-recorded results (tests X/X passing, coverage %) as the report's evidence. Report a finding ONLY if an AC has no verification at all — do not nitpick test style or demand extra tests beyond the ACs
- [ ] **Extension compliance** — if any extensions are enabled in `runtime-artifacts/aire-state.md`, verify applicable rules (mark N/A where not relevant); violations of enabled extension rules are genuine findings

**Explicitly OUT of scope** (do NOT check, do NOT report): code style, naming, formatting, file organization, magic numbers, comment/documentation quality, SOLID/DRY/refactoring opportunities, performance ideas not required by an AC/NFR, and any "good to have" suggestion — except where the team's coding guidelines state the rule (Phase 2.6). If everything traces to Met with no defects → verdict is  APPROVED with zero issues.

## Phase 2.6: Coding Guidelines Check (when the team has guidelines)

- [ ] Read every `.md` file in `spec/context-project/coding-guidelines/` at its latest version
  (`implementation/code-generation.md` Step 1.8 item 1). None there → skip this phase silently.
- [ ] Check every line the change adds or modifies against them. Lines the change did not touch are
  out of scope.
- [ ] Each line that breaks a guideline is a **High** finding (`CG-ISS-XXX`), naming the guideline file
  and the rule it states, so the auto-remediate loop fixes it. A guideline that conflicts with a
  framework rule or `architecture.md` is not a finding (the precedence in Step 1.8 item 4).

## Phase 2.5:  Automated Security Review (MANDATORY — diff-scoped)

The AIRE Security Baseline is always mandatory and blocking for every project (`CLAUDE.md` Extensions Loading). This phase enforces it per change, automatically, instead of only when a human remembers to run the standalone `code-security-review` skill.

- [ ] **Run the `agents/code-security-review-agent.md` procedure** against the code in review scope. Follow that agent file exactly — it loads `extensions/security/baseline/security-baseline.md` and checks all 16 rules (SECURITY-01 … SECURITY-16) with their verification criteria, classifies severity, and shows file/line evidence
- [ ] **SCOPE = THE CHANGE, NOT THE WHOLE REPO.** The agent's default is a full-codebase audit; that is far too heavy to run on every story and would flood the auto-remediate loop with pre-existing debt that this story did not introduce. Scope it to:
  - the files this story added or changed, and
  - the attack surface those files reach — the entry points, auth boundaries, data stores and external calls on the changed paths (Step 1 "map the attack surface", narrowed to the diff)
  - Rules that cannot apply to the changed surface are marked N/A with the reason — never silently dropped
  - The full-codebase audit remains the standalone `code-security-review` skill's job, unchanged
- [ ] **Write the security report** to `reports/code-security-reviews/<key>-security-review-v<X>.md` (the story key and this review's version — `common/story-artifacts.md` E3; the dated name is only for the standalone full-repo audit) per the agent's report structure, noting in its header that the scan scope was this story's diff, not the full codebase
- [ ] **Map severities into THIS review's two reportable levels** and fold them into the issue list of Phase 3:
  | Security agent severity | Becomes | Behaviour |
  |---|---|---|
  | Critical / Blocker | **Blocker** finding (`SEC-ISS-XXX`) | Blocking — drives the verdict and the auto-remediate loop |
  | High | **High** finding (`SEC-ISS-XXX`) | Blocking — same |
  | Medium / Low | **Not a finding** | Listed in an explicitly non-blocking `##  Security — Advisory (non-blocking)` section of the review report, carried into the security report, and NOT fed to remediation |
- [ ] Every mapped finding keeps its SECURITY-XX rule ID, CWE/OWASP reference, evidence snippet and concrete remediation from the agent's output — that is what makes it auto-fixable
- [ ] **Pre-existing findings are out of scope.** A Critical/High on a line this story did not touch is recorded in the security report and explicitly labelled pre-existing; it does not become a Blocker/High finding here and does not block. Surface it to the user so it can be raised as its own ticket (`/raise-defect`) — the same treatment baseline regression failures get
- [ ] **NEVER suppress instead of fixing** — no `// nosec`, no `eslint-disable-next-line security/*`, no widening an allowlist, no marking a genuine finding N/A to clear the gate

## Phase 3: Document Findings
- [ ] Assign each issue a severity — only TWO are reportable: Blocker (AC/requirement Not Met, or a defect that breaks it) / High (AC/requirement Partially Met or deviates from spec) — plus a category, file:line, and a suggested fix. There are NO Medium / Low advisory findings in this review
- [ ] Create the report at the appropriate path (increment version `v[X]` on re-review). **The two targets use deliberately different filenames so Remediate can identify and intake either:**
  - **Story review**: `reports/reviews/<story-key>-code-review-v[X].md` (`story-<N.M>` · `bug-<TICKET-ID>` · `enhancement-<TICKET-ID>`)
  - **All-stories review**: `reports/reviews/all-stories-code-review-v[X].md`
- [ ] For all-stories reviews, group issues by story section in the report (issue IDs prefixed per story, e.g. `S1.2-ISS-001`, so Remediate can map every issue back to its story)
- [ ] **Include the Phase 2.5 security findings** in the issue list, keeping their `SEC-ISS-XXX` IDs, SECURITY-XX rule reference and remediation — they are first-class Blocker/High findings alongside the AC/requirement ones
- [ ] **Include the Phase 2.6 coding-guideline findings** (`CG-ISS-XXX`, High) in the issue list, each with its guideline file and rule
- [ ] Determine overall status strictly from the verdicts: any Blocker (AC/req Not Met or broken, or a Critical security finding) →  CHANGES REQUESTED; only High (Partially Met, or a High security finding) →  APPROVED WITH COMMENTS; all ACs/requirements Met and zero security Blocker/High →  APPROVED
- [ ] The findings list and the report's issue status are derived from AC/requirement verdicts, Phase 2.5 security findings and Phase 2.6 coding-guideline findings ONLY — Medium/Low security advisories never enter it

## Phase 4: Record the Verdict (NO Status Change)
- [ ] **Code Review is read-only and does NOT change the Story Tracker status.** A story under review keeps its status — the statuses and who moves each one are defined only in `common/status-model.md`, and no review ever makes one of those moves. Do NOT set or demote any status here.
- [ ] Update only the review report and the audit trail — never the tracker Status column. (You MAY refresh the story row's `Recorded` timestamp to note that a review ran, but leave `Status` unchanged.)
- [ ] Because no status changes, there is normally no tracker transition in this phase. If your team's process nonetheless requires a board move on review completion, apply the Tracker Sync Rule (`common/tracker-sync.md` Section 4, confirm-first, verify) — but do NOT change the local tracker Status.
- [ ] Log the review verdict ( APPROVED /  APPROVED WITH COMMENTS /  CHANGES REQUESTED) and the full findings list by severity in `runtime-artifacts/audit.md` with timestamps

---

## Issue Severity

| Level | Meaning | Action |
|-------|---------|--------|
| Blocker | AC/requirement NOT met, or a defect that breaks it | MUST fix before approval |
| High | AC/requirement PARTIALLY met / deviates from spec, or a changed line breaks a coding guideline | SHOULD fix |

Medium / Low do not exist in this review — anything that would have been advisory (style, refactoring, nice-to-have) is out of scope and is not reported at all.

---

## Output

**Location** (choose based on review target):
- Story: `reports/reviews/<story-key>-code-review-v[X].md`
- All stories: `reports/reviews/all-stories-code-review-v[X].md`

### Code Review Report Template

```markdown
# Code Review - [Story N.M: <Story Name> | All Stories]

**Date**: [YYYY-MM-DD]
**Reviewed By**: REVIEWER (aire)
**Review Number**: [1, 2, ...]
**Review Mode**: [INITIAL_REVIEW / FIX_VERIFICATION / NEW_CHANGES]
**Review Target**: [Story N.M | All Stories]
**Status**:  APPROVED /  APPROVED WITH COMMENTS /  CHANGES REQUESTED
**Tracker ID**: [ADO work item ID, e.g. 4821, or list of IDs for all-stories]

## Review Summary
**Components Reviewed**: [files]
**Stories in Scope**: [story numbers covered; for all-stories, also list stories excluded for having no code]
**Tests Reviewed**: [Yes/No — statically; suite NOT re-run]  **Changed-line coverage**: [X]% (from the Unit Test & Coverage gate — not re-measured)
**Security Baseline (SECURITY-01…16, diff-scoped)**: [X]/16 checked · [N] compliant · [N] N/A · Findings: [N] Blocker / [N] High (blocking, in the issue list) · [N] Medium / [N] Low (advisory) · [N] pre-existing (not this change) → report: `reports/code-security-reviews/<story-key>-security-review-v<X>.md`
**Overall Assessment**: [2-3 sentences — strictly on AC/requirement completion and the security findings.]

## AC & Requirements Verification
[One table per in-scope story. EVERY acceptance criterion and mapped requirement gets a row — this is the core of the report.]

### Story N.M: [Title]
| # | AC / Requirement | Verdict | Evidence / Gap |
|---|------------------|---------|----------------|
| AC-1 | [criterion text] |  Met | `path/file.ext:45` |
| AC-2 | [criterion text] |  Partially Met | [what's missing] → ISS-001 |
| AC-3 | [criterion text] |  Not Met | [what's absent] → ISS-002 |

## Issues Found
[For all-stories reviews: group issues under one `## Story N.M` section per story, and prefix IDs per story — e.g. `S1.2-ISS-001` — so Remediate can map every issue to its story.]

### ISS-001: [Title] Blocker
**AC/Requirement**: [the specific AC or requirement this fails]  **File**: `path/file.ext:45-52`
**Issue**: [how the AC/requirement is not met, or the defect that breaks it]
**Suggested Fix**: [code or description]

### SEC-ISS-001: [Title] Blocker
**Security Rule**: SECURITY-XX — [rule name] · **Criteria violated**: [the specific verification item]
**File**: `path/file.ext:45-52` · **Reference**: [CWE-XX / OWASP AXX]
**Issue**: [the vulnerability and what an attacker could achieve]
**Suggested Fix**: [the concrete remediation from the security agent's output]

### CG-ISS-001: [Title] High
**Coding Guideline**: `spec/context-project/coding-guidelines/<file>.md` — [the rule it states]
**File**: `path/file.ext:45-52`
**Issue**: [how the changed line breaks the guideline]
**Suggested Fix**: [the change that makes it follow the guideline]

[If there are NO issues, write "No issues — all acceptance criteria and requirements verified as Met; diff is clean against SECURITY-01…16." Do not pad this section.]

## Security — Advisory (non-blocking)
[Medium / Low security findings on the changed surface, and any **pre-existing** Blocker/High on lines this story did not touch — each with its SECURITY-XX rule and file:line. **These are NOT findings**: they do not affect the verdict and are never sent to remediation. Recommend `/raise-defect` for the pre-existing ones. Write "None." if empty.]

## Issue Summary
| # | ID | Severity | AC/Requirement or SECURITY rule | File | Status |
|---|-----|----------|----------------|------|--------|
| 1 | ISS-001 | Blocker | AC-2 (Story 1.2) | auth.ext:45 | Must Fix |
| 2 | SEC-ISS-001 | High | SECURITY-05 (Input Validation) | api/user.ext:88 | Must Fix |

**Counts**: Blockers: [a] | High: [b] — of which security: [c] Blocker / [d] High · Advisory (non-blocking): [e]

## Approval Status
**Decision**: [APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED]
**Reason**: [...]
```

---

## Anti-Loop Protection
1. ALWAYS check for previous reviews first
2. SKIP if already approved and code unchanged
3. Only Blocker + High exist in this review — every finding must map to a specific AC/requirement, a SECURITY-XX baseline rule (Phase 2.5) or a rule stated in a coding guideline file (Phase 2.6). Those are the ONLY admissible grounds for a finding
4. DON'T invent findings — a clean review (zero issues) is valid and expected when all ACs are Met and the diff is security-clean
5. DON'T surface style/refactor/nice-to-have items a coding guideline does not state — they are out of scope, on first review AND re-reviews. Security Medium / Low go in the explicitly non-blocking advisory section, never the issue list
5b.  DON'T scope the security review to the whole repo, and DON'T report pre-existing security findings as this story's — both flood the remediate loop with debt the change didn't introduce. Diff scope only; pre-existing findings are labelled and surfaced, never remediated here (Phase 2.5)
6. **DON'T edit code, tests, or any non-review file** — review + report only
7. **DON'T re-run the unit test suite or re-measure coverage** — the Unit Test & Coverage gate already ran it; reuse that recorded evidence (this review reads tests, it does not execute them)

---

## After Review — Mandatory Next-Step Output

**STANDALONE only.** Inside an implement workflow (automatic mode, `workflows/code-review.md`) skip this block entirely — no menu, no prompt; the invoking workflow routes on the verdict itself.

After writing the report, present ONLY this block (do not improvise code edits):

```
 Code review complete — reports/reviews/<report-filename>.md
   Target: [Story N.M | All Stories]
   ACs verified: [met]/[total] Met | [p] Partially Met | [n] Not Met
   Status: [ APPROVED |  APPROVED WITH COMMENTS |  CHANGES REQUESTED]
   Issues: [a] Blocker | [b] High

Next step:
1.  Remediate         ← required if  CHANGES REQUESTED
                                              recommended if  APPROVED WITH COMMENTS
                                              N/A if  APPROVED
2.  Implement / review the next story        ← if  APPROVED

Type your choice (1 / 2).
```
