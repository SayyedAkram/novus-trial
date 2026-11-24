---
name: raise-defect
description: >
  Helps a Verification Engineer raise a defect/bug in Azure DevOps Boards with a fixed question set:
  Project, Title, Description, Steps to reproduce, Expected result, Actual result, Severity (Low /
  Medium / High / Critical), Iteration #, Attachments (screenshots, videos, files) and the Linked story
  when known. Creates an ADO Bug work item, uploads the attachments as ADO attachments, sets the
  iteration path and links the story, tagged with "bug", "ai-generated" and "aire-anx-v[N]" tags (the
  framework version read live from CLAUDE.md). The bug is created in the New status; when the linked
  story is In Testing (or Ready for Testing) it moves that story to Bug fixing automatically once the
  defect is approved. Confirm-first: nothing is written to the board until the Verification Engineer
  reviews and approves the drafted ticket.
when_to_use: >
  Trigger when the user (Verification Engineer) says: "raise a defect", "raise a bug", "log a defect",
  "file a bug", "report a defect", "create a bug ticket", "found a bug", "new defect",
  "ve bug", "log this issue in ADO".
allowed-tools: Read Grep Glob Bash Write
---

# Raise Defect — Verification Engineer Bug Reporting to Azure DevOps Boards

You help the tester raise a defect by collecting ONLY the fields below, drafting the ticket, getting
explicit approval, and then creating it as an ADO Bug work item in the project recorded in
`## Tracker` in `runtime-artifacts/aire-state.md`. **Do NOT ask for anything beyond these
fields.**

---

## Phase 0: Preconditions

1. Read `## Tracker` and its `### Status Map` from `runtime-artifacts/aire-state.md`. Start
   on any branch, usually the Base Branch, and never switch it: find the cycle on origin per
   `aire-workflow/common/branching-strategy.md` Section 4 item 5 (a Linked story given → the cycle
   whose state holds it; several open cycles → ask which) and read its state with
   `git show origin/<cycle-branch>:runtime-artifacts/aire-state.md`. Every
   `runtime-artifacts/…` read below comes from there.
   If no open cycle has `## Tracker`, the organization and project come from item 3 and field 1, and
   the Status Map from the board check (`aire-workflow/common/status-model.md` Section 5).
2. Confirm `az account show` succeeds. If it fails, stop and tell the tester to run `az login` first —
   do not attempt workarounds.
3. Work out the proposed ADO organization + project for field 1: the one the tester already named,
   else `## Tracker` → `Organization` and `Project` in `runtime-artifacts/aire-state.md`, else the
   organization and project in a work-item URL the tester pasted, else `## Repo Host` when it is
   `AZURE_REPOS` (an Azure Repos `origin`), else the ones already used in `runtime-artifacts/audit.md`.
   With none of these, field 1 is asked once, with no proposal.

---

## Phase 1: Collect the Defect Fields (ONLY these — ask nothing else)

Present them as one short numbered list so the tester can answer inline. Fill in anything they already
told you and ask only for what's missing. Do not invent details. Fields 9 and 10 are optional — the
tester may answer `none`.

1. **Project** — where the defect goes: the ADO organization + project. Show the Phase 0 proposal
   (`Project: https://dev.azure.com/myorg / MyProject — press enter to keep, or type another`) so the
   tester confirms or changes it. Verify it exists before drafting:
   `az devops project show --project "<project>" --org "<org>"`.
2. **Title** — a concise, descriptive summary of the defect.
3. **Description** — what the defect is, in the tester's words (free text; use it as-is).
4. **Steps to reproduce** — numbered steps, as the tester gives them.
5. **Expected result** — what should have happened.
6. **Actual result** — what happened instead.
7. **Severity** — one of:
   ```
   A) Low

   B) Medium

   C) High

   D) Critical
   ```
8. **Iteration #** — the sprint/iteration the defect belongs to (a number or a name, e.g. `12` or
   `Sprint 12`).
9. **Attachments** (optional) — screenshots, videos or other files as evidence: local file paths and/or
   links (e.g. a video on a shared drive). Check every local path exists before drafting; ask again for
   any that does not.
10. **Linked story** (optional, if known) — the story the defect was found in: its Tracker ID
    (an ADO work item ID such as `4821`) or its local Story ID (`1.2`, resolved to the
    Tracker ID through the Story Tracker in `runtime-artifacts/aire-state.md`). Verify it exists in the
    same project before drafting, and read its status live (`aire-workflow/common/tracker-sync.md`
    Section 4, "Reading a status live").

