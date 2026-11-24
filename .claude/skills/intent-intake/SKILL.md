---
name: intent-intake
description: >
  Use this skill when someone wants to turn a raw idea, feature request, or piece of product context
  into an Intent that can enter the team's issue tracker — the light front-door gate. Trigger it on "I have an idea",
  "capture this as an intent", "start an intent", "get this into ADO", "turn this research/PRD/deck
  into an intent", or any moment a fuzzy idea needs to become real. It first asks what to create — an
  Epic, an Enhancement story (label `enhancement`) or a Change Request story (label `change-request`) —
  then whether the user has a document to reference or wants to explain in plain English. It gathers a
  consistent baseline — just enough thought to justify the item — produces a baseline intent artifact,
  and pushes the Epic or story directly to Azure DevOps Boards as a work item. It does NOT do deep elaboration or refinement; that happens later, with engineers, in intent-refinement.
compatibility: The az CLI (azure-devops extension) must be available — pushes the Epic or story directly to ADO at the end of intake.
---

# Intent Intake

The membrane between fuzzy thinking and a tracked Epic or story. Everything upstream — research, prototyping, KPI
exploration — lives wherever the team likes (Confluence, git, a napkin). Nothing is "real" until it
clears this gate and becomes an Epic, an Enhancement story or a Change Request story. This skill keeps the gate **fast and consistent**: a baseline
of thought, no more.

## Keep it light on purpose

The overwhelm people feel comes from refinement-depth thinking leaking into the intake moment.
Don't let it. Intake gathers six things and stops. Testable criteria, the domain model, NFRs, risk
registers — none of that belongs here; it happens later, with engineers, in intent-refinement. If you
find yourself asking for measurable thresholds or bounded contexts, you've gone too deep — pull back.

## Step -1 — Resolve the ADO project (read-only, no writes)

Resolve the Azure DevOps organization and project, first source that gives both — reuse it silently, no question asked:
1. `## Tracker` → `Organization` and `Project` in `runtime-artifacts/aire-state.md`, if that file and section exist.
2. A work-item URL the person pasted (`https://dev.azure.com/<org>/<project>/_workitems/edit/<id>` or `https://<org>.visualstudio.com/<project>/_workitems/edit/<id>`).
3. An Azure Repos `origin` remote (`git remote get-url origin` — `dev.azure.com` / `visualstudio.com`).

With none of these (this skill runs standalone, before any aire project), ask once for THIS run only (nothing is persisted, per the guardrails below):

```
Azure DevOps organization URL and project name? (e.g. https://dev.azure.com/myorg, "MyProject")
[Answer]:
```

## Step 0 — Ask what to create

**Before doing anything else**, ask the person this question:

```
What do you want to create?

A) Epic
B) Enhancement story
C) Change request story

[Answer]:
```

- **A**: the item is an Epic — everything below runs as written.
- **B or C**: the item is a story, never an Epic. The six baseline fields (Step 2) describe the story.
- **B (Enhancement story)**: a standalone story — no Parent Epic is asked and no Epic link is made.
- **C (Change request story)**: ask once more:
  ```
  Which Epic does this change request belong to? (work item ID or URL — or "none")
  [Answer]:
  ```
  Record the answer as the story's Parent Epic.

## Step 0.5 — Ask how the person wants to start

Next, ask the person this question:

```
How would you like to share your idea?

A) I have a document (PRD, research notes, prototype write-up, Confluence page, deck, etc.)
   → paste or share the link/content and I'll read it first
B) I'll explain it in plain English
   → just tell me the idea in your own words

[Answer]: 
```

- **If A**: Read the doc/link they provide, pre-fill every baseline field it already answers, then only ask about the gaps. Capture the `context_link` as the source URL or file reference.
- **If B**: Start from their words. Ask follow-up questions for any of the six baseline fields not covered. Set `context_link` to "plain English — no external doc".

## Step 1 — Capture the idea

Get the outcome in their words, business terms. One outcome per intent — if you hear two, flag and
split.

## Step 2 — Fill the baseline (the six)

Gather exactly these, no more. Ask in one or two short, tappable batches (multiple-choice + an open
"Other") — see `references/intake-questions.md`:

1. **Outcome** — one business sentence.
2. **KPI / business outcome** — the metric this moves.
3. **Rough success signal** — directional only ("faster entry", "fewer failed checkouts"). NOT testable yet.
4. **At least one explicit out-of-scope.**
5. **Known hard constraints** — or an honest "none known."
6. **Confidence + open unknowns**, and the context link.

A declared unknown is fine — better than a guess. Record unknowns; don't fill them with plausible fiction.

## Step 3 — Draft the baseline intent

