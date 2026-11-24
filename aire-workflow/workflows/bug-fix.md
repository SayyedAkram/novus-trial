# WORKFLOW: `bug-fix <TICKET-ID>` (Bug/Defect — Planning)

**Purpose**: Take an existing defect ticket — an Azure DevOps Boards work item (its work item ID or URL) — through a trimmed Planning + design pass, break once at the Verification Engineer handoff (Step 9 — design artifacts committed + pushed so the Verification Engineer can start `/ve-implement` in parallel), then continue into `bug-fix-implement` on the user's `yes` — no second keyword needed. The ticket may be of issue type Bug OR Story/Task — raised by anyone (not necessarily via the `raise-defect` skill).

**How the bug flow differs from the epic flow**:
- ONE branch: `bug/<TICKET-ID>-<kebab-title>` cut from the base branch (the development branch). No epic branch, no story branches.
- ONE story, derived from the ticket itself — no team-size question, no story generation loop, no push to the tracker (the ticket already exists), no Dependency Graph stage.
- NO PR after Requirements approval — the single `[BUG]` PR is raised at the END by `bug-fix-implement`, after code review approval.
- A NEW Impact Analysis + AI-Origin Detection step replaces multi-story planning.
- The ticket is claimed automatically at Step 1 — `New` → `Active`, or `In-Revision` → `Active` on a re-run (`common/status-model.md` B2, B4). The only other move these workflows ever offer is the confirm-first `Active` → `In-Revision` when the defect looks invalid (Step 5a.1, B3). They NEVER move the ticket to `Resolved` — the developer does that on the board after the PR's two approvals, the merge into the development branch and the DEV deploy (B7)
- All Parent-Epic sync steps are skipped — there is no epic in this flow.

## MANDATORY: Rule Details Loading

This workflow may be invoked standalone in a fresh session. Resolve the rule details directory (`aire-workflow/`) and load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md`
- `common/branching-strategy.md` — Bug Branch Model section
- `planning/workspace-detection.md`, `planning/reverse-engineering.md` (if RE runs), `planning/requirements-analysis.md`, `planning/workflow-planning.md`
- `agents/defect-provenance-analyst.md` — loaded at Step 5b (line-level AI-origin detection)
- Extensions per CLAUDE.md's Extensions Loading rules (Security Baseline is ALWAYS mandatory)

**Loaded on demand (not at start):** `implementation/architecture-doc.md` and
`implementation/test-plans-checkpoint.md` — loaded together at Step 8.5 (the STOP CHECKPOINT), exactly
like the epic flow loads them at its own STOP CHECKPOINT.

Display the welcome message (`common/welcome-message.md`) once at start. All CLAUDE.md audit-logging rules apply: log EVERY user input verbatim in `runtime-artifacts/audit.md` (append-only, ISO 8601 timestamps).

## MANDATORY: Audit Entry Format — TRACKER ITEM on EVERY entry

Every runtime-artifacts/audit.md entry written during this workflow MUST include the `**User Email**:` field (current session email) and the `**TRACKER ITEM**:` field with the defect ticket as a clickable link:

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO timestamp]
**User Email**: [current session email — read live from the session context]
**User Input**: "[Complete raw user input - never summarized]"
**TRACKER ITEM**: "[The defect ticket, as an ADO work item hyperlink]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

## Approval Gates — there are NONE, in this file or downstream

The bug flow has no numbered approval gates at all. `bug-fix-implement` is fully automatic: its
fix plan is announced and executed, and its automated Code Review routes on its own verdict — findings
are remediated automatically and re-reviewed until clean.

The approvals inside THIS file (requirements at Step 4, the single story at Step 6) are
stage approvals, NOT numbered gates. **Impact Analysis (Step 5) and Workflow Planning (Step 7)
are NOT gated at all** — they are announced and the flow proceeds automatically. The Step 8.5
package approval is the STOP CHECKPOINT's standard 2-option stage approval (the test plan asks nothing — it is published at Step 9), and the Step 9 yes/no
is deliberately unnumbered flow control. **Never put "GATE" in any audit heading written by this
workflow or by `bug-fix-implement`.**

---

## Step 1 — Ticket Capture

1. **Resume check first**: if `runtime-artifacts/aire-state.md` exists, read it. If `## Tracker` records a DIFFERENT ticket/epic, ask the user which to keep — NEVER silently overwrite. If it records this same ticket with `Workflow Type: bug`, resume from the recorded stage per `common/session-continuity.md`. If `## Tracker` doesn't exist yet (standalone invocation before any aire workflow ran), run ADO Project Resolution (`common/tracker-sync.md` Section 1) first — a pasted work-item URL gives the organization and project.
2. Per `common/tracker-sync.md` Section 8: parse the `<TICKET-ID>` from the invocation (work item ID or URL). If missing, ask in one line ` Azure DevOps work item ID (or URL)?` and wait. Fetch the ticket (`az boards work-item show`) — accept work item type Bug or Story/Task. Save title, description, severity, steps to reproduce, environment, and acceptance criteria (if any) to `spec/plans/bug-brief.md`.
   The bug-brief is the intake brief: it defines WHAT to fix and is the primary input to every later stage.
