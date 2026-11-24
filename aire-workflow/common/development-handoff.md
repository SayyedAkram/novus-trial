# Development Handoff Message

**Purpose**: the verbatim message presented at the  MANDATORY STOP checkpoint in `CLAUDE.md`
(after the system-level design stages complete or are skipped, before any Code Generation). This is
the moment the workflow hands off to development and Verification Engineer.

**Load and emit this** at Step 4 of the STOP CHECKPOINT (after the design commit). Emit the block below verbatim, with
every placeholder substituted from real values — never ship an unsubstituted placeholder. **Emit
nothing else**: no notes, caveats, tips or summary before or after it, and no extra lines inside it.
Anything else worth keeping goes to `runtime-artifacts/audit.md`. Then HALT and wait for the user
to type `dev-implement`.

```markdown
# Design Done — Ready to Build

 **[N] user stories created** during Planning.
[IF stories were pushed to Azure DevOps Boards:]
 **On Azure DevOps [organization / project]** — stories [first work item ID … last work item ID][, all linked to Parent Epic [EPIC-ID] — include this clause ONLY if `## Tracker` records an Epic (not `none`)].
[IF stories were NOT pushed:]
 Tracked locally only (not pushed to Azure DevOps Boards).

 Dependency Graph: [M] stories are ready to start now (no unfinished prerequisites).
 Design stages: [list which ran vs were skipped].
 Manual test plans: **[N] of [N] stories** — `[test-plan-folder]`, written at this checkpoint, so
   every story's test plan exists before a line of its code does.
 Test plans PR: [test-plan-pr-url] — `[TEST]` PR into `[base-branch]`, carrying only the test plans.
 Epic branch: `[epic-branch]` — design artifacts **committed and pushed** ([commit hash]).
 Story PRs merge into: `[base-branch]` — the development branch your CI/CD deploys to DEV.

> ** <u>**DEV — use the keyword `dev-implement`**</u>**
> 1.  Type **`dev-implement`** and pick a story (by Story ID / number, or Tracker ID).
> Run it **once per story** — it cuts `story/N.M-…` from `[base-branch]` and keeps the cycle's
> documents in `.aire-docs/`, a checkout of `[epic-branch]`.
> It **reads** that story's test plan; it never rewrites it.
> 2.  After the PR is approved and merged manually and is deployed to DEV, move the story to
>     **Ready for Testing** on the board.
[IF Novus Test Automation is enabled (`common/extensions-loading.md` Section 5):]
> To automate a story's manual cases in Novus, run `/novus-automate <story> --url <local or allowed URL>`.

> **<u>Verification Engineer — the manual test plans are in the `[TEST]` PR into `[base-branch]`.</u>**
> Review every story's folder under `[test-plan-folder]` in that PR. Changes needed? Run
> `/ve-list-work` and pick **C** — it updates the plan on the PR's branch and the open `[TEST]` PR.
> Get that PR its approvals and merge it; until then, read the plans on its branch.
> When a story reaches Ready for Testing, move it to **In Testing** on the board, execute its test plan
> on DEV, then use `ve-list-work` to close the story or send it to Bug fixing.
[IF Novus Test Automation is enabled (`common/extensions-loading.md` Section 5):]
> To automate a story's manual cases in Novus, run `/novus-automate <story> --url <local or allowed URL>`.

Type `dev-implement` EXACTLY as shown — do not describe what you want in your
   own words. Any other phrasing is not a framework trigger and the workflow will not advance.
```

- The two `[IF Novus Test Automation is enabled …]` lines are emitted only when the extension is enabled, and the `[IF …]` marker itself is never emitted.
- **[N]** = total stories. Show the tracker line only if stories were pushed (Tracker ID column populated); Epic ID from `## Tracker`. Otherwise show the local-only line.
- The test-plans line reports the Step 1.2 counts (`implementation/test-plans-checkpoint.md`); both numbers equal the story count, or the line names the gap.
- Substitute `[epic-branch]`, `[base-branch]`, `[test-plan-folder]` (`## Branching` → `Test Plan Folder`), `[test-plan-pr-url]` (the `[TEST]` PR raised in Step 1.2, `common/branching-strategy.md` Section 7.2) and the commit hash with real values from `## Branching` / the Step 3 commit — never ship a placeholder.
- Log this handoff in runtime-artifacts/audit.md.
