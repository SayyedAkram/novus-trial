# aire Welcome Message

**Purpose**: This file contains the user-facing welcome message that should be displayed ONCE at the start of any aire workflow.

---

# Welcome to HelixAI-AIRE 


I'll guide you through an adaptive software development workflow that intelligently tailors itself to your specific needs.

## What is HelixAI-AIRE?

HelixAI-AIRE is a structured yet flexible software development process that adapts to your project's needs. Think of it as having an experienced software architect who:

- **Analyzes your requirements** and asks clarifying questions when needed
- **Plans the optimal approach** based on complexity and risk
- **Skips unnecessary steps** for simple changes while providing comprehensive coverage for complex projects
- **Documents everything** so you have a complete record of decisions and rationale
- **Guides you through each phase** with clear checkpoints and approval gates

## The Two-Phase Lifecycle

```
                         User Request
                              |
                              v
        +---------------------------------------+
        |     PLANNING PHASE                    |
        |     Planning & Application Design     |
        +---------------------------------------+
        | * Workspace Detection (ALWAYS)        |
        | * Reverse Engineering (COND)          |
        | * Requirements Analysis (ALWAYS)      |
        | * User Stories (ALWAYS, all at once   |
        |   + Story Set Approval, then auto     |
        |   push to tracker)                    |
        | * Dependency Graph (ALWAYS, requires) |
        | * Workflow Planning (ALWAYS)          |
        | * Application Design (CONDITIONAL)    |
        +---------------------------------------+
                              |
                              v
        +---------------------------------------+
        |     IMPLEMENTATION PHASE              |
        |     Design & Implementation           |
        +---------------------------------------+
        | * System-Level DESIGN stages:         |
        |   - Functional Design (COND)          |
        |   - NFR Requirements Assess (COND)    |
        |   - NFR Design (COND)                 |
        |   - Infrastructure Design (COND)      |
        | * Test Plans                          |
        |   (every story, 1 approval)           |
        | * >> STOP << (before code gen)        |
        | * Code Generation (per-story, via     |
        |   `dev-implement`), unit tests 90%+   |
        | * Code + Security Review, Remediate,  |
        |   PR + PR review (automatic)          |
        +---------------------------------------+
              |                    |
              |                    +----------------------+
              |                                           |
              |                            +---------------------------------------+
              |                            | Verification Engineer track (parallel)|
              |                            +---------------------------------------+
              |                            | * Test plans for every story,         |
              |                            |   written at the STOP checkpoint,     |
              |                            |   before any code exists              |
              |                            | * The Verification Engineer runs them |
              |                            |   once a story is In Testing;         |
              |                            |   `ve-list-work` closes it or sends   |
              |                            |   it to Bug fixing                    |
              |                            +---------------------------------------+
              v
                          Complete
```

### Phase Breakdown:

**PLANNING PHASE** - *Planning & Application Design*
- **Purpose**: Determines WHAT to build and WHY
- **Activities**: Understanding requirements, analyzing existing code (if any), planning the approach
- **Output**: Clear requirements, execution plan, a Story Tracker, a story breakdown with dependencies mapped so independent stories can be developed in parallel (stories pushed to Azure DevOps Boards and linked to your existing Parent Epic)
- **Your Role**: Answer the clarifying questions, review and approve the generated story set (the Story Set Approval) before it is pushed


**IMPLEMENTATION PHASE** - *Detailed Design & Implementation*
- **Purpose**: Determines HOW to build it
- **Activities**: System-level detailed design (when needed); then every story's manual test plan is written in ONE pass — before any code exists — and published to the development branch under `test-plans/` in its own `[TEST]` PR; then — after a mandatory STOP — per-story code generation that you trigger with the `dev-implement` keyword (on a story branch cut from the development branch, with unit tests generated and run to 90% coverage on changed lines plus a full regression), an automatic code review with the security review, remediation of its findings, the PR and an automatic PR review
- **Output**: Approved manual test plans for every story, then working code, unit tests and their evidence, review reports and a PR per story
- **Your Role**: Review designs, approve the test plans, type `dev-implement` to build each story, then get each story's PR its two approvals and merge it into the development branch (approval and merge are manual); once it is deployed to DEV, move the story to Ready for Testing on the board

**Verification Engineer TRACK** - *Test Plan, in parallel with development*
- **Purpose**: Proves each story meets its acceptance criteria
- **Sign-off is not a Implementation stage** — neither at epic level nor at story level. Verification Engineer drives it independently and can start immediately, without waiting for any code. The plans themselves are already written at the STOP checkpoint, so Verification Engineer can review them before a line of code exists
- **Activities**: every story's Test Plan artifacts — manual test steps for every applicable test plan (integration, E2E, API, contract, security, performance, accessibility — whichever apply; there is no build-verification artifact), derived from the acceptance criteria, never from source code — are already in the cycle's folder under `test-plans/` on the development branch (one folder per cycle, so parallel epics never conflict). Once a story's code is generated and on the branch, Verification Engineer executes them. `ve-list-work` (on the cycle's integration branch — epic, bug, or enhancement) reports which stories/tickets are In Testing and closes the ones the Verification Engineer has passed, or sends a rejected one to Bug fixing
- **Your Role (as Verification Engineer)**: review the plans already on the branch, execute the test steps, then `ve-list-work` to sign off

## Key Principles:

- **Fully Adaptive**: Each stage independently evaluated based on your needs
- **Efficient**: Simple changes execute only essential stages
- **Comprehensive**: Complex changes get full treatment with all safeguards
- **Transparent**: You see the execution plan before work begins, and can add or remove stages at any time
- **Documented**: Complete audit trail of all decisions and changes
- **User Control**: You can request stages be included or excluded

## What Happens Next:

1. **I'll check for an existing aire project and connect to your Azure DevOps project** — the board where every story, bug, and enhancement is tracked.
2. **I'll capture your Parent Epic** (if you gave one) and analyze your workspace to understand if this is a new or existing project — pulling existing-system truth from Atlas via Helix when it is needed — then create the Epic branch that holds the cycle's documents
3. **I'll ask about context-project artifacts and reference materials** — human-authored notes on how your current system works (under `spec/context-project/existing-knowledge/`), UX wireframes, design mockups, API specs or other docs that define the target state (under `spec/context-project/new-references/`), and your team's coding guidelines as `.md` files (under `spec/context-project/coding-guidelines/` — all generated code follows them)
4. **I'll gather requirements** and ask clarifying questions if needed
5. **I'll show an execution plan** and run it, with your approval at each major stage (you can add or remove stages any time)
6. **You'll get working code** with complete documentation and tests

The aire process adapts to:
- Your intent clarity and complexity
- Existing codebase state
- Scope and impact of changes
- Risk and quality requirements

Let's begin!
