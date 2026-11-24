# Tracker Sync — Azure DevOps Boards

**Purpose**: aire tracks every Epic, story and bug as an Azure DevOps (ADO) Boards work item, through
the `az boards` CLI (the `azure-devops` extension). This file is the ONLY place work-item mechanics are
defined — every workflow, stage, and skill that needs to create a work item, transition a status, assign
someone, link a story to its Epic, fetch an existing ticket, or record a comment follows the sections
below instead of re-deriving commands inline. When any other rule file says "apply the Tracker Sync
Rule" or "per `common/tracker-sync.md`", it means: read `## Tracker` in
`runtime-artifacts/aire-state.md`, then follow the relevant section here.

---

## 1. ADO Project Resolution (once, at the very start of the workflow)

Executed by `planning/workspace-detection.md`, before Parent Epic Capture — the organization and project
MUST be known before the Epic can be resolved. Skip entirely and reuse the recorded values if
`runtime-artifacts/aire-state.md` already contains a `## Tracker` section (resumed project).

Resolve the organization URL and project name, first source that gives both wins — **no question is
asked when one of them does**:
1. **The Epic link the user pasted** — `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>` or
   `https://<org>.visualstudio.com/<project>/_workitems/edit/<id>` (URL-decode the project name).
2. **`## Repo Host`** when `Type: AZURE_REPOS` (`common/repo-host.md` Section 1) — its `Organization`
   and `Project`.
3. **Neither gives them** → ask ONCE, in the chat (never a question file):
   ` Azure DevOps organization URL and project name? (e.g. https://dev.azure.com/myorg, "MyProject")`

Verify auth: `az account show`; if it fails, tell the user to run `az login` first and wait.

Record immediately in `runtime-artifacts/aire-state.md`:
```markdown
## Tracker
- Parent Epic: none
- Epic URL: —
- Organization: <org-url>
- Project: <project>
```
Log the resolution (and, when asked, the question and the complete raw answer) in
`runtime-artifacts/audit.md`.

**Status Map (right after — no question unless a state or column is missing)**: write the default
`### Status Map` under `## Tracker` and verify it against the board per `common/status-model.md`
Section 5. Ask only about a state or column the board does not have.

**Field Map (right after the Status Map — no question)**: check the project's story work item type
for its own Acceptance Criteria field, so a story's acceptance criteria are written there and never
into its description (Section 3).
1. Read the fields of the `User Story` type:
   `az devops invoke --org "<org-url>" --area wit --resource workItemTypesField --route-parameters project="<project>" type="User Story" --api-version 7.1 -o json`
   (fallback: `az rest --method GET --resource 499b84ac-1321-427f-aa17-267ca6975798 --url "<org-url>/<project>/_apis/wit/workitemtypes/User%20Story/fields?api-version=7.1"`).
2. The Acceptance Criteria field is the one whose `referenceName` is
   `Microsoft.VSTS.Common.AcceptanceCriteria`; otherwise a field whose `name` is `Acceptance Criteria`
   (compared ignoring case and spaces). The Description field is `System.Description`.
3. Record it under `## Tracker`:
   ```markdown
   ### Field Map
   - User Story: Description=System.Description · Acceptance Criteria=<referenceName> — verified <ISO timestamp>
   ```
4. **No Acceptance Criteria field on the type** → stop, and never fall back to the description:
   `Work item type "User Story" in <project> has no Acceptance Criteria field. Add it to the type
   (Organization settings → Boards → Process → <process> → User Story → add the Acceptance Criteria
   field to the form), then continue.` Wait, re-read the fields and continue. Log the result.

A recorded `## Tracker` with no `### Field Map` (written by an earlier version) → run this check before
the next story is created or its acceptance criteria are updated, record it and log it.

---

## 2. Parent Epic Capture

Generalizes CLAUDE.md's "MANDATORY: Parent Epic Capture." The user normally starts with an existing ADO
Epic work item reference.

| User provides | Fetch command | If nothing provided |
|---|---|---|
| Epic work item ID/URL | `az boards work-item show --id [ID] --org "{ORG}" --project "{PROJECT}"` | Don't block — User Stories Part 3 asks before pushing |

