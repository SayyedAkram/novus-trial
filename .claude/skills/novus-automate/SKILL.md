---
name: novus-automate
description: >
  Opt-in Novus Test Automation (aire-workflow/extensions/testing/novus-automation/). Turns ONE story's
  APPROVED manual test plan (test-plans/…/<TICKET-ID>-<title>/ — e2e, api, integration and security
  steps) into Novus automated tests (Java 17, Spring Boot, TestNG, Playwright) under tests/e2e/ of the
  app repo, using only the Novus classes in the pinned syntax reference. Needs a loopback URL, or a host
  on the Base Branch's aut.allowedHosts list (env mode also needs the story in a post-deploy board
  status). Walks each case in a browser MCP to find locators on the live page — never reads application
  source — then generates, compiles, scans and runs the tests ONCE, and records every case's state and
  reason in tests/e2e/automation/<TICKET-ID>.md. Works on its own automation/<TICKET-ID>-<title> branch
  in a .aire-automation/ worktree and writes only tests/e2e/ there, plus one audit entry. Raises the
  [AUTO] PR only after the story's own PR has merged; `--publish` raises a deferred one without a run.
  Never touches test-plans/, the Story Tracker or board status, and is never Verification Engineer
  sign-off.
when_to_use: >
  Trigger when the user says: "/novus-automate 4821 --url …", "/novus-automate 1.2 --url …",
  "/novus-automate 4821 --publish", "novus-automate", "automate the test cases for 4821",
  "automate story 1.2's manual tests", "generate Novus tests for 4821", "automate the manual tests on
  localhost", "automate the tests against DEV", "raise the AUTO PR for 4821".
allowed-tools: Read Grep Glob Bash Write Edit
---

# Novus Automate — manual test plan → Novus tests

Load `aire-workflow/agents/novus-automate-agent.md` and follow it exactly.
