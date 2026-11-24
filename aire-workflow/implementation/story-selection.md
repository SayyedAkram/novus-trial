# Story Selection - Detailed Steps

**Purpose**: Before generating code, determine WHICH story is being implemented — the user types the story's Tracker ID (its ADO work item ID, e.g. `4821`) — run the Doability Gate, and move it from `ToDo` to `In Progress` automatically (picking the story is the claim, `common/status-model.md` S2 — no confirmation is asked for this transition, on the board or the local Story Tracker).

**Story statuses**: the canonical set and who moves each transition are defined only in `common/status-model.md`. This stage makes exactly one move — `ToDo` → `In Progress` — and the story then stays `In Progress` through code generation, review, the PR raise and the PR review; it moves on only by hand on the board (S4).

**Runs**: At the start of Code Generation (Step 0), once per story, when the user invokes `dev-implement`, after the docs worktree is open (`common/branching-strategy.md` Section 4 item 1) — every `spec/` and `runtime-artifacts/` path below resolves into `.aire-docs/`. Mandatory.

## Prerequisites
- User Stories stage complete (`spec/plans/stories.md` exists)
- Dependency Graph stage complete (`spec/plans/dependency-graph.yml` exists with `requires`/`enables`)
- `runtime-artifacts/aire-state.md` contains a `## Story Tracker` table and a `## Tracker` section (Organization and Project, with its `### Status Map`)

---

## Step 0: No Bulk Reconciliation Here (by design)

Story Selection does NOT scan every `In Progress` story and reconcile it against its PR or the board.
Instead, dependency readiness is checked live, per prerequisite, only for the story being selected — see the Doability Gate (Step 4) below. Nothing in this step mutates the Story Tracker or the board.

## Step 1: Verify Tracker Availability

Read `## Tracker` in `runtime-artifacts/aire-state.md` and verify:
- [ ] Confirm `az boards` is authenticated (`az account show`). If not, STOP and tell the user to run `az login` first.
- [ ] **Repo Host** (independent of the tracker — the Doability Gate reads PR state): run the access check for the recorded `## Repo Host` per `common/repo-host.md` Section 2 (GitHub or Azure Repos). If it fails, STOP with that section's instruction.

## Step 2: Present Story Selection Prompt

Present the following:

```text
Which story would you like to develop?

Type the story's ADO work item ID (e.g. 4821):
```

**DO NOT guess which story to implement. Wait for the user to type the ID.**

## Step 3: Resolve the Selected Story —  NO CONFIRMATION
- [ ] Take the ID the user typed — do NOT assume it.
- [ ] Resolve it per `common/tracker-sync.md` Section 8 (adapted here to a STORY rather than a bug/enhancement ticket): fetch via `az boards work-item show --id [ID] --project "{PROJECT}"` and show its title, status, priority, and acceptance criteria as an announcement.
- [ ] **Do NOT ask "Implement this story? (yes / no)".** The user typing the ID IS the selection — re-confirming it is the same decision twice. Display the resolved story and continue straight to the Doability Gate.
  - Only exception: the ID does not exist, or resolves to an issue that is not a story of this epic — then report the mismatch and re-ask for the ID (that is error handling, not confirmation).
  - A story whose live status is already past `ToDo` (another developer claimed it, or it is in testing) → report its status and assignee and re-ask; never re-claim it.
- [ ] Map the resolved work item to a local story in `stories.md` via the `Tracker ID` column. If no matching local story exists, create one from the work item body so code generation has a reference. Note its `Requires`.

## Step 4:  Doability Gate (MANDATORY — live PR-merge check; `dev-implement` NEVER merges anything)
- [ ] Look up the chosen story in `dependency-graph.yml` → read its `requires`. No `requires` (or empty) → doable, skip to Step 5.
- [ ] For EACH story in `requires`, resolve doability directly:
  - If its status, read live (`common/status-model.md` Section 6), is `Ready for Testing`, `In Testing`, `Bug fixing` or `Closed` → it was merged and deployed to reach that status, so count it doable here; the branch-cut dependency-merge check (`common/branching-strategy.md` Section 3) still verifies the merge and stays authoritative.
  - Otherwise, read its recorded `PR` column. If a PR is present, read its real state LIVE with `common/repo-host.md` RH-2 (state, merged date, target branch, draft, review decision, mergeable, author):
    - State MERGED into the Base Branch (merged date set) → doable.
    - Anything else (OPEN — whether approved or not, CLOSED without merging, or no PR recorded yet) → NOT doable. `dev-implement` NEVER merges a prerequisite's PR itself, not even one that is already approved — merging a PR is always a manual action the user performs (in the GitHub / Azure Repos PR UI), never something this workflow does on the user's behalf, with or without asking.
