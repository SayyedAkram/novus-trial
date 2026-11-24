---
name: reverse-engineering-root
description: >
  Generates the ROOT reverse engineering artifacts for the whole workspace in a single
  pass — one artifact set flat in spec/plans/ covering ALL
  modules of a monorepo (business overview, architecture, code structure, APIs,
  component inventory, technology stack, dependencies, code quality, timestamp with
  commit fingerprint). All modules and all downstream AIRE stages reuse these root
  artifacts for development. Runs only on an open cycle's docs branch (the Epic, Bug or
  Enhancement Branch, through .aire-docs/ when that worktree holds it) — never on the
  base branch, which carries no spec/, and never on a story branch. Use it to regenerate
  the cycle's root docs on demand. After a merge the docs are kept current by
  /stitch-delta (Atlas) or /stitch-delta-local, not by re-running this skill.
when_to_use: >
  Trigger when the user says: "reverse-engineering-root", "reverse engineer the root",
  "generate root reverse engineering docs", "refresh reverse engineering artifacts",
  "regenerate reverse engineering baseline", "reverse engineer the monorepo".
allowed-tools: Read Grep Glob Bash Write
---

# Reverse Engineer Root — Root-Level Artifacts for All Modules

Load and execute the reverse engineering stage instructions from:

```
aire-workflow/planning/reverse-engineering.md
```

Read that file completely and follow every step defined in it, applying its
"Monorepo Handling — Root-Level, Single Pass" and
"Standalone Invocation — `reverse-engineering-root` Skill" sections:

- **Before anything else, check the branch.** Read `## Branching` in `runtime-artifacts/aire-state.md` (through `.aire-docs/` when that worktree holds the epic branch). Run only when the docs location is on the recorded Epic Branch, Bug Branch or Enhancement Branch. On the Base Branch, on a `story/…` branch, or with no cycle recorded → STOP with nothing written:
  ```
   reverse-engineering-root writes spec/plans/, which only an open cycle's docs branch carries —
   the base branch carries no spec/ between cycles.

     • No cycle open → start one: Workspace Detection pulls the deep dive from Atlas, restores
       aire-archives/local-re/, or runs this same reverse engineering when neither exists.
     • A cycle is open → run this skill on its docs branch (`.aire-docs/` in a story run).
     • Docs out of date after a merge → on the base branch type /stitch-delta
       (or /stitch-delta-local when the team works without Atlas).
  ```
- **As the very first step** after that check, ensure the root-level `spec/context-project/existing-knowledge/` folder exists per reverse-engineering.md's "Context Project Folder" section — check first, and create an EMPTY folder only if it is absent (never recreate/overwrite an existing one, and do NOT add a README inside it)
- Execute ONCE at the workspace root, covering ALL modules — one artifact set, never per-module sets
- **Accuracy Rules are MANDATORY** (see "Accuracy Rules — Apply to ALL Artifact Writing" in that file): verify every factual claim against the actual code at HEAD before writing it, and produce every quantitative figure by running the real command at generation time — never estimate, sum, or carry numbers forward from other documents
- If `spec/` does not exist, create the minimal structure first
- If artifacts already exist, this is a refresh against the current code state. On an epic cycle after the STOP CHECKPOINT the stories' code is on the Base Branch, not the epic branch: analyse the main working tree on the freshly pulled Base Branch and write the docs into `.aire-docs/spec/plans/` (`aire-workflow/common/branching-strategy.md` Section 4 path rule)
- In the Step 12 completion message, offer " Approve & Finish" instead of proceeding to Requirements Analysis
- Log the invocation, completion, and user approval in `runtime-artifacts/audit.md`, and commit the docs on the cycle's docs branch with the `AIRE-Version: [N]` trailer — never on the Base Branch