Save the fetched title/description/acceptance criteria to `spec/plans/epic-brief.md` — this is the
primary input to Requirements Analysis and User Stories.

Record in `## Tracker`:
```markdown
- Parent Epic: <work item ID, or "none">
- Epic URL: <url, or "—">
```

**Conflict rule**: if `## Tracker` already records a DIFFERENT Epic (resumed project), ask which to keep
— NEVER silently overwrite.

---

## 3. Story Creation at Push Time (User Stories Part 3)

Runs once per approved story, immediately after the Story Set Approval. Every other flow that creates
a story on the board (`epic-enhancement`, `epic-change-request`) uses this same command.

**Acceptance criteria go in the Acceptance Criteria field ONLY.** The board has its own Description and
Acceptance Criteria sections, so each is filled with its own content:

| Field | Holds | Never holds |
|---|---|---|
| Description (`System.Description`) | the story narrative (As a … I want … so that …) as HTML, then the `Design References:` section (only when links are recorded — below), then the footer `Built with AIRE v[N]` | the acceptance criteria, an "Acceptance Criteria" heading, or any AC item |
| Acceptance Criteria (the `### Field Map` field) | every acceptance criterion of the story, numbered as in `stories.md`, as an HTML checklist | the narrative or the footer |

The Acceptance Criteria field name comes from `### Field Map` under `## Tracker` (Section 1) — never
hardcoded. No `### Field Map` recorded → run the Field Map check in Section 1 first.

**Design References section** (the stories pushed by User Stories Part 3): read
`story_design_references` in `runtime-artifacts/aire-state.md`, recorded from the User Stories design
reference question (`planning/user-stories.md` Step 3).
- **Links recorded** → add this section to the description, after the narrative and before the footer,
  every link exactly as the user gave it, in the order given:
  ```html
  <p><b>Design References:</b></p>
  <ul><li><a href="<link 1>"><link 1></a></li><li><a href="<link 2>"><link 2></a></li></ul>
  ```
- **`none`, or not recorded** → no `Design References:` section, no heading, no empty list.
- Stories created by any other flow (`epic-enhancement`, `epic-change-request`) carry no
  `Design References:` section — the question belongs to the User Stories push only.

```bash
STORY_WI_ID=$(az boards work-item create \
  --type "User Story" \
  --title "Story N.M: <Story Title>" \
  --description "<story narrative as HTML — NO acceptance criteria>[<Design References: section — only when links are recorded>]<p>Built with AIRE v[N]</p>" \
  --project "{PROJECT}" \
  --fields "<Acceptance Criteria field from ### Field Map>=<AC as HTML checklist>" \
           "System.Tags=ai-generated;aire-anx-v[N]" \
  --query "id" -o tsv)

az boards work-item relation add --id "$STORY_WI_ID" \
  --relation-type "System.LinkTypes.Hierarchy-Reverse" --target-id "$EPIC_WI_ID"

# move to ToDo per Section 4 — state AND the column named ToDo (status-model Section 5)
az boards work-item update --id "$STORY_WI_ID" --state "<ToDo state>" --fields "<column field>=<ToDo column>" --project "{PROJECT}"
```
Verify creation (`az boards work-item show --id "$STORY_WI_ID" -o json`) and the parent link before
continuing: the Acceptance Criteria field holds every AC of the story, and `System.Description` holds
the narrative and footer with no AC in it, and the `Design References:` section holds exactly the
recorded links — or is absent when `story_design_references` is `none`. An AC found in the description,
or a missing, extra or unwanted `Design References:` section → rewrite the description correctly
(`az boards work-item update --id "$STORY_WI_ID" --description "<narrative>[<design references>]<footer>"`),
then verify again. `$EPIC_WI_ID` is the Parent Epic's numeric ID from `## Tracker`.

### 3.1 Updating a story's acceptance criteria

Any flow that changes a story's acceptance criteria on the board (an `epic-change-request` spec-only
amendment, `story-audit` filling an AC gap) writes them to the Acceptance Criteria field only, as the
complete new list — never into the description:
`az boards work-item update --id X --project "{PROJECT}" --fields "<Acceptance Criteria field>=<full AC list as HTML checklist>"`.
Verify by re-reading the item: the field holds the new list and the description holds no AC.