Using `assets/intent-template.md` as a reference shape, draft the filled baseline intent in chat only — do not create any local file yet. Fill the BASELINE sections, leave the FULL sections blank (those are for intent-refinement). Show the draft to the person for review.

## Step 4 — Intake gate

Run the Intake gate checklist mentally. It only checks the six are present and non-garbage
— KPI named, out-of-scope not blank, unknowns declared, context linked. It does not check for
testable criteria; that bar is intentionally not here. Confirm with the person before proceeding.

## Hand off — Push the Epic or Story to Azure DevOps Boards

Once the intake gate passes, push the item chosen in Step 0 as an ADO work item in the project resolved in Step -1. Its tags (`System.Tags`):

| Step 0 answer | Item | Labels/tags |
|---|---|---|
| A | Epic | `intent-intake` |
| B | Story | `intent-intake`, `enhancement` |
| C | Story | `intent-intake`, `change-request` |

Follow this sequence:

1. **Confirm before pushing** — show the user a brief summary of what will be created:
   ```
   Ready to create an ADO [Epic | Enhancement story | Change request story] with the following details:
   - Title: [intent title]
   - Description: [full intent content from the filled template]
   - Labels/tags: [the tags from the table above]
   - Parent Epic: [work item ID, or none]        (change request story only)

   Push? (yes / no)
   ```
2. **On yes**, create the work item in the organization and project resolved in Step -1. The description is always the complete filled intent artifact (all BASELINE sections as-is, verbatim — do not summarise or shorten).
   - **Epic (A)**: `az boards work-item create --type "Epic" --title "<intent title>" --description "<complete filled intent artifact>" --project "{PROJECT}"`, then add `intent-intake` to `System.Tags`.
   - **Story (B or C)** — never an Epic:
     - `az boards work-item create --type "User Story" --title "<intent title>" --description "<complete filled intent artifact>" --project "{PROJECT}" --fields "System.Tags=intent-intake;enhancement"` (or `intent-intake;change-request`).
     - Change request story with a Parent Epic: link it per `aire-workflow/common/tracker-sync.md` Section 6. `none` → no link.
3. **Verify, don't assume**:
   - Re-fetch the created work item (`az boards work-item show`) and confirm (a) it is real and resolvable, (b) every label/tag from the table above is present, exact string, and (c) for a change request story with a Parent Epic, the link is there. Some integrations silently drop a labels/tags field passed at create time — do not treat a successful creation response alone as proof it landed. If a label is missing, retry once by updating the item's labels/tags (append the missing ones to whatever is there). If it still fails after the retry, stop and tell the user explicitly — do NOT report the intake as complete with a label unconfirmed.

After the item is live and its labels/tags are confirmed, tell the person the next step:
- **Epic**: intent-refinement.
- **Enhancement story**: intent-refinement when it needs more detail; then build it with `ticket-implement <TICKET-ID>`.
- **Change request story**: intent-refinement when it needs more detail; then apply it with `epic-change-request <TICKET-ID>` while its Epic's cycle is open.

## HARD GUARDRAILS — do not violate

- **No file or directory creation.** Do not create, write, or modify any file or folder in the workspace. The intent lives only in Azure DevOps Boards.
- **No local artifacts.** Do not save or instantiate `intent-template.md` locally. It is a reference shape — draft the content in chat, then push it.
- **No runtime-artifacts/audit.md writes.** Do not write to `runtime-artifacts/audit.md` or any other log file.
- **Tracker push is the only write action.** Creating the Epic or story in ADO, and a change request story's Parent Epic link (plus, if needed, one retry label/tag update per Step 3 of the hand-off sequence). Reading `## Tracker` from `runtime-artifacts/aire-state.md` and the `origin` remote (Step -1) is read-only and does not violate this.
- **Confirm before every write.** Never create an item without explicit user approval ("yes").
- **An Enhancement or Change request item is ALWAYS a story** — never created as an Epic.
- **EVERY item this skill creates MUST carry the exact label/tag `intent-intake` — no exceptions, not optional** (Epic, Enhancement story and Change request story alike) — and an Enhancement story also the exact `enhancement`, a Change request story also the exact `change-request`. This applies unconditionally to every run, not a per-item judgment call. A pre-existing *similar-looking* label elsewhere in the project (`intake`, `intent_intake`, `Intent-Intake`, `enhance`, `CR`, `change_request`, etc.) is NOT a substitute — the exact strings must be present. Their presence is verified by re-fetching the created item (never assumed from the create call's response alone) before the intake is reported complete. A run that creates the item but cannot confirm its labels is NOT a successful run; stop and surface the failure to the user. See Step 3 of the hand-off sequence for the exact procedure.

## Bundled resources

- `assets/intent-template.md` — reference shape only; never instantiate it as a local file.
- `references/intake-questions.md` — the light question batches for the six baseline fields.