3. Record in `runtime-artifacts/aire-state.md`:
   ```markdown
   ## Tracker
   - Workflow Type: bug
   - Parent Ticket: 4840            (the defect being fixed — work item type: [Bug/Story])
   - Ticket URL: https://dev.azure.com/<org>/<project>/_workitems/edit/4840
   - Organization: <org-url>
   - Project: <project>
   - Parent Epic: none              (bug flow — all Parent-Epic sync steps are skipped)
   ```
   `Workflow Type: bug` is the marker every resumed session reads FIRST — it routes execution to this workflow's rules, not the epic flow's.
4. **MANDATORY**: Log the invocation (complete raw input) and the ticket fetch in runtime-artifacts/audit.md.
5. **Claim the ticket (AUTOMATIC — starting the analysis IS starting work on the bug)**: read its status
   live (`common/tracker-sync.md` Section 4). `New` or `In-Revision` → move it to `Active`
   (`common/status-model.md` B2 / B4) and assign the operator (`common/tracker-sync.md` Section 5), both
   without asking; verify both by re-fetching, announce, log. Already `Active` (a resumed or re-run
   cycle, e.g. after a failed retest) → no move. `Resolved` or `Closed` → STOP: the ticket is not open
   for a fix; tell the user to have the Verification Engineer reopen it (`Resolved` → `Active`) first.
   A ticket of a Story/Task type follows the story lifecycle instead (`ToDo` → `In Progress`,
   status-model S2) and is never offered In-Revision. A
   resumed cycle runs this item again before continuing from its recorded stage — it moves nothing when
   the ticket is already `Active`.

## Step 2 — Workspace Detection + Bug Branch

1. Execute `planning/workspace-detection.md` Steps 1–4 as written (workspace scan, brownfield/greenfield, RE-artifact search anywhere in the repo, state file creation). A bug fix is expected to be brownfield; if the workspace is empty, STOP and tell the user there is no code to fix.
2. **Step 4.5 replacement — create the BUG branch (automatic)** instead of an epic branch. Execute `common/branching-strategy.md` **Bug Branch Model**:
   - Record the base branch (`git branch --show-current` — never assume `main`).
   - Create `bug/<TICKET-ID>-<kebab-case-ticket-title>` (whole name ≤ 60 chars; working tree must be clean, else show `git status` and ask). A re-fix of the same ticket after a failed retest finds the earlier cycle's branch already on origin — append `-r2`, `-r3`, … automatically and announce it.
   - Record in `runtime-artifacts/aire-state.md`:
     ```markdown
     ## Branching
     - Base Branch: develop
     - Bug Branch: bug/4840-login-timeout
     - Test Plan Folder: test-plans/4840-login-timeout/   (rides the [BUG] PR — `common/branching-strategy.md` Section 7)
     - Bug PR: (pending — raised by bug-fix-implement after code review approval)
     ```
   - **ALL work — docs and code — happens on this ONE branch.** No story branches are ever cut in the bug flow.
3. Log the branch creation (name, base) in runtime-artifacts/audit.md, then run the Atlas Artifact Sync Opt-In (`common/atlas-artifact-sync.md` Section 2 — chat-only, skipped when `## Atlas Artifact Sync` is already recorded); present the Workspace Detection completion message and proceed automatically.