**Write-back**: update `stories.md` and the Story Tracker `Tracker ID` column with the returned work
item ID.

---

## 4. Status Transitions (the "Tracker Sync Rule")

**Which** moves exist, who makes them and which are automatic, confirm-first or manual on the board is
defined ONLY in `common/status-model.md`. This section is how a move is applied. The target name
is always the `### Status Map` value for the canonical status — never a hardcoded string.

**Apply a move to `<mapped name>`** — mapped `<State>/<Column>` (a board column —
`common/status-model.md` Section 5): `az boards work-item update --id X --project "{PROJECT}" --state
"<State>" --fields "<column field>=<Column>"`, where `<column field>` is the `WEF_…_Kanban.Column` on
the `- ADO Board:` line for the item's type (add `"<column field>.Done=false"` when the board splits that
column). The column is always set, and it is the column with the same name as the status
(`common/status-model.md` Section 5) — a bug claimed for `Active` is moved to `--state "Active" --fields
"<column field>=Active"`, never the state alone and never a differently named column. A map entry whose
`<Column>` is not the status name → re-run the board check before the move. Mapped `<State>` only (an
item on no board): `az boards work-item update --id X --state "<State>" --project "{PROJECT}"`.

**Verify**: read the status live, as in "Reading a status live" below: it must map back to the target
canonical status — the column equals `<Column>` and `System.State` equals `<State>`. A card in another
column of the same state (`In-Revision` when the target was `Active`) is a failed move: set the column
again once; still wrong → report it and stop for that item, never claim it.

**Reading a status live** (`common/status-model.md` Section 6): **the board column first, then the
state** — `az boards work-item show --id X --project "{PROJECT}" -o json` → the `<column field>`
recorded for the item's type (fallback `System.BoardColumn`) and `System.State`; the status is the map
entry whose column equals that column, else the state-only entry equal to `System.State` (an item not
on the board has no column — use the state). Never read `System.State` alone: a card in `In Testing`
is still `Active`. A Status Map with no `- ADO Board:` line (recorded before columns were read) → run
the board check in `common/status-model.md` Section 5 first, update the map, log it, then read. Map the
name back to the canonical status through the Status Map. An unmapped name is reported, never guessed —
it re-runs the board check (`common/status-model.md` Section 5), since columns can be added after
Project Resolution.

**Sync rule**:
- Every status change moves the work item via the commands above AND the local Story Tracker.
  VERIFY the transition landed (re-read the item) before considering the change complete. A rejected
  move → list the states the item can move to, report, and stop — never pick a different state on your
  own.
- **Automatic, confirm-first, manual**: exactly as `common/status-model.md` Section 7 lists them. The
  Parent Epic uses the same commands, targeting the Epic's ID.
- **NEVER silently update only one side** — the local Story Tracker and the board must always agree. A
  move made on the board is brought into the local Story Tracker by the live read, never the other way
  round.

### 4.1 Merge State Authority

**Whether a story's code is merged is decided by its PR merge state, never by its tracker status.**
The two facts lag each other: a story's PR merges into the development branch while the story is
`In Progress`, and its status only becomes `Ready for Testing` later, when the developer moves it on
the board after the DEV deploy. A story `In Progress` with a merged PR is merged.

Whenever a rule needs to know whether a story is merged (the Doability Gate, change-request routing,
the Epic status sync, `ve-list-work`, the resolved Story Tracker view):
1. Read the story's `PR` and `Merged` columns from the resolved Story Tracker
   (`common/parallel-work-state.md` Section 4).
2. **Verify live** — read the PR with `common/repo-host.md` RH-2 (GitHub or Azure Repos, per
   `## Repo Host`; no remote: `git branch --merged <base-branch>`). Never trust a stale `Merged`
   column.
3. The story counts as merged only when its PR is `MERGED` into the development branch (the recorded
   Base Branch — `common/branching-strategy.md`). No PR, or an
   open one, means not merged — record the state actually observed.

---

## 5. Assignment (on story pick / ticket claim)

1. **Session email** (ADO accepts email/UPN): `az boards work-item update --id X --org "{ORG}"
   --assigned-to "<session-email>"` → verify with `az boards work-item show` that
   `System.AssignedTo` → `uniqueName` matches.
