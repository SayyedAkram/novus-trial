# User Stories - Detailed Steps

## Purpose
**Convert requirements into user-centered stories with acceptance criteria**

User Stories focus on:
- Translating business requirements into user-centered narratives
- Defining clear acceptance criteria for each story
- Creating user personas that represent different stakeholder types
- Establishing shared understanding across teams
- Providing testable specifications for implementation
- Slicing each story small and single-purpose (Step 1.5 SPIDR rules) so a reviewer can check its implementation against it as one bounded, mechanical unit of work

## Prerequisites
- Workspace Detection must be complete
- Requirements Analysis recommended (can reference requirements if available)

> **Three parts in this stage**: **Part 1 — Planning** (plan the story set — **the plan itself is NOT approved**), **Part 2 — Generation** (all stories generated at once + personas + populate the Story Tracker, gated by the **Story Set Approval**), **Part 3 — Push to Tracker** (runs **only after the story set is approved**; then pushes automatically, no further questions, to Azure DevOps Boards). The pod's `team_size` (asked once, Step 1) AND the **Story Slicing Rules** (Step 1.5) drive story granularity; each story's `Requires` dependencies are assigned in the **Dependency Graph** stage that runs immediately after this one.
>
> **The story PLAN (Part 1) has NO approval gate** — it is auto-approved and announced (Step 12).  **The GENERATED STORY SET (Part 2) DOES have a mandatory approval gate — the Story Set Approval** (Steps 19–22): once all stories are generated and the coverage/granularity checks pass, the complete set is presented for explicit human approval and the workflow HALTS. Part 3 (Push to Tracker) does not start until the story set is approved.

---

# PART 1: PLANNING

## Step 1: Begin Story Planning — Ask the Pod Size (`team_size`, asked ONCE)

User Stories always execute for every software development request.

**Skip this question** when `team_size` is already recorded in `runtime-artifacts/aire-state.md`
(resumed project) — reuse it, never re-ask.

Otherwise, ask how many developers are in the pod before writing the story plan — the answer sets
the parallel width the story set and the Dependency Graph are shaped for, and the Step 3
number-of-stories recommendation depends on it.

1. Write `spec/spec-generation/team-size-question.md` (`common/question-format-guide.md` format):
   ```markdown
   ## Question 1
   How many developers are in the pod that will implement these stories?

   A) 1 developer

   B) 2 developers

   C) 3 developers

   D) 4 developers

   E) Other (please describe after [Answer]: tag below)

   [Answer]:
   ```
2. Tell the user the file is ready and wait for the answer. Log the prompt in
   `runtime-artifacts/audit.md` before asking and the complete raw answer after receiving it.
3. Validate: the answer must resolve to a whole number of at least 1 (`E` with a number, e.g. `E) 6`).
   Anything else → one follow-up question in the same format; never guess.
4. Record `team_size: N` in `runtime-artifacts/aire-state.md`. **The Dependency Graph stage and the
   mid-epic workflows reuse this value — it is never asked again.**
5. Tune story granularity to it: break the work into enough small stories that ≥ N of them can
   run in parallel without touching the same file (`planning/dependency-graph-generation.md` R6),
   unless the architecture genuinely makes that much parallelism impossible — then say so in the
   Step 12 announcement.
6. If the user changes the pod size later, update `team_size`, log it, and re-run the Dependency Graph
   stage's Step 3.6 (waves and lanes). Before the Story Set Approval, also re-tune granularity.

Then proceed to Step 1.5.

## Step 1.5: Apply Story Slicing Rules (MANDATORY — small, single-purpose stories)

**Purpose**: The single biggest lever for cutting a human reviewer's effort is a small, single-purpose
story — one story, one bounded diff, one thing to confirm. A story that bundles multiple unrelated
behaviors forces the reviewer to hold several mental models at once and manually untangle which part
of a large diff maps to which part of the story. Slicing narrowly removes that untangling work
entirely: read the story, look at its diff, confirm the one thing it claims to do.

