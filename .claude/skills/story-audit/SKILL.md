---
name: story-audit
description: >
  Audits an existing Story or Epic work item in Azure DevOps Boards against the AIRE quality bar.
  Fetches the work item, assesses what's present vs missing, scores it, and offers to fill gaps
  through targeted questions — then updates the work item in ADO with the improvements. Works for
  any work item type
  (Story, Epic, Task) but applies the appropriate checklist for each.
  Trigger on "audit this story", "check this story", "is this story ready",
  "audit this epic", "story audit", "review work item 4821", "is 4821 complete",
  "validate this ticket", "check this ticket", or any request to verify a tracked issue
  has enough detail to be actionable.
compatibility: The az CLI (azure-devops extension) must be available and authenticated.
---

# Story & Epic Audit

Fetch a work item from Azure DevOps Boards, measure it against the right quality bar, report what's
strong and what's missing, and — if the user wants — fill the gaps through targeted questions and
update the work item.

## Philosophy

**Assess first, fix second.** The audit is a read-only diagnosis. Fixing is opt-in. The user
may just want the report, or they may want to walk through the gaps and patch the issue right
now. Support both.

**Type-aware.** Epics and Stories have different quality bars. Detect the work item type from
ADO and apply the matching checklist. If the type is something else (Task, Bug, Initiative), use
the closest checklist and note the adaptation.

---

## Step 1 — Ask for the issue

If the user already provided a reference (e.g. "audit 4821"), use it. Otherwise ask:
```
Which work item should I audit? Provide the work item ID (e.g. 4821) or URL.
```

Resolve the ADO organization and project, first source that gives both: `## Tracker` →
`Organization` and `Project` in `runtime-artifacts/aire-state.md` if it exists (reuse silently),
else the work-item URL the user gave, else `## Repo Host` when it is `AZURE_REPOS` (an Azure Repos
`origin`), else ask once for this run (`common/tracker-sync.md` Section 1).

## Step 2 — Fetch and classify

Fetch the work item with `az boards work-item show`, per `common/tracker-sync.md` Section 2/Section 8.
Identify:
- **Issue type** (Epic, Story, Task, Bug, etc.)
- **Summary**
- **Description** (full content)
- **Labels/tags**
- **Status**
- **Links** (parent Epic, child issues, related issues)

Select the matching checklist from `references/quality-checklists.md`:
- Epic → Epic Checklist
- Story / Task → Story Checklist
- Other → Story Checklist (adapted, note this to the user)

## Step 3 — Run the audit

Evaluate every item on the checklist. For each item, assign one of:

- **PASS** — present and sufficient
- **WEAK** — present but thin, vague, or incomplete
- **MISSING** — not present at all
- **N/A** — not applicable for this issue

Present the results as a scorecard:

```
Audit: [KEY] — "[summary]" ([issue type])

SCORECARD
=========
[x] Item name                          PASS
[~] Item name                          WEAK — [brief reason]
[ ] Item name                          MISSING
[-] Item name                          N/A

Score: X / Y passing (Z%)

VERDICT: [Ready / Needs Work / Incomplete]
```

**Verdict thresholds:**
- **Ready** — all required items PASS, no MISSING on required fields
- **Needs Work** — no MISSING on required fields, but 1+ WEAK items
- **Incomplete** — 1+ required fields are MISSING

## Step 4 — Offer to fix

If verdict is Ready, congratulate and stop.

If verdict is Needs Work or Incomplete, offer:

```
This issue has gaps. Want me to:

A) Walk through the gaps and help fill them — I'll ask targeted questions, then update the work item in ADO
B) Just take the report — I'll leave the issue as-is

[Answer]:
```

**If A**: For each WEAK or MISSING item, ask focused questions (multiple-choice where possible,
with an open "Other"). Work through them in priority order (required fields first, then
recommended). After gathering answers, draft the updated description and show it to the user
for approval before writing to the board.

**If B**: Done. The scorecard is the deliverable.

## Step 5 — Update the issue (only if user chose A)

1. Draft the improved description incorporating all gathered answers.
2. **Show the full updated description** to the user for review.
3. **Confirm before writing**: "Update [KEY] with these improvements? (yes / no)"
4. On yes, update the work item with `az boards work-item update`. Verify success.
   **For a Story, acceptance criteria go in the board's Acceptance Criteria field only, never in the
   description** (`aire-workflow/common/tracker-sync.md` Sections 1 Field Map and 3.1): write the
   complete AC list to that field, and keep the description free of AC.
5. Report: "Updated [KEY]."

---

## HARD GUARDRAILS — do not violate

- **No file or directory creation.** Reading `## Tracker` from `runtime-artifacts/aire-state.md`, if it exists, is a read and does not violate this.
- **No local artifacts.** The audit lives in chat; fixes go to the board only.
- **Board in, board out.** Read via `az boards work-item show`, update via `az boards work-item update`. Nothing else.
- **Confirm before every write.** Never update without explicit user approval ("yes").
- **Never fabricate content.** If something is unknown, ask — don't guess. Mark genuine unknowns as open questions.
- **Preserve existing content.** When updating, merge improvements into the existing description — never discard content that was already there.

---

## Bundled resources

- `references/quality-checklists.md` — the Epic and Story checklists used for scoring.