## Step 3 — Reverse Engineering (CONDITIONAL — as-is)

Exactly per the epic flow: if RE artifacts exist anywhere in the repo (or restorable from `aire-archives/epics/` or `aire-archives/bugs/` — workspace-detection Step 3 covers this), reuse them and skip. Otherwise run `planning/reverse-engineering.md` in full, with its approval gate. Log everything in runtime-artifacts/audit.md.

## Step 4 — Requirements Analysis (as-is, bug-scoped)

1. Execute `planning/requirements-analysis.md` with `spec/plans/bug-brief.md` as the primary input. Depth will usually be minimal (the ticket defines the defect); use standard/comprehensive only if the fix is genuinely complex or high-risk. Its Step 1.5 reads the `## Context Project` answer captured by `ticket-implement` (Step 3.5) and, if `Existing Knowledge: Yes`, uses only the recorded path as background context about the existing system — do NOT re-ask.
2. Extension opt-ins are presented as usual; Security Baseline is always enforced.
3. **Wait for explicit approval** of requirements.md.
4. On approval: commit the planning artifacts on the bug branch. Do NOT raise a PR here — unlike the epic flow's Step 10, the bug flow raises its single `[BUG]` PR at the end, inside `bug-fix-implement`.
5. **MANDATORY**: Log the user's response verbatim in runtime-artifacts/audit.md.

## Step 5 —  Impact Analysis + AI-Origin Detection

**Purpose**: Find WHERE the fix must be made (better planning), and determine whether the defective code was AI-generated (defect attribution).

### 5a. Impact Analysis
1. Using the RE artifacts, the bug-brief, and code search (grep/glob/read), identify the **affected files/components**: where the defect lives, the likely root cause, and the blast radius (callers, consumers, shared files). The Root-Cause Hypothesis MUST cite explicit `file:line-range` evidence per affected file — 5b's line-level provenance tracing consumes these exact ranges.
2. Write `spec/plans/impact-analysis.md`:
   ```markdown
   # Impact Analysis — [TICKET-ID]
   ## Root-Cause Hypothesis
   [What is wrong and why, with file:line evidence]
   ## Affected Files
   | File | Why it must change | Defect-line origin (5b) | Originating ticket (5b) |
   |------|--------------------|-------------------------|-------------------------|
   ## Blast Radius
   [Callers/consumers/tests that could be impacted by the fix]
   ```
3. This document is the primary planning input for `bug-fix-implement`'s fix plan.

### 5a.1 Not a bug? — In-Revision (CONFIRM-FIRST, offered only on evidence)

Offer this ONLY for a bug-type ticket, and ONLY when 5a shows one of:
- **Not reproducible** — following the ticket's steps to reproduce against the current code does not
  produce the reported actual result, and 5a found no `file:line` that could produce it; or
- **Expected result contradicts the requirements** — the reported expected result conflicts with an
  approved requirement or acceptance criterion (cite the REQ-ID / AC and quote it).

Otherwise skip straight to 5b. When it applies, show the evidence and ask:
```
[TICKET-ID] may not be a bug: <not reproducible | expected result contradicts REQ-x / AC-y>.
  Evidence: <what was run or read, with file:line or the requirement text>
Move [TICKET-ID] to In-Revision and ask the Verification Engineer to double-check? (yes / no)
```
- **yes** → post the comment to the Verification Engineer (`common/tracker-sync.md` Section 10): why it
  is believed not to be a bug, the evidence, and the question — *"Please confirm whether this is a valid
  defect. If it is, say so here and I will continue the fix; if not, close it."* Then move the ticket to
  `In-Revision` (`common/status-model.md` B3; Section 4 of tracker-sync), verify both, log the prompt,
  raw answer and results. Record the stage in `runtime-artifacts/aire-state.md` as
  `Halted at Step 5a.1 — In-Revision, awaiting the Verification Engineer`, commit and push the analysis
  artifacts written so far on the bug branch (`AIRE-Version: [N]` trailer), and HALT — no fix, no PR. The Verification Engineer either closes it
  (`ve-list-work`, B5) or confirms it valid; the developer then re-runs `ticket-implement [TICKET-ID]`,
  which resumes here, re-claims it (`In-Revision` → `Active`, Step 1 item 5) and continues to 5b.