**Slicing method — apply SPIDR to every capability in the Epic/requirements BEFORE drafting stories.**
Split along these axes, in priority order, instead of writing one story per capability:
- **R — Rules**: a distinct business rule, validation, or decision branch (e.g., "discount applies
  when order > $100") is its OWN story, separate from the base behavior it modifies.
- **P — Paths**: the happy path and each meaningfully different path (alternate flow, error/failure
  handling, empty/boundary state) are SEPARATE stories, not extra ACs bolted onto one story — unless
  the alternate path is a one-line variation with no independent logic worth reviewing on its own.
- **I — Interfaces**: a different entry point (REST endpoint vs UI form vs CLI vs webhook, or a new
  vs an existing consumer) is its OWN story, even when the underlying logic is shared.
- **D — Data**: a new data variation, type, or format (e.g., supporting CSV in addition to JSON) is
  its OWN story rather than an AC tacked onto the story that introduced the first format.
- **S — Steps**: a multi-step workflow (e.g., checkout: cart → payment → confirmation) is split one
  story per step, never one story for the whole workflow.
- **CRUD**: when a capability has Create/Read/Update/Delete facets, each verb is its OWN story unless
  two verbs are trivially thin (e.g., delete is a one-line soft-flag flip identical to an existing
  pattern already in the codebase) — combine only in that case, and say so explicitly in the story.

**Hard sizing ceilings — a story MUST be split further if it exceeds ANY of these**:
- More than 5 acceptance criteria.
- Touches more than one architectural layer newly (e.g., a new UI screen AND a new backend
  service AND a new schema, all in the same story) — unless the extra layers are pure pass-through
  with no independent logic to verify.
- Its title needs "and"/"or" to describe what it does (e.g., "Create and edit profile") — split on
  the conjunction.
- Verifying it would require the reviewer to check more than one distinct scenario class at once
  (happy path, one error case, one edge case, etc.) — one scenario class per story.

**Still apply INVEST (Step 4) on top of this** — slicing narrowly must not produce a story that is no
longer independently valuable or testable; if SPIDR-slicing would strand a story with no observable
value on its own, keep the thinnest useful end-to-end slice instead of a pure-plumbing story.

- [ ] Log in `runtime-artifacts/audit.md` which SPIDR axis (or axes) was used to split each capability from
  the Epic/requirements into story boundaries, before the plan is created in Step 2.

## Step 2: Create Story Plan
- Assume the role of a product owner
- Generate a comprehensive plan with step-by-step execution checklist for story development
- Each step and sub-step should have a checkbox []
- Focus on methodology and approach for converting requirements into user stories

## Step 3: Generate Context-Appropriate Questions
**DIRECTIVE**: Thoroughly analyze the requirements and context to identify ALL areas where clarification would improve story quality and team understanding. Be proactive in asking questions to ensure comprehensive user story development.

**CRITICAL**: Default to asking questions when there is ANY ambiguity or missing detail that could affect story quality. It's better to ask too many questions than to create incomplete or unclear stories.

**See `common/question-format-guide.md` for question formatting rules**

- EMBED questions using [Answer]: tag format
- Focus on ANY ambiguities, missing information, or areas needing clarification
- Generate questions wherever user input would improve story creation decisions
- **When in doubt, ask the question** - overconfidence leads to poor stories

### MANDATORY QUESTION — Number of Stories to Create (smart suggestion, always included)

**Every generated question set MUST include this question — it is NOT optional and NOT context-dependent.** While the other questions in this step are context-appropriate (asked only when relevant), the number-of-stories question is ALWAYS asked, with a concrete AI-computed recommendation and the reasons behind it.

Before writing it into the plan, do the analysis so the suggestion is grounded, not arbitrary:
- Read the Parent Epic brief (`spec/plans/epic-brief.md`) and `spec/plans/requirements.md` (if present).
- Read the `New References` fields of `## Context Project` in `runtime-artifacts/aire-state.md`. IF `New References: Yes`, load all listed reference paths — UX wireframes inform story scope (one screen/flow per story), API specs inform endpoint boundaries, etc. Use them as inputs when counting capabilities and deciding story boundaries.
- Count the distinct capabilities / functional requirements (REQ-IDs), user journeys, and personas involved, and gauge their complexity.
- **Apply the Step 1.5 Story Slicing Rules (SPIDR) to that count** — for each capability, count how many separate Rules / Paths / Interfaces / Data-variations / Steps / CRUD-verbs it contains; each becomes its own candidate story rather than a sub-bullet of one larger story.
- Compute a recommended story count that (a) keeps each story small, single-purpose, and INVEST-compliant against the Step 1.5 hard sizing ceilings, and (b) yields ≥ `team_size` (the pod size from Step 1) independently workable stories so no developer is left idle.

Embed EXACTLY this question in the plan (fill in the computed values — never leave it open-ended without a recommendation):

```
 How many user stories should I create for this work?

    Recommended: [X] stories  (suggested range: [X-lo]–[X-hi])

   Why [X]:
   - [reason 1 — e.g. "8 functional requirements SPIDR-sliced into single-purpose stories (rules, paths and CRUD verbs split out)"]
   - [reason 2 — e.g. "keeps ≥ [team_size] stories runnable in parallel so no developer is idle"]
   - [reason 3 — e.g. "each story stays within the Step 1.5 sizing ceilings (≤5 ACs, one layer, one scenario class) so review is small and mechanical"]

   Reply with a number to override, or "ok"/"use recommended" to accept [X].
[Answer]:
```

- **ALWAYS compute and show a concrete recommended number `[X]` and the reasons** — never present this as an open-ended question with no suggestion.
- When the user accepts, use `[X]`. If the user gives a different number, use theirs — but if it would break the parallelism rule (fewer than `team_size` independent stories) or force oversized/undersized stories, flag the trade-off during Step 9/10 analysis and confirm before generation.
- Record the agreed value as `target_story_count` in `runtime-artifacts/aire-state.md`. The Generation phase (Part 2) MUST create this many stories (adjusting only if Step 9/10 analysis or the Step 18.5 coverage check proves a different count is required — log any deviation and its reason in runtime-artifacts/audit.md).

### MANDATORY QUESTION — Design Reference Links for the Stories (always included)

**Every generated question set MUST also include this question**, worded exactly as below — no
explanation added to the question text, and **no `Other` option** (the one exception to
`common/question-format-guide.md`'s mandatory `Other`):

```
## Question: Design References
Any Design References to be attached in the story?

A) Yes — paste the link(s) after [Answer]:, one per line

B) No

[Answer]:
```

- **Links given** (A, or links pasted with no letter) → every answer line must be a link (`http://` or
  `https://`). Anything that is not a link → one follow-up question in the same format; never guess
  a link. Record them in `runtime-artifacts/aire-state.md` as
  `story_design_references:` followed by one `- <link>` line per link, in the order given. Register each
  link in `## Design References` as `common/design-reference-grounding.md` DR-1 already requires.
- **No** (B, `no` or `none`) → record `story_design_references: none`.
- The links are added to the Description of EVERY story this stage pushes to the ADO board, under a
  `Design References:` section (Part 3 Step 26, `common/tracker-sync.md` Section 3). With `none`, no
  story description carries a `Design References:` section at all.

**Question categories to evaluate** (consider ALL categories):
- **User Personas** - Ask about user types, roles, characteristics, and motivations
- **Story Granularity** - Ask about appropriate level of detail, story size, and breakdown approach
- **Story Format** - Ask about format preferences, template usage, and documentation standards
- **Breakdown Approach** - Ask about organization method, prioritization, and grouping strategies
- **Acceptance Criteria** - Ask about detail level, format, testing approach, and validation methods
- **User Journeys** - Ask about user workflows, interaction patterns, and experience flows
- **Business Context** - Ask about business goals, success metrics, and stakeholder needs
- **Technical Constraints** - Ask about technical limitations, integration requirements, and system boundaries

## Step 4: Include Mandatory Story Artifacts in Plan
- **ALWAYS** include these mandatory artifacts in the story plan:
  - [ ] Generate stories.md with user stories following INVEST criteria
  - [ ] stories.md MUST begin with the Parent Epic header line (see Step 16 — Epic header rule)
  - [ ] Generate personas.md with user archetypes and characteristics
  - [ ] Ensure stories are Independent, Negotiable, Valuable, Estimable, Small, Testable — "Small" means passing the Step 1.5 hard sizing ceilings (≤5 ACs, one new architectural layer, no title conjunction, one scenario class)
  - [ ] Include acceptance criteria for each story
  - [ ] **EVERY story carries a `**Covers**: [REQ-IDs]` line** naming the requirements from `requirements.md` its acceptance criteria implement (MANDATORY — see `common/requirements-traceability.md` Rule 2; "reference requirements if available" is superseded, coverage is never optional)
  - [ ] **Requirements Coverage Matrix + full-coverage check** — every REQ-ID fully expressed by the union of its covering stories' ACs (see Step 18 / `common/requirements-traceability.md` Rule 3)
  - [ ] Map personas to relevant user stories

## Step 5: Present Story Options
- Include different approaches for story breakdown in the plan document:
  - **User Journey-Based**: Stories follow user workflows and interactions
  - **Feature-Based**: Stories organized around system features and capabilities
  - **Persona-Based**: Stories grouped by different user types and their needs
  - **Domain-Based**: Stories organized around business domains or contexts
  - **Epic-Based**: Stories structured as hierarchical epics with sub-stories
- Explain trade-offs and benefits of each approach
- Allow for hybrid approaches with clear decision criteria

## Step 6: Store Story Plan
- Save the complete story plan with embedded questions in `spec/spec-generation/` directory
- Filename: `story-generation.md`
- Include all [Answer]: tags for user input
- Ensure plan is comprehensive and covers all story development aspects

## Step 7: Request User Input
- Ask user to fill in all [Answer]: tags directly in the story plan document
- Emphasize importance of audit trail and decision documentation
- Provide clear instructions on how to fill in the [Answer]: tags
- Explain that all questions must be answered before proceeding

## Step 8: Collect Answers
- Wait for user to provide answers to all questions using [Answer]: tags in the document
- Do not proceed until ALL [Answer]: tags are completed
- Review the document to ensure no [Answer]: tags are left blank

## Step 9: ANALYZE ANSWERS (MANDATORY)
Before proceeding, you MUST carefully review all user answers for:
- **Vague or ambiguous responses**: "mix of", "somewhere between", "not sure", "depends", "maybe", "probably"
- **Undefined criteria or terms**: References to concepts without clear definitions
- **Contradictory answers**: Responses that conflict with each other
- **Missing generation details**: Answers that lack specific guidance for implementation
- **Answers that combine options**: Responses that merge different approaches without clear decision rules
- **Incomplete explanations**: Answers that reference external factors without defining them
- **Assumption-based responses**: Answers that assume knowledge not explicitly stated

## Step 10: MANDATORY Follow-up Questions
If the analysis in step 9 reveals ANY ambiguous answers, you MUST:
- Create a separate clarification questions file using [Answer]: tags
- DO NOT proceed to approval until ALL ambiguities are completely resolved
- **CRITICAL**: Be thorough - ask follow-up questions for every unclear response
- Examples of required follow-ups:
  - "You mentioned 'mix of A and B' - what specific criteria should determine when to use A vs B?"
  - "You said 'somewhere between A and B' - can you define the exact middle ground approach?"
  - "You indicated 'not sure' - what additional information would help you decide?"
  - "You mentioned 'depends on complexity' - how do you define complexity levels and thresholds?"
  - "You chose 'hybrid approach' - what are the specific rules for when to use each method?"
  - "You said 'probably X' - what factors would make it definitely X vs definitely not X?"
  - "You referenced 'standard practice' - can you define what that standard practice is?"

## Step 11: Avoid Implementation Details
- Focus on story creation methodology, not prioritization or development tasks
- Do not discuss technical generation at this stage
- Avoid creating development timelines or sprint planning
- Keep focus on story structure and format decisions

## Step 12: Announce the Plan ( AUTOMATIC — no approval gate)

**The story PLAN itself is NOT gated.** The user's answers to the Step 3 questions (including the
story count) already shaped it. The story SET the plan produces is different — it carries a
mandatory approval gate, the Story Set Approval (Steps 19–22), presented after generation and before
Part 3 (Push to Tracker).

- Log in `runtime-artifacts/audit.md` (ISO 8601 timestamp) that the story plan was finalized and
  auto-approved, including the plan path and a one-line summary of the approach chosen.
- Present a short announcement (NOT a question):
  ```
   Story plan ready — spec/spec-generation/story-generation.md
     Approach: [breakdown approach] | Target stories: [X] | team_size: [N]
     Generating all stories now — the complete set will be presented for your approval before anything is pushed to Azure DevOps Boards.
  ```
- **Do NOT ask for plan approval and do NOT wait here.** Proceed directly to Part 2 (Generation) — the actual approval gate comes later, at Step 21.

If the user *volunteers* changes to the approach after seeing the Step 12 announcement, apply them
and continue — that is an interrupt, not a gate.

---

# PART 2: GENERATION

## Step 14.5: Story Creation Mode — FIXED to all-at-once ( NEVER asked)

**Do NOT ask how the stories should be created.** The mode is a **fixed framework default:
`all-at-once`** — every story is generated together in a single pass, with no per-story approval
loop. The complete set then goes through the Story Set Approval (Step 21).

- [ ] Record `story_creation_mode: all-at-once` in `runtime-artifacts/aire-state.md` without prompting.
- [ ] Log in `runtime-artifacts/audit.md` that the mode was defaulted to `all-at-once` (no question presented).
- [ ] Never present an A/B choice here, and never pause between stories for approval.

## Step 15: Load Story Generation Plan
- [ ] Read the complete story plan from `spec/spec-generation/story-generation.md`
- [ ] Identify the next uncompleted step (first [ ] checkbox)
- [ ] Load the context and requirements for that step

## Step 16: Execute Current Step
- [ ] Perform exactly what the current step describes
- [ ] Generate story artifacts as specified in the plan
- [ ] Follow the approved methodology and format from Planning
- [ ] Use the story breakdown approach specified in the plan
- [ ] **Generate ALL stories together in one pass** (`story_creation_mode: all-at-once`, Step 14.5) — never one at a time, never pausing for a per-story approval:

** Epic header rule (applies when stories.md is first created)**:
- [ ] The VERY FIRST line of `spec/plans/stories.md` MUST be the Parent Epic header:
  ```markdown
  EPIC TICKET: [full Epic URL/reference, e.g. https://dev.azure.com/<org>/<project>/_workitems/edit/4800]
  ```
  Read the Epic URL from `## Tracker` in `runtime-artifacts/aire-state.md` (Epic URL line). If no Parent Epic is recorded at creation time, write `EPIC TICKET: none (no Parent Epic recorded)` — and when an Epic is later resolved during the tracker push (Step 25), UPDATE this header line with the full Epic URL/reference in the same interaction. All stories are appended BELOW this header.

** Requirements traceability rule (applies to every story generated)**:
- [ ] EVERY story written to `stories.md` carries a `**Covers**: REQ-F-xx, REQ-NF-yy` line naming the requirement IDs from `spec/plans/requirements.md` its acceptance criteria implement (`common/requirements-traceability.md` Rule 2). A story with an empty `Covers` is invalid — fix it before presenting the story. For multi-requirement stories, an AC-level breakdown (`AC-n → REQ-ID`) is encouraged. When a requirement is split across stories for parallelism, the integration behavior between the slices MUST be owned by an explicit AC on one of them.

** Conflict-free touch rule (applies to every story generated — `planning/dependency-graph-generation.md` R6, HARD)**:
- [ ] EVERY story carries a `**Touches**:` line listing the repository paths it will create, modify, delete or rename — its code, its unit and API contract tests, and every shared hotspot it needs (manifests and lockfiles, registration tables, index exports, migrations, shared config, shared types, shared test helpers). Predict them from the acceptance criteria, `requirements.md` and, on brownfield, the existing code structure. Name new files and folders, and word anything else the stories say about code, the way the team's coding guidelines require — every `.md` file in `spec/context-project/coding-guidelines/` (`implementation/code-generation.md` Step 1.8). None there → as before.
- [ ] Stories that could run in parallel must not share a path. When two stories would both make the same mechanical shared edit (add the cycle's new dependencies, register routes, export symbols, add config keys), give that edit to ONE foundation story that the others build on, and keep it out of their `Touches`. Any overlap left after that is ordered by the Dependency Graph stage.

- [ ] Generate ALL stories together in one pass, write them to `stories.md` beneath the Epic header, then continue to Step 17. No per-story approval is requested — the complete set is announced at Step 20 and waits for the Story Set Approval (Step 21); only after "Approve & Continue" is it pushed to Azure DevOps Boards (Part 3).

## Step 17: Update Progress
- [ ] Mark the completed step as [x] in the story generation plan
- [ ] Update `runtime-artifacts/aire-state.md` current status
- [ ] **Populate the Story Tracker**: add one row per generated story to the `## Story Tracker` table in `runtime-artifacts/aire-state.md`. Columns: Story ID, Title, Requires = `TBD` (assigned next stage), `Tracker ID` = `—`, `Status` = `ToDo` (the initial status for every new story — `common/status-model.md` S1), Start/End blank, `Recorded` = current timestamp. Use the table format defined in `planning/dependency-graph-generation.md` (Story Tracker Table Format section).
- [ ] Save all generated artifacts

## Step 18: Continue or Complete Generation
- [ ] If more steps remain, return to Step 15
- [ ] If all steps complete, verify stories are ready for next stage
- [ ] Ensure all mandatory artifacts are generated

## Step 18.5: Requirements Full-Coverage Check (MANDATORY — automatic, BEFORE the Step 20 announcement)
Execute `common/requirements-traceability.md` Rule 3 — silent and blocking, NO user prompt:
- [ ] Build the coverage matrix: every REQ-ID in `requirements.md` → the story ID(s) whose `Covers` names it
- [ ] **Gap A — uncovered requirement** (a REQ-ID with zero covering stories): add/extend stories automatically, then re-check
- [ ] **Gap B — partial coverage** (the union of the covering stories' ACs does not express the requirement's full end-to-end behavior, including cross-story seams): strengthen the ACs automatically, then re-check
- [ ] Append the matrix to `stories.md` as `## Requirements Coverage Matrix` (REQ-ID | covering stories | status)
- [ ] Log the check outcome (pass, or gaps found + fixes applied) in `runtime-artifacts/audit.md`
- [ ] Include a coverage summary line in the Step 20 announcement (e.g., ` Requirements coverage: 12/12 REQ-IDs fully covered by story ACs`)
- [ ] Do NOT present the Step 20 announcement until the matrix shows every REQ-ID fully covered

## Step 18.6: Story Granularity & Splitting Check (MANDATORY — automatic, BEFORE the Step 20 announcement)
Runs immediately after Step 18.5 passes — silent and blocking, NO user prompt. Purpose: guarantee
every story that reaches the developer/reviewer actually obeys the Step 1.5 slicing rules, not just
that the plan intended it to.
- [ ] Scan every story in `stories.md` against the Step 1.5 **hard sizing ceilings**: AC count > 5,
  more than one newly-touched architectural layer, a title conjunction ("and"/"or"), or more than one
  distinct scenario class bundled into its ACs.
- [ ] **Violation found**: split the story along whichever SPIDR axis (Rules / Paths / Interfaces /
  Data / Steps / CRUD) produced the violation, generate a new story ID for the split-off piece, and
  carry its `Covers` REQ-ID(s) and persona mapping forward — a split only ever narrows a story, it
  never drops requirements coverage.
- [ ] Re-run the Step 18.5 coverage check on the resulting set, then re-check the ceilings; repeat
  until every story in `stories.md` passes both checks.
- [ ] Log the outcome (pass, or violations found + splits applied, listing story IDs before → after)
  in `runtime-artifacts/audit.md`.
- [ ] Include a granularity summary line in the Step 20 announcement (e.g., ` Story granularity:
  14 stories, 0 ceiling violations after 3 auto-splits`).
- [ ] Do NOT present the Step 20 announcement until every story passes the ceilings.

## Step 19: Log the Generated Story Set ( approval prompt follows)
- **This stage has a MANDATORY approval gate — the Story Set Approval.** The story set is generated and announced, then the workflow HALTS for explicit human approval before anything is pushed to Azure DevOps Boards.
- Log in `runtime-artifacts/audit.md` (ISO 8601 timestamp) that the complete story set was generated and is awaiting approval: the story count, the breakdown approach, the coverage-check outcome, and the path to `stories.md`.
- Use the audit heading `## User Stories — Story Set Approval (awaiting response)`.

## Step 20: Present the Completion Announcement
- Present the announcement in this structure:
     1. **Completion Announcement** (mandatory): Always start with this:

```markdown
# User Stories Complete
```

     2. **AI Summary** (optional): Provide structured bullet-point summary of generated stories
        - Format: "User stories generation has created [description]:"
        - List key personas generated (bullet points)
        - List user stories created with counts and organization
        - Mention story structure and compliance (INVEST criteria, acceptance criteria)
        - DO NOT include workflow instructions ("please review", "let me know", "proceed to next phase", "before we proceed")
        - Keep factual and content-focused
     3. **Formatted Workflow Message** (mandatory): Always end with this exact format:

```markdown
> **<u>REVIEW REQUIRED:</u>**  
> The user stories and personas are at: `spec/plans/stories.md` and `spec/plans/personas.md`

> ** <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the story set (a story, an AC, a split, coverage) before it is pushed
> **Approve & Continue** - Approve the story set; it will be **pushed now** (ADO project [PROJECT], work item type User Story[, linked to Parent Epic [EPIC-ID]]), then the **Dependency Graph** is generated

---
```

## Step 21: Story Set Approval — Wait for Explicit Approval (MANDATORY)
- **DO NOT proceed to Part 3 (Push to Tracker) until the user explicitly responds.** This is a hard halt — do not push any work item, do not resolve the ADO project for pushing, do not proceed to the Dependency Graph.
- **On "Request Changes"**: apply the requested change(s) to `stories.md` and the Story Tracker (re-running the Step 18.5/18.6 coverage and granularity checks if the change affects them), then re-present the Step 20 announcement and return to this gate. Repeat until the user approves.
- **On "Approve & Continue"**: proceed to Step 22, then Part 3 (Push to Tracker).
- A change volunteered by the user AFTER approval (i.e., after the push has started or completed) is still honored as an interrupt — apply it to `stories.md`, the Story Tracker and the corresponding tracker issues per the Tracker Sync Rule — but it does not reopen the Story Set Approval for stories already pushed.

## Step 22: Record the Approval Response (MANDATORY)
- Log the user's complete raw response (Approve & Continue / Request Changes + full text) with an ISO 8601 timestamp in `runtime-artifacts/audit.md`, under a heading such as `## User Stories — Story Set Approval (response received)`.
- If changes were requested, log what was changed and that the gate is being re-presented.
- Only once "Approve & Continue" is recorded does this stage's approval gate count as passed.

## Step 23: Update Progress
- Mark User Stories stage complete in `runtime-artifacts/aire-state.md` (only after the story set is approved)
- Update the "Current Status" section
- Prepare for transition to Part 3 (Push to Tracker), then the Dependency Graph stage

---

# PART 3: PUSH TO TRACKER (runs only after the Story Set Approval — then automatic, no further confirmation)
Once the story set is generated, the coverage/granularity checks pass, AND **the Story Set Approval (Step 21) has been
given explicitly**, the stories are pushed to Azure DevOps Boards automatically — no
further "push? yes/no" question, no project confirmation, and no work-item-type question (those were
already covered by the Story Set Approval).
Read `common/tracker-sync.md` Section 3 (work item creation), Section 4 (status transition), and
Section 6 (Parent Epic linking) before executing this Part; those sections are the single source of
truth for the actual `az boards` commands, not re-derived here.

> **Note**: This pushes **stories** and links each one to the **Parent Epic** — the existing Epic the user provided at workflow start (stored in `runtime-artifacts/aire-state.md` under `## Tracker`).

## Step 24: Push After Approval (no further question)
- [ ] Log in `runtime-artifacts/audit.md` with timestamp that the tracker push is starting because the story set was approved (reference the Step 22 approval entry).
- [ ] Announce (NOT a question):
  ```
   [N] user stories approved — pushing to Azure DevOps Boards now.
     Organization: [ORG-URL] | Project: [PROJECT] | Work item type: User Story
     [Include this line ONLY if runtime-artifacts/aire-state.md `## Tracker` records a Parent Epic:
      "Each story will be linked to Parent Epic [EPIC-ID]."]
  ```
- [ ] Proceed straight to Step 25. Never ask "push these stories? (yes/no)".

## Step 25: Resolve the Parent Epic & ADO Project (automatic — derive, verify, do NOT confirm)
- [ ] **Read the Parent Epic** from `runtime-artifacts/aire-state.md` `## Tracker` (Parent Epic + Epic URL + Organization + Project). This works even in a brand-new chat — the Epic was stored at workflow start.
- [ ] **Organization and Project — derive, never ask**: reuse the values recorded in `## Tracker` (resolved at workspace detection, `common/tracker-sync.md` Section 1), or take them from the Epic URL (`https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`). Do NOT ask the user to confirm them. Announce the values in the Step 24 message.
- [ ] **Work item type — fixed default `User Story`**. Do NOT ask. Only if the project's process genuinely has no `User Story` type (verified against the project's work item types) fall back to the nearest equivalent, announce the substitution, and log it.
- [ ] **Verify the Epic exists** with `az boards work-item show` (`common/tracker-sync.md` Section 2). If it cannot be fetched, STOP and report — do not push stories against an unverified Epic.
- [ ] **Only if NO Parent Epic and NO Organization/Project can be resolved from state** (no Epic was ever provided) is a single question unavoidable — ask it once and store the answer:
  ```
   No Parent Epic or ADO project is recorded. Where should these stories be created?
     Paste an ADO Epic link or work item ID to link them to, or just the organization URL and
     project name to push unlinked.
  ```
  Store the answer in `## Tracker` (Parent Epic / Epic URL / Organization / Project) before pushing. If the answer has no Epic, record `Parent Epic: none` and skip Step 26b entirely.