2. **Fallback — the update fails or the read-back does not match** (the session email is not the
   operator's ADO identity): assign the identity the ADO CLI is signed in as, read from
   `az devops invoke --org "{ORG}" --area Location --resource connectionData --api-version 7.1-preview -o json`
   → `authenticatedUser.properties.Account.$value` (unknown resource → `az rest --method GET --resource
   499b84ac-1321-427f-aa17-267ca6975798 --url "{ORG}/_apis/connectionData"`). Same update, same verify.
   Announce: `Session email <a> is not an ADO identity — assigned to the ADO sign-in <b>.`
3. **Both fail** → leave unassigned, warn the user, continue (non-blocking).

Log each attempt and its read-back. The audit `**User Email**:` stays the session email.

---

## 6. Linking a Story to its Parent Epic

`az boards work-item relation add --id [STORY-ID] --relation-type "System.LinkTypes.Hierarchy-Reverse"
--target-id [EPIC-ID]` — verify via `az boards work-item show --query relations`.

---

## 7. Causation Link ("is caused by" — used by `agents/defect-provenance-analyst.md`)

Establishes `[Bug] --"is caused by"--> [Originating item]`.

ADO has no native "is caused by" relation. Best effort: `az boards work-item relation add --id [BUG-ID]
--relation-type "System.LinkTypes.Related" --target-id [ORIGIN-ID]` (the closest native type — it does
NOT encode direction/semantics), PLUS a mandatory comment on the bug work item stating the causation
explicitly (`az boards work-item update --id [BUG-ID] --discussion "Caused by work item #[ORIGIN-ID] —
<one-line reason>"`). The comment is the authoritative record; the "Related" link is best-effort
metadata only.

This step runs automatically (no confirm-first gate) — the analyst only reports a link on positive,
verified evidence, per `defect-provenance-analyst.md`.

---

## 8. Fetching the "Ticket" for `ticket-implement` / `bug-fix` / `enhancement-implement`

These workflows take an existing work item as their invocation argument (`<TICKET-ID>` — a work item
ID such as `4821`, or a work-item URL):
`az boards work-item show --id 4821 --project "{PROJECT}"` → work item type, title, description,
acceptance criteria, tags, state.

Regex extraction of an ID from commit subjects / PR titles / branch names (used by
`defect-provenance-analyst.md` and audit logging) matches a bare integer work item ID.

---

## 9. Labels & Version Stamping

| Marker | Where |
|---|---|
| `ai-generated` | tag in `System.Tags` |
| Framework version | tag `aire-anx-v[N]` in `System.Tags` (full minor version, e.g. `aire-anx-v1.0`) |

`[N]` is always read live from the "AIRE Framework Version" line in `CLAUDE.md` — never hardcoded.

---

## 10. Comments

`az boards work-item update --id X --discussion "<text>"`

---

## 11. Branch Naming (feeds `common/branching-strategy.md`)

`epic/<EPIC-ID>-<kebab-title>`, `story/<N.M>-<kebab-title>` (the Story ID `N.M` is the prefix — a bare
work item number reads poorly as one; mention the Tracker ID in the branch's PR body),
`bug/<TICKET-ID>-<kebab-title>`, `enhancement/<TICKET-ID>-<kebab-title>`, and — opt-in Novus
automation only — `automation/<TICKET-ID>-<kebab-title>`, at most 60 characters
(`common/branching-strategy.md` Section 8).

---

## 12. Critical Rules

- ADO Project Resolution (Section 1) runs EXACTLY ONCE per project, at workspace detection, before
  Parent Epic Capture. Never re-run it once `## Tracker` exists.
- A story's acceptance criteria live ONLY in the board's Acceptance Criteria field (`### Field Map`,
  Section 1) — never in the description, never in both (Sections 3 and 3.1).
- Every transition/assignment/link is VERIFIED after the call (re-read the work item) — never assume
  success from a non-error exit code alone.
- NEVER silently update only the local Story Tracker, and never silently update only the board
  without the local Story Tracker — both sides always move together.
- `[N]` (framework version) is always read live from `CLAUDE.md`.