- **no** → continue to 5b; log the answer.

### 5b. AI-Origin Detection (line-level, via the Defect Provenance Analyst agent)
1. Load `agents/defect-provenance-analyst.md` and execute its procedure with 5a's root-cause `file:line-range` findings as input. It traces each defective line (not the file's last change) to the commit that introduced the defective logic (`git blame -w -M -C -L`, walking past cosmetic commits via `git log -L`; omission bugs attribute to the enclosing block's introducing commit), resolves that commit's PR, resolves the originating tracker item that shipped the line, and returns a Provenance Verdict table — verdict AI-generated / human / undetermined, each row with concrete evidence (SHA, PR number, which marker) plus the originating item and which source it came from.
2. Record each verdict (with introducing commit + evidence) in the impact-analysis table's Defect-line origin (5b) column, and include the full Provenance Verdict table in `spec/plans/impact-analysis.md`. Label only on positive evidence (per the agent's marker rules) — NEVER guess; "undetermined" gets no label.
3. **If ANY defective line's introducing change is AI-generated —  apply the label AUTOMATICALLY (no confirmation)**, exactly like the 5c causal links and for the same reason: the analyst labels only on positive, verified evidence (an "ai-generated" PR label, a Claude co-author trailer, or an `AIRE-Version:` trailer), and "undetermined" is never labeled — so there is no judgement call left for the user to make.
   - Apply the tag `ai-generated-defect` to the ticket per `common/tracker-sync.md` Section 9 (add to `System.Tags` via `az boards work-item update`), verify it landed, and announce it (not a question):
     ```
      Labeled [TICKET-ID] `ai-generated-defect` — defective line(s) [file:line(s)] were introduced by
        AI-generated code (evidence: [PR #N "ai-generated" label / Claude co-author on <sha> / AIRE-Version trailer]).
     ```
   - Log the complete evidence (file:line, introducing commit SHA, PR number, which marker) in runtime-artifacts/audit.md. If the label already exists, skip silently. If the tracker call fails, report the failure and continue — labeling is non-blocking.
4. If no defective line is AI-generated: log "human-origin (or undetermined) — no label applied" in runtime-artifacts/audit.md with the per-line evidence.

### 5c. Link the Bug to its Originating Ticket(s) — AUTOMATIC (no confirmation)

Establishes the relationship `[Bug] --"is caused by"--> [Originating Story / Bug / Enhancement]` so the causal chain is recorded on the bug work item. This runs automatically — there is no confirm-first gate — because the analyst reports an item only on positive, verified evidence. Mechanics per `common/tracker-sync.md` Section 7.

1. Take the analyst's deduplicated list of resolved originating tracker items (5b). Drop any item equal to the bug's own `Parent Ticket` (self-link guard). If the list is empty (all rows `—` or `undetermined`), skip silently and log "no originating item resolvable — no link created" in runtime-artifacts/audit.md with the per-line evidence.
2. For each remaining work item, BOTH, in this order:
   - **Link** — best-effort `az boards work-item relation add --id [BUG-ID] --relation-type "System.LinkTypes.Related" --target-id [ORIGIN-ID]` (the closest native type — carries no direction/semantics on its own).
   - **Comment** — a mandatory discussion comment on the bug work item stating the causation explicitly (`az boards work-item update --id [BUG-ID] --discussion "Caused by work item #[ORIGIN-ID] — <one-line reason>"`). The comment is the authoritative record; the `Related` link is metadata only.

   Verify both landed (re-read the bug with `az boards work-item show --id [BUG-ID] --query relations`, and confirm the comment posted).
3. Log every created link in runtime-artifacts/audit.md with the complete evidence chain: `file:line` → introducing commit SHA → PR → matched source (`pr-title` / `commit-subject` / `branch`) → originating item → link and comment. Log failures and skips with the same detail.
4. Announce the created links in the Step 5 completion summary.

### 5d. Announcement ( AUTOMATIC — no approval gate)

Present the Impact Analysis summary (including the Provenance Verdict table, any `ai-generated-defect` label applied in 5b, and any links created in 5c) as an announcement, then proceed straight to Step 6 — do NOT ask for approval and do NOT block.