## Step 26: Create the Work Items
- [ ] For each story, create a work item per `common/tracker-sync.md` Section 3: `az boards work-item create --type "User Story"` with the AC as an HTML checklist in the board's Acceptance Criteria field (named in `### Field Map` under `## Tracker`), `System.Tags` including `ai-generated;aire-anx-v[N]`, and the description holding only the story narrative, the `Design References:` section (only when `story_design_references` in `runtime-artifacts/aire-state.md` lists links — Step 3) and the footer `Built with AIRE v[N]`. **Never put the acceptance criteria in the description** — they go in the Acceptance Criteria field only. With `story_design_references: none`, the description has NO `Design References:` section.
- [ ] **VERIFY** each creation succeeded (the AC in the Acceptance Criteria field, none in the description; the `Design References:` section present with exactly the recorded links, or absent when `none`); capture the returned work item ID.
- [ ] If a creation fails, STOP, report the error, and do not silently continue.

## Step 26a: Move Each Story to `ToDo` (MANDATORY)
- [ ] New work items start in the process's default initial state (e.g., New) — stories MUST NOT be left there unless that state IS the mapped `ToDo`. Immediately after each story is created, move it to the `ToDo` name in `## Tracker` → `### Status Map` (`common/status-model.md` S1 and Section 5) with `az boards work-item update` per `common/tracker-sync.md` Section 4 — its state and the column of the same name, always set together.
- [ ] **VERIFY** by re-fetching the work item and confirming the state and column. If the mapped state doesn't exist in the project's workflow, ask which state to use and record it in the Status Map (`common/status-model.md` Section 5) — never leave stories silently in the default state or pick a state on your own.
- [ ] Log each transition (work item ID, from → to status) in `runtime-artifacts/audit.md` with timestamp.

