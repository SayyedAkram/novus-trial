# Story Artifacts — the Evidence Every Implement Run Must Leave Behind

**Purpose**: every `dev-implement`, `bug-fix-implement` and `enhancement-implement` run (and, through them,
`epic-enhancement`, `epic-bugfix` and `pr-fix`) leaves the **same complete set of evidence files, in the same
layout and format**, so reviewers and the Verification Engineer can rely on them. This file is the single
checklist; Section 4 is the check each workflow runs before it commits.

`<story-key>` = `story-<N.M>` (epic stories, including change and bugfix stories), `bug-<TICKET-ID>`, or
`enhancement-<TICKET-ID>` (a bug or enhancement cycle's ticket is its single story).

---

## 1. The evidence set

### E1 — Unit tests, coverage and regression — `reports/unit-test-evidence/<story-key>/` — **always**

| File | Content |
|---|---|
| `baseline-regression.log` | the whole test suite (`tests/unit/` and `tests/api/`) on the freshly cut branch, before any change |
| `unit-test-run.log` | raw output of the final passing unit-test run |
| `coverage/` | the coverage tool's own output: the **machine-readable report** (`lcov.info`, `coverage.xml`, `jacoco.xml`, `coverage.out` …), its summary, and the HTML report when the tool emits one |
| `coverage/changed-lines-coverage.json` | **the gate metric**: coverage of the lines this story added or changed (Section 2.1) |
| `full-regression.log` | the whole test suite after the change, diffed against the baseline |
| `test-placement-check.log` | whenever the story changed any test file (Section 2.2) |
| `test-impact-reconciliation.md` | change and bugfix stories (`epic-enhancement` / `epic-bugfix` / `epic-change-request`) |
| `evidence-manifest.md` | Section 2 format |

The rules for each step live in `implementation/code-generation.md`: coverage in Step 11a, API contract
tests in Step 11a.5, static evals in Step 11c.5, judge scores in Step 11c.6, the scorecard in Step 11c.7.

### E2 — Code review — `reports/reviews/<story-key>-code-review-v<X>.md` — **always**, every version kept

### E3 — Security review — `reports/code-security-reviews/<story-key>-security-review-v<X>.md` — **always**

`<X>` = the code-review version this pass belongs to. Never the dated `security-review-YYYY-MM-DD.md`
from a workflow run — two stories reviewed on the same day would both create it (an add/add merge
conflict, and a report nobody can trace to its story). The dated name belongs only to the standalone
full-repository `code-security-review` skill.

### E4 — State and audit — `runtime-artifacts/stories/<story-key>/audit.md` + `state.md` — **always** (`common/parallel-work-state.md`)

### E5 — Ticket summary — `reports/ticket-summary/<story-key>-summary.md` — bug and enhancement stories

### E6 — API contract tests — `reports/api-contract-test-evidence/<story-key>/` — **always**

| File | Content |
|---|---|
| `api-contract-test-run.log` | raw output of the final passing API test run |
| `api-contract-test-report.*` | the runner's machine-readable report from the same run (JUnit XML, JSON or TRX) |
| `evidence-manifest.md` | per endpoint and method: C1–C6 each `Pass` or `N/A` with its reason, tests passing X/X, and the contract source used. For a story that touches no endpoint, only this file, stating `N/A` and the reason |

### E7 — Evals and scorecard — `reports/eval-evidence/<story-key>/` — **always**

```text
reports/eval-evidence/<story-key>/
├── eval.json            # machine-readable scorecard
├── eval-summary.md      # human-readable scorecard (goes into the PR body)
├── static/              # post-change output of D1–D7, one log per check
│   └── baseline/        # the pre-change run of the same commands
└── judge/               # architecture-score.json, security-score.json, rubric-used.md when derived in the run
```

**`eval.json`** (example):

```json
{
  "key": "story-1.2", "trackerId": "4822", "aireVersion": "<N>",
  "rubricVersion": "1.2.0", "judgeModel": "<model that scored>", "changedFiles": 7,
  "results": {
    "D1_lint":         { "status": "PASS", "newFindings": 0, "command": "npx eslint src/orders" },
    "D2_types":        { "status": "PASS", "newErrors": 0 },
    "D3_sast":         { "status": "N/A",  "reason": "no SAST tool in the repo (looked for semgrep, bandit)" },
    "D4_deps":         { "status": "PASS", "new": { "critical": 0, "high": 0 } },
    "D5_licenses":     { "status": "PASS", "violations": [] },
    "D6_complexity":   { "status": "PASS", "maxChanged": 9, "threshold": 15 },
    "D7_secrets":      { "status": "PASS", "findings": 0 },
    "unitCoverage":    { "status": "PASS", "value": 93.4, "threshold": 90.0 },
    "apiContract":     { "status": "PASS", "endpoints": 3, "tests": "18/18" },
    "regression":      { "status": "PASS", "newFailures": 0 },
    "J1_architecture": { "status": "PASS", "score": 0.91, "min": 0.85,
                         "criteria": [ { "id": "J1-01", "weight": 0.40, "score": 1.0 },
                                       { "id": "J1-02", "weight": 0.35, "score": 0.8,
                                         "citation": "src/api/billing.ts:88", "note": "direct ORM call in handler" } ] },
    "J2_security":     { "status": "PASS", "score": 0.92, "min": 0.85,
                         "criteria": [ { "id": "J2-A01", "owasp": "A01:2025", "weight": 0.20, "score": 1.0 } ] }
  },
  "selfHealing": { "SH-LOOP-1": { "attempts": 1, "budget": 3 }, "SH-LOOP-9": { "attempts": 0, "budget": 3 } },
  "verdict": "PASS"
}
```

**`eval-summary.md`** — one table, one row per result, in this order:

```markdown
### Eval Scorecard — Story 1.2 · **PASS**

| Check | Result | Threshold | Status |
|---|---|---|---|
| D1 Lint | 0 new findings | 0 new | PASS |
| D2 Type check | 0 new errors | 0 new | PASS |
| D3 Static security | no SAST tool in the repo | 0 new | N/A |
| D4 Dependencies | 0 critical / 0 high new | 0 new | PASS |
| D5 Licences | 0 violations | none disallowed | PASS |
| D6 Complexity | max 9 | ≤ 15 | PASS |
| D7 Secrets | 0 findings | 0 | PASS |
| Unit coverage | 93.4% of changed lines | ≥ 90% | PASS |
| API contract | 3 endpoints · 18/18 tests | all applicable C1–C6 | PASS |
| Regression | 0 new failures | 0 new | PASS |
| J1 Architecture | 0.91 | ≥ 0.85 | PASS |
| J2 Security (OWASP 2025) | 0.92 | ≥ 0.85 | PASS |

**Verdict**: PASS · judge `<model>` · rubric v1.2.0 (from `architecture.md` v1.2.0)
**Self-healing**: SH-LOOP-1 1/3 · all other loops 0/3
```

- Status is exactly one of `PASS`, `FAIL`, `ERROR`, `N/A`; an `N/A` row carries its reason in the
  Result column.
- A `FAIL` row is never omitted or softened.
- The J1 and J2 per-criterion breakdowns follow the table whenever they were scored, a pass included.

### 1.1 Where the test code goes

Unit tests live in `tests/unit/<mirror-of-src>/` and API contract tests in `tests/api/<mirror-of-src>/` (`common/directory-structure.md`). The manual test plan
lives in the story's folder under `test-plans/` on the Base Branch (`common/branching-strategy.md` Section 7.1).

---

## 2. `evidence-manifest.md`

```markdown
# Evidence Manifest — Unit tests, coverage and regression — <story-key>

| Field | Value |
|---|---|
| Story | <Story N.M — title | BUG-ID — title | ENH-ID — title> |
| Branch / head | <branch> @ <short sha> · base <short sha> |
| Generated | <ISO 8601 timestamp, one real clock command> |
| AIRE version | <N, read live from CLAUDE.md> |
| Status | PASS | FAIL | ERROR | N/A — <reason> |

## Commands run
| # | Command | Working directory | Exit code |
|---|---|---|---|

## Tools
| Tool | Version |
|---|---|

## Result
Tests passed (X/X) · Changed lines covered (x/y, %) · Threshold (90%) · Whole-file coverage (for
transparency, not the gate metric) · Baseline pass/fail · Post-change pass/fail · New failures (each with
what broke and how it was fixed) · Test placement verdict. The API contract tests are recorded in E6, the
static evals, judge scores and scorecard in E7.

## Artifacts
| File | What it is |
|---|---|

## Exceptions and notes
<repo configuration used as-is, self-healing attempts that changed this result, or "None">
```

### 2.1 `coverage/changed-lines-coverage.json`

```json
{
  "key": "story-1.2", "base": "<sha>", "threshold": 90.0,
  "files": [
    { "path": "src/frontend/screens/BoardScreen.tsx",
      "changedExecutableLines": 2, "coveredLines": 2 }
  ],
  "lineCoverage": 100.0, "status": "PASS"
}
```

Computed from `git diff --unified=0 <base>` intersected with the coverage report's line records (or the
stack's equivalent). This is the number the coverage gate, the review report and the PR body quote.

### 2.2 `test-placement-check.log`

The run applies the placement rules (`common/directory-structure.md`, `implementation/code-generation.md`
Step 11b) to `git diff --name-only --diff-filter=ACMR <base>...HEAD` and writes every changed test path, its
classification (`unit-test` / `api-test` / `other`), the rule it was checked against, and the verdict.

---

## 3. Formats and consistency

| Artifact | Format source |
|---|---|
| Code review report | `implementation/code-review.md` "Code Review Report Template" |
| Security review report | `agents/code-security-review-agent.md` "Report Structure" — scoped to the diff |
| State / audit fragments | `common/parallel-work-state.md` Section 3 |

The files must agree:
1. The manifest's figures (tests passed, changed-line coverage, new regression failures) equal
   `changed-lines-coverage.json`, and every figure in `eval-summary.md` (E7) equals the artifact it was
   copied from (E1, E6, `static/`, `judge/`). Every figure later quoted in the review report, the PR body
   and the tracker comment matches `eval-summary.md`.
2. The latest code-review report names the security report of the same version
   (`<story-key>-security-review-v<X>.md`).

---

## 4. Before the commit

Part of each workflow's commit step (`dev-implement` Section D Step 2, and the matching commit step of
`bug-fix-implement`, `enhancement-implement` and `pr-fix`) — a checklist, not a separate gate:

1. Every E1–E7 file that applies to this story exists, is non-empty, and has its format.
2. The Section 3 consistency rules hold.
3. The fragment's `## Claim` block records the verified tracker claim (`common/parallel-work-state.md`
   Section 3.2).

A file whose underlying output exists is written or corrected from that real output. A missing underlying
output means its gate never ran: go back and run that gate's step (its own loop, counter continuing).
Never hand-write a result, a log or a figure. The evidence is committed with the story (`reports/**`
travels on the story branch).