The impact analysis is evidence-based (`file:line` citations, git-traced provenance) and is not the last word: it is re-validated against the current code at `bug-fix-implement` Step 4.2, and its conclusions are re-surfaced inside the announced fix plan (`bug-fix-implement` Step 4). Gating it here would present the same content twice.

Log in runtime-artifacts/audit.md that the impact analysis was completed and auto-approved, with the affected-file list and the provenance verdicts. If the user volunteers a correction ("you missed file X", "that's not the root cause"), update `spec/plans/impact-analysis.md`, re-announce, and continue — that is an interrupt, not a gate.

## Step 6 — Single Story (replaces User Stories + Dependency Graph)

1. Write exactly ONE story to `spec/plans/stories.md`, derived from the ticket + requirements + impact analysis: story ID `1.1`, title = the fix, acceptance criteria = defect resolved + regression-safe (from the ticket's expected behavior). Do NOT ask team size, do NOT generate personas beyond what the ticket implies, do NOT ask about pushing to the tracker (the ticket already exists — no new work item is ever created), do NOT create `dependency-graph.yml`.
2. Populate the Story Tracker in `runtime-artifacts/aire-state.md` with the single row:
   | Story | Title | Requires | Tracker ID | Status | Start | End | Recorded |
   |-------|-------|----------|------------|--------|-------|-----|----------|
   | 1.1 | [Fix title] | none | 4840 | Active | | | [timestamp] |
   The Tracker ID column is the existing defect ticket — the Tracker Sync Rule applies to it at every status change. `Status` is the one claimed at Step 1 item 5 (`In Progress` for a Story/Task-type ticket).
3. **Wait for explicit approval** of the story; log the response verbatim.

## Step 7 — Workflow Planning (as-is)

Execute `planning/workflow-planning.md`: determine which Implementation design stages EXECUTE/SKIP for this fix (most bugs skip most design stages), generate the execution plan + visualization (validate Mermaid), announce it, and proceed automatically — that file's Step 9/10 are an announcement, not an approval gate. Each design stage the plan selects still runs its own approval when it executes.

## Step 8 — Implementation Design Stages (CONDITIONAL, as-is)

Run the system-level design stages the plan selected (Functional Design → NFR Requirements → NFR Design → Infrastructure Design), each per its rule file with its standardized 2-option completion message and approval gate. Scope each to the bug-brief + impact analysis.

`package-dependencies.md`, `architecture.md` and the fix's manual test plan are written at Step 8.5 (STOP CHECKPOINT),
immediately below, once the last design stage completes (or all were skipped).

## Step 8.5 — STOP CHECKPOINT: `package-dependencies.md` + `architecture.md` + the fix's manual test plan

**Purpose**: this bug fix gets the SAME design checkpoint the epic flow gets at its own STOP CHECKPOINT
(CLAUDE.md) — scoped to ONE fix instead of a whole epic. Load
`implementation/package-dependencies-doc.md`, `implementation/architecture-doc.md` and
`implementation/test-plans-checkpoint.md`.

1. **MANDATORY**: Log reaching this checkpoint in audit.md.
1.5. **`spec/plans/package-dependencies.md`** (ONE approval, before `architecture.md`) — write it per
   `implementation/package-dependencies-doc.md`, scoped to this ticket: the packages it adds or
   upgrades at exact versions looked up live, and the existing ones kept as they are. Present its
   2-option approval and WAIT — or, with nothing new to install, announce that and continue. Log the
   prompt and the complete raw response.
2. **`spec/plans/architecture.md`** — if absent, write it per `implementation/architecture-doc.md`,
   consolidating whichever Step 8 design stages ran (most bugs skip most of them — say so explicitly,
   never invent a decision) plus the reverse-engineering/Atlas artifacts as the existing-system
   baseline. Version it and log it in audit.md. Then write `spec/plans/judge-rubrics.md` when it is
   absent or its version differs (`implementation/architecture-doc.md` Section 6).
3. **THE FIX'S MANUAL TEST PLAN (MANDATORY — automatic, before any code)** per
   `implementation/test-plans-checkpoint.md` (UI/UX mockups run first when that extension is enabled).
   These are the LAST design artifacts of the cycle and the last thing written before any code exists.
   For this one ticket:
   - `test-plans/<TICKET-ID>-<title>/` — the bug's Test Plan Folder on the bug branch
     (`common/branching-strategy.md` Section 7.4) — by invoking the `ve-implement` skill in WORKFLOW MODE
     with this ticket (`agents/ve-implement-agent.md` Mode Detection — no story-picker, no `ve/…`
     branch, no approval checkpoint, no push/PR), including the case that reproduces the defect. Never
     re-implement its steps inline. The generated files ride Step 9 Item 1's commit, and later the
     `[BUG]` PR into the Base Branch.
   - **Blocking coverage check**: every acceptance criterion has ≥ 1 manual test case. A gap is fixed
     here, not deferred.
   - **Then proceed straight to Step 9** — it pushes the plan on the bug branch and its message tells
     the Verification Engineer to review it there. Ask nothing.
   This is scope derivation, NOT the Verification Engineer's sign-off — the Verification Engineer
   changes the plan with `ve-list-work` Option C, and only `ve-list-work` can close the ticket.

## Step 9 — Verification Engineer HANDOFF BREAK → then continue into `bug-fix-implement`

After the design stages complete (or are all skipped), mark in `runtime-artifacts/aire-state.md`: `Design complete — awaiting bug-fix-implement`. Log in runtime-artifacts/audit.md.

**This is a deliberate BREAK in the flow.** The analysis + design artifacts are everything the Verification Engineer needs, and the Verification Engineer must not have to wait for the fix. So before the fix is built:

1. **Commit + push the analysis, design and STOP CHECKPOINT artifacts on the bug branch (automatic — this is what unblocks the Verification Engineer)**: stage `spec/**` (bug-brief, requirements, impact analysis, the single story, `package-dependencies.md`, `architecture.md`), Step 8.5 Item 3's `test-plans/<TICKET-ID>-<title>/`, the updated `runtime-artifacts/aire-state.md` and `runtime-artifacts/audit.md`; commit on the bug branch with an `AIRE-Version: [N]` trailer (`[N]` read live from `CLAUDE.md`); push to origin. Announce the commit hash + pushed branch and log both in audit.md. If the push fails, say so explicitly and tell the user to push manually — the Verification Engineer cannot start until this branch is on origin. Still no `[BUG]` PR here.
2. Present the break message below and block on its yes/no.

```markdown
# Bug Analysis Done — Design Artifacts Pushed

 **Ticket**: [TICKET-ID] — [title]  ([ai-generated-defect label applied / human-origin / undetermined])
 **Caused by**: [4821, 4825 — Related link + causation comment on the bug / none resolvable]
 **Impact**: [N] files identified in spec/plans/impact-analysis.md
 Design stages: [list which ran vs were skipped]
 Manual test plan: `test-plans/[TICKET-ID]-[title]/`, written at this checkpoint, so the test
   plan exists before a line of the code does.
 Branch: bug/[TICKET-ID]-[title] (cut from [base branch]) — analysis + design **committed and pushed** ([commit hash])

> **<u>Verification Engineer — the manual test plan is pushed to `bug/[TICKET-ID]-[title]`.</u>**
> Review `test-plans/[TICKET-ID]-[title]/` on that branch. Changes needed? Run `/ve-list-work` and
> pick **C** — it updates the plan on the bug branch and pushes it (the `[BUG]` PR picks it up).
> Once the fix is merged, deployed to DEV and the ticket is `Resolved`, retest it by executing this
> test plan, then use `ve-list-work` to close the ticket or send it back to `Active`.
[IF Novus Test Automation is enabled (`common/extensions-loading.md` Section 5):]
> To automate this ticket's manual cases in Novus, run `/novus-automate [TICKET-ID] --url <local or allowed URL>`.

> ** <u>**DEV — continue to the fix implementation**</u>**
> **Continue to bug fix implementation now? (yes / no)**
> **yes** → everything below runs automatically, with no further questions: baseline regression and
> static eval baseline → fix plan (announced) → fix + unit tests (≥90% coverage) → API contract tests
> (when the fix changes an endpoint) → test placement → FULL regression → static evals (D1–D7) →
> J1/J2 judge score checkpoint (≥0.85) → eval scorecard → auto code review, with any findings
> auto-remediated and re-reviewed until clean → `[BUG]` PR to [base branch]
> → auto PR review → then STOP (the cycle archive is MANUAL — you run `archive-epic` while the
> `[BUG]` PR is still open, then the PR is approved and merged).
> **no**→ I halt here; the state is saved. Resume any time with `ticket-implement [TICKET-ID]`
> (or `bug-fix-implement`) and it picks up at the fix.

Use the keywords EXACTLY as shown — do not describe what you want in your own words. Any other
   phrasing is not a framework trigger and the workflow will not advance.
```

3. **Block until the user answers.** Log the raw answer in audit.md.
   - On no — halt here. The break is the end of the run; say nothing further.
   - On yes — read `workflows/bug-fix-implement.md` and follow it exactly from its Step 1, in the same session, as if the user had typed `bug-fix-implement`. That workflow is fully automatic — it asks only which branch the `[BUG]` PR goes into: the fix plan is announced and executed, and any code-review finding is auto-remediated and re-reviewed until the verdict is clean, after which the `[BUG]` PR is raised on its own.

Substitute every placeholder (`[TICKET-ID]`, `[base branch]`, `[commit hash]`) with real values — never ship a placeholder to the user. Emit the Novus line only when that extension is enabled, and never emit the `[IF …]` marker itself. Present the message exactly as written and nothing else — no notes, caveats or summary before or after it; anything else worth keeping goes to `runtime-artifacts/audit.md`.

---

## Critical Rules
- EVERY audit entry carries the `**TRACKER ITEM**:` field.
- Step 8.5 (STOP CHECKPOINT) gives this ONE-fix cycle the SAME design checkpoint the epic flow gets: `package-dependencies.md`, `architecture.md` and the fix's manual test plan, all before any code. Never skip Step 8.5 on the reasoning that "this is only a bug fix."
- Step 9 is a **BREAK, not a stop-and-wait-for-a-keyword**: ALWAYS commit + push the analysis/design/STOP-CHECKPOINT artifacts on the bug branch FIRST (the Verification Engineer reviews the test plan there), present the handoff, then ask the yes/no. On yes continuation into `bug-fix-implement` happens in the same session — no second keyword. On no, halt with state saved. The yes/no is flow control, deliberately unnumbered — never write "GATE" into its audit heading. It is the LAST question of the entire bug cycle: `bug-fix-implement` has no gates.
- The Step 9 break NEVER blocks the Verification Engineer on the dev: their `/ve-implement [TICKET-ID]` run is independent of the yes/no answer and of the fix existing at all.
- This workflow owns NO numbered gate, and neither does `bug-fix-implement`. Its own approvals (requirements, story) are stage approvals; NEVER write "GATE" into an audit heading from this file.
- ONE branch (`bug/...`), ONE story, NO dependency graph, NO new work items, NO epic branch, NO Parent-Epic sync.
- NO PR at requirements approval — the single `[BUG]` PR is raised by `bug-fix-implement` after review approval.
- AI-origin labeling is evidence-based, line-level (introducing commit of the defective line(s), per `agents/defect-provenance-analyst.md`) and **AUTOMATIC — never confirm-first**: on positive evidence ("ai-generated" PR label OR Claude co-author trailer OR `AIRE-Version:` trailer) apply `ai-generated-defect`, verify, announce, log the full evidence chain. "Undetermined" is never labeled — which is exactly why no confirmation is needed.
- Impact Analysis (Step 5d) is announced, never gated — it is re-validated at `bug-fix-implement` Step 4.2 and re-surfaced inside the announced fix plan.
- The "is caused by" link to the originating ticket (Step 5c) is created automatically — no confirmation — for every originating key the analyst resolves on positive evidence, whether the defective line was AI-generated or human-written. The originating ticket may be a story, a bug, or an enhancement (all three producers stamp their work item ID on the commit subject, PR title, and branch). Never link on a guessed ID and never self-link. The link is a `Related` link plus a mandatory comment recording the causation (`common/tracker-sync.md` Section 7) — both, never the bare link alone.
- The defect ticket is claimed automatically (Step 1 item 5) and moves to `In-Revision` only through the confirm-first Step 5a.1; this flow NEVER moves it to `Resolved` or `Closed` (`common/status-model.md` Section 7). 
- Security Baseline extension always applies; other extensions per their recorded opt-ins.