## Step 26b: Link Each Story to the Parent Epic (AUTOMATIC — skip only when `Parent Epic: none`)
- [ ] For each created story, link it to the Parent Epic — automatic, no confirmation (linking to the recorded Parent Epic is part of the same authorized push), per `common/tracker-sync.md` Section 6: `az boards work-item relation add --relation-type "System.LinkTypes.Hierarchy-Reverse" --target-id [EPIC-ID]`.
- [ ] **VERIFY each link landed**: fetch each story back and confirm its parent is the Parent Epic. If a link fails, STOP and report — never leave stories silently unlinked.
- [ ] Report the Epic → linked story IDs mapping to the user.

## Step 27: Write Keys Back
- [ ] In `spec/plans/stories.md`, annotate each story with its Tracker ID and link (`**Tracker ID**: 4821` + the work item URL).
- [ ] Verify the `EPIC TICKET:` header at the TOP of stories.md carries the resolved Parent Epic's full URL/reference — update it now if it still reads `none` (or leave `none` only if the user explicitly chose "none" at push time).
- [ ] In the `## Story Tracker` of `runtime-artifacts/aire-state.md`, set each story's `Tracker ID` column to its work item ID and update `Recorded` to the current timestamp.
- [ ] Confirm to the user: list each Story ID → Tracker ID.