- [ ] **Doable IFF every prerequisite resolves doable above** — i.e. each has its PR MERGED into the Base Branch (its code is present there). If ANY prerequisite is NOT doable,  STOP THE RUN (do not loop back to Step 2, do not let the user bypass this gate, and do not offer to merge it):
  ```
   Cannot start Story [N.M] yet.
     It requires Story [X.Y] ([TRACKER-ID]), whose PR is not merged into <base> yet:
       • Story [X.Y] — [TRACKER-ID] — <PR URL, or "no PR raised yet"> — status: <OPEN, approved by [reviewer(s)] — needs merging / OPEN, not yet approved / CLOSED (not merged) / none>

       [list every unmet prerequisite]

  Get Story [X.Y]'s PR approved and merged into <base>, then run `dev-implement`
     again to develop Story [N.M].
  ```
  Log the block (which prerequisite(s) and their live-checked PR state) in runtime-artifacts/audit.md, then END this `dev-implement` run. No story/tracker status has changed at this point — Step 5 (the move to `In Progress`) has not run yet. The user re-invokes `dev-implement` once the blocking PR(s) are merged.
- [ ] If every prerequisite resolves doable, proceed to Step 5. This live check agrees with the branch-cut dependency-merge check in `common/branching-strategy.md` Section 3, which remains the authoritative safety net at branch-creation time (e.g. if a merge were reverted between this gate and the branch cut).

## Step 5: Move Story to In Progress (AUTOMATIC — no confirmation)

**Picking a story IS the claim** (`common/status-model.md` S2). Once the user selects the story and the Doability Gate passes, move it to `In Progress` automatically — do NOT ask the user to confirm the tracker transition or the local tracker update.

- [ ] Apply the move to the mapped `In Progress` status per `common/tracker-sync.md` Section 4 (the name comes from `### Status Map` — never a hardcoded state or label), and add a comment per Section 10: `"Development started via aire (story moved to In Progress)."`
- [ ] **VERIFY** per Section 4's Verify step. If rejected, list the states the item can move to and report — never pick a different state on your own; a missing mapping is resolved per `common/status-model.md` Section 5. Still failing → STOP and report.
- [ ] ** ASSIGN THE STORY TO THE OPERATOR (AUTOMATIC — same claim)**: the developer who typed `dev-implement` claims the story, so set them as the assignee — no confirmation asked. Per `common/tracker-sync.md` Section 5:
  1. Read the operator's email LIVE from the session context (the same email stamped as `**User Email**:` in runtime-artifacts/audit.md — never ask, never cache).
  2. Assign and **VERIFY** per Section 5 — the session email first; if ADO rejects it or the read-back does not match, the identity the ADO CLI is signed in as. Never guess beyond those two. Both fail → leave the assignee unchanged, warn the user (` Could not resolve <identity> to a tracker account — story left unassigned; assign manually.`), and log it in runtime-artifacts/audit.md. Assignment failure is NON-blocking: development proceeds either way.
- [ ] Announce the change to the user (informational, not a question): "Story [N.M] claimed — ADO [TRACKER-ID] moved to In Progress, assigned to [the identity that verified]."
- [ ] **EPIC → In Progress (AUTOMATIC — first story only)** (`common/status-model.md` Section 4): If this is the FIRST story to be claimed (no other story in the resolved Story Tracker — shared table plus fragments, `common/parallel-work-state.md` Section 4 — is past `ToDo`, and the Parent Epic, read live, is not already `In Progress` or beyond), also move the Parent Epic (from `## Tracker` in `runtime-artifacts/aire-state.md`) to the mapped `In Progress` using the same mechanism as above, targeting the Epic's ID instead of the story's.
  Verify the transition landed, announce it ("Epic [EPIC-ID] moved to In Progress — development has started."), and log it in runtime-artifacts/audit.md. Skip silently if `## Tracker` records `Parent Epic: none`, or the Epic is already In Progress (or beyond).
- [ ] These are the ONLY automatic transitions here (story → In Progress on pick, plus the Epic → In Progress on the first pick). Every later story move belongs to someone else per `common/status-model.md` Section 7.

## Step 6: Update Story Tracker (AUTOMATIC — no confirmation)

**Parallel-safe state** (`common/parallel-work-state.md`): the claim is written to the story's own
fragment in the docs worktree, never to the shared file — create
`.aire-docs/runtime-artifacts/stories/story-<N.M>/state.md` (and `audit.md`) now, copy the story's row
from the resolved Story Tracker into its `## Story Tracker Row`, and apply the changes below to that
row. Held entries from Steps 2–5 are written to the fragment's `audit.md` with their original
timestamps. Every "Story Tracker" / "audit.md" write in this step means the fragment.

- [ ] In the fragment's `## Story Tracker Row`, for the selected story set (without asking):
  - **Status** → `In Progress` (moved from `ToDo`)
  - **Start** → today's date (`YYYY-MM-DD`) if not already set
  - **Recorded** → current timestamp (`YYYY-MM-DD HH:MM`)
