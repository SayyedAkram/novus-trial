---
name: intent-refinement
description: >
  Use this skill to take an existing Epic, Enhancement story or Change Request story (a work item in
  Azure DevOps Boards) and refine it to full detail through structured
  elaboration. Trigger it on "refine this intent", "elaborate this Epic", "flesh out the Epic",
  "deepen this intent", "add detail to the Epic", "refine this story", or whenever a thin Epic or story
  needs to be brought up to a fully-detailed standard before building begins. The skill asks whether it
  is an Epic, an Enhancement story or a Change Request story, asks for its reference, fetches its
  current content, runs focused elaboration questions, and updates the same work item in ADO with
  all the refined detail.
compatibility: The az CLI (azure-devops extension) must be available.
---

# Intent Refinement

The deep elaboration work: take a real Epic, Enhancement story or Change Request story, pull what's
there, and through structured questioning drive it to full detail — measurable success criteria,
binding constraints, domain context, NFRs, risks — then write all of that back to the same work item
in Azure DevOps Boards. Below, "the item" means whichever of the three the user chose.

## What this skill does

0. **Resolve** the ADO organization and project (Step 1).
1. **Ask** whether the item is an Epic, an Enhancement story or a Change Request story, then for its reference (work item ID or URL).
2. **Fetch** the item's current content from ADO.
3. **Assess** what's already there and what's missing against the full intent template.
4. **Elaborate** through focused question batches (see `references/elaboration-questions.md`).
5. **Update** the item in ADO with all the refined detail AND the `intake-refined` label/tag, confirm-first before writing.

## The single test for "ready"

**Verifiability** — can you prove, at the end of building, that the intent was met? That requires
measurable success criteria with thresholds and verification methods. Everything else supports this.

Fill honestly: a 70%-complete intent with declared unknowns beats a 100%-complete one built on
guesses.

## The flow

### Step 1 — Ask for the item

Ask the user:
```
What do you want to refine?

A) Epic
B) Enhancement story
C) Change request story

[Answer]:
```

Then ask for its reference:
```
Which [Epic | Enhancement story | Change request story] should we refine?
Please provide the work item ID (e.g. 4800) or URL.
```

Resolve the ADO organization and project, first source that gives both — no question when one does:
`## Tracker` → `Organization` and `Project` in `runtime-artifacts/aire-state.md` if it exists, else
the work-item URL the user gave, else an Azure Repos `origin` remote (`git remote get-url origin` —
`dev.azure.com` / `visualstudio.com`), else ask once for this run:
```
Azure DevOps organization URL and project name? (e.g. https://dev.azure.com/myorg, "MyProject")
```

### Step 2 — Fetch and read the item

Fetch the item with `az boards work-item show` — per `common/tracker-sync.md` Section 2. Read the summary, description, and any
existing acceptance criteria or attachments. Note what's already captured and what gaps exist
relative to the full intent template (`assets/intent-template.md`).

Display a brief assessment to the user:
```
 Fetched [Epic | Enhancement story | Change request story] [TICKET-ID]: "[title]"

What's already captured:
- [list what's present]

What's missing or thin:
- [list gaps]

Ready to elaborate? I'll work through focused question batches to fill the gaps.
```

Wait for the user to confirm before proceeding.

### Step 3 — Elaborate through question batches

Read `references/elaboration-questions.md`. Work through the priority sections in order, skipping
questions that are already answered by the item's content. Ask in focused batches — one section at a
time — using multiple-choice where possible with an open "Other" option. Record genuine unknowns
as Open Questions; do not guess.

After each batch, pause and wait for the user's answers before continuing to the next section.

Stop elaborating once the intent is verifiable: measurable criteria, clear scope, known constraints,
modelled domain, identified risks. Do not ask questions beyond what's needed.

### Step 4 — Draft the refined intent

Synthesise everything gathered into a fully-filled intent document based on `assets/intent-template.md`.
Present it to the user for review:
```
 Refined intent ready for review.

[Full intent content here]

Does this look right? Type "yes" to update the [Epic | story], or provide corrections.
```

**Do not update the work item until the user explicitly approves.**