## Step 28: Log the Push
- [ ] Append to `runtime-artifacts/audit.md`: that the push ran automatically after story generation, the Organization and Project (and how they were resolved), the Parent Epic ID, the created work item IDs, the transitions applied, and the story→Epic links, with timestamps.
- [ ] **No further confirmation is asked** — the Story Set Approval already authorised the push. Everything created is still verified after the fact (Steps 26/26a/26b) and any failure STOPS the run and is reported.

---

# CRITICAL RULES

## Planning Phase Rules
- **CONTEXT-APPROPRIATE QUESTIONS**: Only ask questions relevant to this specific context
- **MANDATORY ANSWER ANALYSIS**: Always analyze answers for ambiguities before proceeding
- **NO PROCEEDING WITH AMBIGUITY**: Must resolve all vague answers before generation
- **PLAN HAS NO GATE, STORY SET DOES**: the story plan is auto-approved and announced (Step 12) — nothing waits for a user approval there. The generated story set is DIFFERENT: it carries a mandatory approval gate, the Story Set Approval (Steps 19–22) — the workflow HALTS after the Step 20 announcement until the user responds "Approve & Continue" or "Request Changes"
- **POD SIZE ASKED ONCE**: `team_size` comes from the Step 1 question — asked once per project, reused everywhere, never re-asked on resume
- **NO CREATION-MODE QUESTION**: `story_creation_mode` is the fixed default `all-at-once` (Step 14.5) — never ask it, never generate stories one at a time
- **SLICE BEFORE DRAFTING**: apply the Step 1.5 SPIDR slicing rules to every capability before the plan is written — granularity is designed in up front, not patched on after generation