- [ ] **Write the `## Claim` block** in the same fragment `state.md` (`common/parallel-work-state.md` Section 3.2), from the RESULTS of Step 5's verified calls — never before they ran:
  ```markdown
  ## Claim
  - Tracker: ADO <TRACKER-ID> · In Progress — verified <ISO timestamp>
  - Assignee: <email> — verified <ISO timestamp>   (or: `unresolved — <identity>, user warned <ISO timestamp>`)
  - Parent Epic: <moved to In Progress — verified <ISO timestamp> | already In Progress | not the first story | skipped — none>
  ```
  A story whose `Tracker:` line does not say `verified` has NOT been claimed: go back to Step 5 and make the calls (the `az` tools are available — "not executed this session" is not an outcome). The story branch (dev-implement Step 1.5) is cut only after this block is complete.
- [ ] Append to the fragment `.aire-docs/runtime-artifacts/stories/story-<N.M>/audit.md` (never the shared `runtime-artifacts/audit.md`): the selected story, the automatic status change `ToDo → In Progress` (tracker + local, with verification result), and the assignee set (email, or the resolution failure) with timestamps. The entry MUST include the `**TRACKER ITEM**:` field — the story's Tracker ID as a clickable link to its work item URL (`[4821](https://dev.azure.com/<org>/<project>/_workitems/edit/4821)`) (see the Audit Entry Format in `workflows/dev-implement.md`).
- [ ] **Commit and push the claim** to the epic branch through the docs worktree (`common/branching-strategy.md` Section 4 item 3, after the State Isolation Check, `common/parallel-work-state.md` Section 5.5), so other developers see it on their next pull.
- [ ] The story now stays `In Progress` through Code Generation, the automated Code Review, any Remediate loop, the PR raise, and the auto PR Review. After two approvals and a human merge into the Base Branch, the team's CI/CD deploys it to DEV and the developer moves it to `Ready for Testing` on the board (`common/status-model.md` S4) — AIRE never makes that move. (dev-implement/story-selection only ever live-check a prerequisite's PR at the Doability Gate — they never move this story past `In Progress`.)

## Step 7: Hand Off to Code Generation
- [ ] Return the resolved story (ID, title, acceptance criteria, Tracker ID/link if any) to Code Generation Part 1.
- [ ] Code Generation proceeds to plan and generate code for this story (implementation, then the Unit Test & Coverage gate, `implementation/code-generation.md` Step 11a) into the application code structure, on the story branch cut from the Base Branch (see code-generation.md Critical Rules and `common/branching-strategy.md` Section 3).

---

## Critical Rules
- Story selection is tracker-driven — the user types the story's Tracker ID (its ADO work item ID). If `az boards` is unavailable, STOP.
- NEVER guess which story to implement — always ask the user to type the ID and wait.
- NEVER bypass the Doability Gate — all of a story's `requires` must be confirmed MERGED into the Base Branch via `common/repo-host.md` RH-2 at gate time (or already, read live, at `Ready for Testing` or beyond). Any prerequisite that remains unmerged →  STOP the run with a clear message naming it (never loop back silently, never let the user bypass it).
- **`dev-implement` NEVER MERGES A PR, EVER — not automatically, not with confirmation, not even when it is already approved.** Approving and merging a prerequisite's PR are always manual human actions performed outside this workflow (the GitHub / Azure Repos PR UI). The Doability Gate only ever reads PR state — it has no merge step of any kind. When the blocking prerequisite is already approved, the stop message says so, so the user knows merging it is all that's left.
- This gate never writes to the prerequisite's Story Tracker row at all — it only reads live PR state and status. `Merged`/`Recorded` reflect the merge once it happens; a prerequisite's `Status` changes only by the moves `common/status-model.md` assigns to people and to `ve-list-work`.
- The valid statuses and their owners are defined only in `common/status-model.md`. This stage moves the story to `In Progress` only.
- ALWAYS take the ID the user types at development time — do not assume it. Once typed, do NOT ask them to confirm it (never "Implement this story? yes/no"): show the fetched work item and proceed to the Doability Gate. Re-ask only when the ID is invalid or resolves to the wrong work item.
- The `ToDo → In Progress` transition is AUTOMATIC on story pick — apply it to the board AND the Story Tracker without asking, ALWAYS verify the transition landed, and announce it. All OTHER tracker transitions follow `common/status-model.md` Section 7.
- On every story pick, ALWAYS set the assignee to the operator who invoked `dev-implement`, per `common/tracker-sync.md` Section 5 (automatic, verified, logged). If the identity can't be resolved, leave unassigned, warn, and continue — assignment failure never blocks development.
- When the FIRST story of the epic is claimed, ALWAYS also move the Parent Epic (from `## Tracker`) to `In Progress` automatically — verify, announce, and log it.
- ALWAYS record the selected story (and its Start/Recorded timestamps) in the story's fragment, and push the claim through `.aire-docs/`, before code generation begins.
- When the ADO organization or project is needed (e.g., a "pick from the board" search), FIRST reuse the values recorded in `runtime-artifacts/aire-state.md` `## Tracker` → `Organization` / `Project`; ask the user only if none is recorded — never hard-code them.