---

## Phase 2: Draft the Defect

The bug gets this description body, built from the Phase 1 answers:
```markdown
### Description
[Description, as-is]

### Steps to Reproduce
1. [step]
2. [step]

### Expected Result
[Expected result]

### Actual Result
[Actual result]

### Severity
[Low/Medium/High/Critical]

### Iteration
[Iteration #]

### Evidence
- [file name] — attached        (one line per local file)
- [link]                        (one line per link)
(or: none)

### Linked Story
[Tracker ID — title]  (or: none)

---
Raised via the AIRE raise-defect skill by Verification Engineer. Drafted with AI ([MODEL NAME]).
AIRE Framework: v[N]
```
- `[MODEL NAME]` — the actual session model — never left as a placeholder.
- `[N]` — the framework version, read live at runtime from the "AIRE Framework Version" line in the
  project's `CLAUDE.md`. Never hardcode and never leave as a placeholder.

Then plan the creation as an ADO Bug work item:
- `az boards work-item create --org "<org>" --project "<project>" --type "Bug" --title "<Title>"
  --description "<body as HTML>" --iteration "<iteration path>" --fields
  "Microsoft.VSTS.TCM.ReproSteps=<body as HTML>" "Microsoft.VSTS.Common.Severity=<1 - Critical|2 - High|3 - Medium|4 - Low>"
  "System.Tags=ai-generated; aire-anx-v[N]; bug; severity:<low|medium|high|critical>"`.
- **Iteration path**: resolve the answer against `az boards iteration project list --org "<org>"
  --project "<project>" --depth 5 -o json` (match the node name or its trailing number). More than one
  match, or none → show the candidates and let the tester pick.
- **Status**: `New` — state and the `New` column (`New=New/New`,
  `aire-workflow/common/status-model.md` Section 5: the column has the same name as the status). Azure
  DevOps sets only the initial state on create and drops the card in that state's first column, which
  can be another name (`To Do`), so right after creating, always set the `New` column with the
  move in `aire-workflow/common/tracker-sync.md` Section 4 (state and column together), then read the
  bug back the full way — the board column first, then the state ("Reading a status live"), never
  `System.State` alone — and confirm the column is `New`. Before creating: a Status Map with no
  `- ADO Board:` line for `Bug`, or a Bug `New` entry whose column is not named `New` → run the board
  check first (status-model Section 5). The draft shows the column and board the bug will land in
  (`Status: New — column "New" on board "<board>"`).

**Linked story → Bug fixing** (only when a Linked story was given): when its live status is
`In Testing` or `Ready for Testing`, the story moves to `Bug fixing` automatically once the defect is
created (`aire-workflow/common/status-model.md` S7, Phase 4 step 2a) — show it in the draft, never ask
it as a separate question. Already `Bug fixing` → nothing to do. Any other status (`ToDo`,
`In Progress`, `Closed`) → leave it and say so in the draft; the bug is still raised and linked.

**Show the full drafted ticket to the tester**: project, type, title, the description body, tags,
severity and iteration as they will be set, the status (`New`), the attachments and how each will be
added (uploaded, or listed for the tester to attach by hand — see Phase 4 step 3), the story link and
any planned move of the linked story. Do not create anything yet.

---

## Phase 3: Confirm Before Creating (REQUIRED — do not skip)

Ask explicitly: "Create this defect in ADO project <PROJECT> with the details above — yes/no?"
Do not proceed without an explicit yes. If the tester wants edits, revise and re-confirm.

The yes also covers the linked story's move to `Bug fixing` shown in the draft — it is never asked
separately.

---

## Phase 4: Create the Defect (only after confirmation)

1. **Create the bug** per the Phase 2 plan (`az boards work-item create`). Verify it was created
   and capture the real work item ID.
2. **Link the story** (when given): `az boards work-item relation add --org "<org>" --id <bug-id>
   --relation-type "Related" --target-id <story-id>`.
   Read the bug back and confirm the link is present.
2a. Move the linked story to Bug fixing (AUTOMATIC — no question), when Phase 2 planned it: apply
   the move per `aire-workflow/common/tracker-sync.md` Section 4, verify it landed, and update the story's Story Tracker row with a new `Recorded` (both sides,
   never one). Add a comment on the story naming the bug (`Moved to Bug fixing — defect <bug link>
   raised.`) and announce it: ` Story 4821 — In Testing → Bug fixing (verified).` A rejected move →
   report it honestly; the defect stays raised and linked.
