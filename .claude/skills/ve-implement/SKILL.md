---
name: ve-implement
description: >
  Verification Engineer Test Plan for ONE story, run in PARALLEL with development. Test Plan is not a stage
  of the development workflow — it lives here. Resolves a story, reads its acceptance criteria from
  Azure DevOps Boards / stories.md plus requirements.md and the implementation design artifacts — never application
  source code — and writes that story's Test Plan artifacts as MANUAL test steps
  (integration, E2E, API, contract, security, performance, accessibility — whichever apply; there is
  no build-verification artifact, each plan opens with a System Under Test precondition block instead)
  into the story's folder under the cycle's Test Plan Folder (test-plans/<cycle>/<TICKET-ID>-<title>/
  on an epic, test-plans/<TICKET-ID>-<title>/ on a bug or enhancement — aire-workflow/common/branching-strategy.md
  Section 7), with every test case traced to an acceptance criterion.
  Needs no DEV code, branch, PR or merge, so Verification Engineer can run it the moment a story exists — it never
  depends on or waits for the dev's branch/PR. IN STANDALONE MODE ONLY it publishes the generated docs once the
  Verification Engineer approves them: on an epic cycle through the cycle's [TEST] PR into the Base Branch
  (branching-strategy.md Section 7.2 — reused when one is open); on a bug or enhancement cycle through its own
  `ve/<TICKET-ID>-<title>` branch, cut from the Bug/Enhancement Branch, and a PR back into that branch —
  labeled `ai-generated` + `aire-anx-v<version>` (the framework version read live from
  CLAUDE.md, same convention as pr-generator). No test automation, no test execution, no application code
  changes — and never changes story or tracker status (closing or rejecting stays `ve-list-work`'s job;
  the other moves are made on the board). Written early, executed on DEV: the system under test is
  the DEV environment, once the item's PR is approved twice, merged into the development branch and
  deployed by the team's CI/CD — never a locally built instance.
  TWO MODES: STANDALONE (Verification Engineer types /ve-implement — everything above applies as written, including the
  story-picker, the publishing branch, the Approve/Request-Changes checkpoint and the PR), and WORKFLOW
  (mode: workflow with the story passed in — the story-picker, the branch, the approval
  checkpoint and the push/PR are all SKIPPED; the generated files are written where the caller says — on an
  epic cycle its open test-plan worktree .aire-test-plans/ — and the caller publishes them). WORKFLOW MODE has two callers: the STOP CHECKPOINT
  (CLAUDE.md Step 1.2 / implementation/test-plans-checkpoint.md), which invokes it once per story
  of the cycle BEFORE any code is generated and approves the whole set at its own gate — the primary
  path — and dev-implement / bug-fix-implement / enhancement-implement, which invoke it only to
  backfill a genuinely absent plan. Content and rigour are identical in both modes; WORKFLOW MODE
  output is NOT Verification Engineer sign-off.
when_to_use: >
  Trigger when the user says: "/ve-implement 1.2", "/ve-implement 4821", "/ve-implement",
  "Test Plan for story 1.2", "generate test steps for story 1.2",
  "manual test cases for 4821", "test plan for this story",
  "test cases from acceptance criteria", "Verification Engineer this story", "run ve-implement", "ve-implement".
allowed-tools: Read Grep Glob Bash Write
---

# ve-implement — Verification Engineer Test Plan (per story)

Load `aire-workflow/agents/ve-implement-agent.md` and follow it exactly.