### Step 5 — Update the Item in Azure DevOps Boards

On approval, update the item in this exact sequence — **every step is mandatory, not optional,
regardless of how confident you are that the label is already applied**:

1. **Re-fetch the item's current labels/tags** immediately before writing, so the
   update is based on live state, not the Step 2 snapshot.
2. **Compute the new labels/tags**: take the current set as-is and append `intake-refined` if
   it is not already present, exact string, case-sensitive. **Append-only — never remove or replace
   any existing label/tag** (e.g. `intent-intake`, `enhancement` or `change-request` from the intake
   stage stays untouched). A pre-existing
   *similar-looking* label (`intake_refined`, `Intake-Refined`, `refined`, `intent-refined`, etc.) does
   NOT satisfy this requirement — it is not a substitute; still add the exact `intake-refined` label.
3. **Update the item** with BOTH the full refined intent content (description) AND the computed
   labels/tags in the same write, per `common/tracker-sync.md` Section 2/Section 9:
   `az boards work-item update` (description + `System.Tags`). Do not skip the labels/tags field even
   if it looks unchanged from Step 1 — omitting a field some integrations treat as "clear it," which
   would silently drop existing labels.
4. **Verify, don't assume**: re-fetch the item after the write and confirm `intake-refined` is present
   in its labels/tags. If it is missing, retry the label update once. If it still fails, stop and
   tell the user explicitly — do NOT report success and do NOT proceed to the next-step prompt below
   with the label unconfirmed.

```
 [Epic | Enhancement story | Change request story] [TICKET-ID] updated in ADO with the refined intent.
  Label confirmed: intake-refined

 **Next Step**
```
followed by the line for the item:
- **Epic** — `To start building this Epic, type: using aire annexus implement [the Epic's work item URL or ID]`
- **Enhancement story** — `To build it, type: ticket-implement [TICKET-ID]`
- **Change request story** — `To apply it, type: epic-change-request [TICKET-ID] (its Epic's cycle must be open)`

(replace [TICKET-ID] with the item's work item ID)

**This next-step prompt is mandatory** — always display it after a successful update, and only
after the label has been verified per Step 4 above.

## HARD GUARDRAILS — do not violate

- **No file or directory creation.** Do not create, write, or modify any file or folder in the workspace (reading `## Tracker` from `runtime-artifacts/aire-state.md`, if it exists, is fine — that's a read, not a write). The refined intent lives only in Azure DevOps Boards.
- **No other local artifacts.** Do not produce `intent-template.md` or any other local document as output. `assets/intent-template.md` is a reference shape only — never instantiate it.
- **Tracker in, tracker out.** The only I/O is: read the item from ADO, ask the user questions in chat, then update the same item in ADO. Nothing else — a story is never turned into an Epic, and no new item is created.
- **Confirm before every write.** Never update the tracker without explicit user approval ("yes").
- **EVERY item this skill updates MUST carry the exact label/tag `intake-refined` — no exceptions, not optional, not "if relevant."** Epic, Enhancement story and Change request story alike. This is not a judgment call to make per-item; it applies unconditionally to every successful run of Step 5. The label is applied in the same write as the description update (never a separate follow-up call you might skip), it is appended to whatever labels the item already carries (never replacing them), and its presence is verified by re-fetching the item after the write — before the "Next Step" prompt is shown. A run that updates the description but cannot confirm the label is NOT a successful run; stop and surface the failure to the user rather than reporting success. See Step 5 for the exact sequence.

## Quality bar

- **Success criteria must be testable** — push past "improve X" to a measured threshold + verification method.
- **Scope must include an explicit out-of-scope section** — an empty out-of-scope invites creep.
- **Constraints must be stated or honestly marked unknown** — unknown ≠ absent.
- **Domain context must be modelled** — bounded contexts, key entities, core invariants.
- **Risks must be named** — likelihood, impact, mitigation.
- **Never guess** — if something is unknown, capture it as an Open Question.

## Bundled resources

- `assets/intent-template.md` — the full intent structure; use this as the target shape.
- `references/elaboration-questions.md` — the elaboration question bank.