3. **Attach the files** (each local file; links are already in the Evidence section): when
   `AZURE_DEVOPS_EXT_PAT` is set (Work Items Read & write), upload with
   `curl -s -u ":$AZURE_DEVOPS_EXT_PAT" -H "Content-Type: application/octet-stream" --data-binary
   "@<path>" "<org>/<project>/_apis/wit/attachments?fileName=<name>&api-version=7.1"`, then attach the
   returned `url` to the bug: `curl -s -u ":$AZURE_DEVOPS_EXT_PAT" -X PATCH -H "Content-Type:
   application/json-patch+json" --data '[{"op":"add","path":"/relations/-","value":{"rel":"AttachedFile","url":"<url>"}}]'
   "<org>/<project>/_apis/wit/workitems/<bug-id>?api-version=7.1"`.
   Never print a token. Verify each upload by reading the work item's attachments back. **A file that
   could not be uploaded** (no token set, or an upload error) does not block the defect: list it
   in the Phase 4 report as `attach by hand: <file>` with the work item link, so the tester can drag it
   onto the work item.
4. **Build the work item URL**: the work-item URL directly.
5. **No audit entry.** This skill writes nothing to `runtime-artifacts/audit.md` or to any story's
   audit fragment — the bug work item, its comments and the report back (step 7) are the record.
6. **Docs-branch commit** — only when this run changed `aire-state.md` (the linked
   story's Story Tracker row): make the change in `.aire-docs/` on the cycle's docs branch
   (`aire-workflow/common/branching-strategy.md` Section 4 item 1), commit and push it —
   `git pull --rebase` immediately before editing, push immediately after
   (`aire-workflow/common/parallel-work-state.md` Section 6), with the `AIRE-Version: [N]` trailer.
6a. Remove `.aire-docs/` once the bug is raised — the last repository action of every run that
   has the worktree in the clone, whether this run opened it or found it open, and also when the run
   stops early. Follow `aire-workflow/common/branching-strategy.md` Section 4 item 6 exactly: commit and
   push this run's change first (step 6), then remove the worktree, prune, and confirm `.aire-docs/` is
   gone (`git worktree list`, `test ! -e .aire-docs`). Uncommitted files that are not this run's are
   named in the report (this skill writes no audit) before item 6's forced removal.
   **Exception**: when `ve-list-work` invoked this skill (its Step 6), leave `.aire-docs/` for
   `ve-list-work`, which commits its own rows and removes the worktree at the end of its run.
7. **Report back** the created defect ID as a clickable link, its status
   (`New`), the iteration and story link as set, the linked story's status, and any `attach by hand`
   files.

---

## Execution Rules

1. **Never create a bug work item without the Phase 3 confirmation** — non-negotiable gate.
2. **Only ask the Phase 1 fields** — Project, Title, Description, Steps to reproduce, Expected result,
   Actual result, Severity, Iteration #, Attachments, Linked story — never interview for anything else.
   Attachments and Linked story are optional.
3. **The project is always shown and confirmed** (field 1) — proposed from `## Tracker` when recorded,
   never silently assumed.
4. **Always tag `bug`, `ai-generated` and `aire-anx-v[N]`** in `System.Tags`
   and set the work item type to `Bug`. `[N]` is the framework version read live at
   runtime from the "AIRE Framework Version" line in the project's `CLAUDE.md` — never hardcode, never a
   placeholder. A pre-existing similar tag (`AI Generated`, `ai_generated`, `bot`, etc.) is NOT a
   substitute for the exact `ai-generated` tag.
5. **Always verify** creation, the `New` status, the story link, any move of the linked story and every
   upload; capture the real work item ID; never report a guessed ID or an upload that did
   not land.
6. **A failed attachment never blocks the defect** — report it as `attach by hand`.
7. **Never write an audit entry** — not to `runtime-artifacts/audit.md`, not to a story fragment.
   Always remove `.aire-docs/` after the bug is raised (Phase 4 step 6a).
8. **Resolve `[MODEL NAME]`** to the actual session model and `[N]` to the framework version read
   live from `CLAUDE.md` — never leave either placeholder unresolved.
9. **The only status moves this skill makes** are the new bug's `New` and the automatic move of the
   linked story to `Bug fixing` once the defect is approved (`aire-workflow/common/status-model.md` B1,
   S7).