## Generation Phase Rules
- **NO HARDCODED LOGIC**: Only execute what's written in the story generation plan
- **FOLLOW PLAN EXACTLY**: Do not deviate from the step sequence
- **UPDATE CHECKBOXES**: Mark [x] immediately after completing each step
- **USE APPROVED METHODOLOGY**: Follow the story approach from Planning
- **VERIFY COMPLETION**: Ensure all story artifacts are complete before proceeding
- **ENFORCE SIZING CEILINGS**: no story may exceed the Step 1.5 hard sizing ceilings — the Step 18.6 granularity check MUST split any violator before the story set is announced
- **DECLARE TOUCHES**: every story carries a `**Touches**:` line, and shared mechanical edits go to one foundation story (Step 16 — R6 in `planning/dependency-graph-generation.md`)

## Completion Criteria
- All planning questions answered and ambiguities resolved
- `team_size: N` recorded from the user's Step 1 answer, and `story_creation_mode: all-at-once` recorded without being asked
- Every story carries a `**Touches**:` line (R6)
- Story plan finalized, auto-approved and announced (Step 12) — no user approval required for the plan
- Every story carries a non-empty `**Covers**:` line; the Requirements Coverage Matrix in stories.md shows EVERY REQ-ID from requirements.md fully covered (Step 18.5 passed)
- All stories generated together in a single pass; the complete set announced (Steps 19–20) and explicitly approved by the user at the Story Set Approval (Steps 21–22), with the approval response logged in runtime-artifacts/audit.md
- All steps in story generation plan marked [x]
- All story artifacts generated according to plan (stories.md, personas.md)
- Every story passes the Step 1.5 hard sizing ceilings (Step 18.6 granularity check passed — 0 outstanding violations)
- Stories pushed to Azure DevOps Boards only after the Story Set Approval (work items created, moved to `ToDo`, linked to the Parent Epic, IDs written back) — verified, with no separate push/project/work-item-type questions asked (the Story Set Approval already covered that decision)
- Stories verified and ready for next stage
