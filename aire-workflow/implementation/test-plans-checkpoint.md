# Test Plans (STOP CHECKPOINT — every story, before any code)

**Purpose**: author the manual test plan (`test-plans/<cycle>/<TICKET-ID>-<title>/`, on the Base
Branch — `common/branching-strategy.md` Section 7) for **EVERY
story of the cycle** while the design is still on the table — **before a single line of code is
generated** — then publish the whole set for the Verification Engineer to review: an epic cycle in its
`[TEST]` PR, a bug or enhancement cycle on its cycle branch. Nothing waits on a reply.

**When it runs** — at the STOP CHECKPOINT, after `architecture.md` and before the design commit and
the Development Handoff:

| Cycle | Invoked from | Scope |
|---|---|---|
| Epic | `CLAUDE.md` MANDATORY STOP **Step 1.2** | EVERY story in the `## Story Tracker` |
| Bug | `workflows/bug-fix.md` **Step 8.5** | the cycle's single story (`bug-<TICKET-ID>`) |
| Enhancement | `workflows/enhancement-implement.md` **Step 8.5** | the cycle's single story (`enhancement-<TICKET-ID>`) |

**Load this file when**: executing that step, or when an implement workflow needs the backfill rule
(Section 5) because a story's test plan is missing.

---

## 0. First — UI/UX Mockups (only when enabled)

If `## Extension Configuration` records `UI/UX Mockups` = Yes, run
`extensions/design/ui-ux/ui-ux-mockups.md` in full now, before writing any test plan, and continue
with Section 2 only after that stage has returned. In `generate` and `figma` modes, that means after
the user has approved the mockups or the Figma design page. A missing row, or `No`, means skip this
section silently. Log the skip.

This order lets the test plans use the screen names, labels and messages in the approved mockups. The
mockups under `spec/plans/ui-ux/` (or, in the Figma modes, `ui-ux-design.md` with its frame links)
ride the same design commit as the test plans.

---

## 1. Why the test plans are written here

A manual test plan is what the Verification Engineer executes once a story's code is on the
integration branch. It is derived from the acceptance criteria and the approved design — never from
the implementation — so it is knowable the moment the design stages close.

Writing them here buys three things:

1. **The Verification Engineer can review every plan before the code is written** — the plans are
   pushed the moment they are written (Section 3.2).
2. **Changes have one path**: `ve-list-work` Option C, which updates the plan on the branch it lives
   on, and with it the PR that carries it.
3. **One coherent pass over the whole cycle.** Gaps in the acceptance criteria across stories surface
   while every story is in view.

**This stage is NOT Verification Engineer sign-off.** `ve-list-work` Option B remains the only
sign-off path.

---

## 2. Writing the test plans — INVOKE `ve-implement` in WORKFLOW MODE

**Never re-implement the skill.** The mechanics live in ONE place
(`agents/ve-implement-agent.md` + `implementation/test-plan.md`).

**Epic cycle — open the test-plan worktree first** (`common/branching-strategy.md` Section 7.2 items
1–2), before the first plan is written, so every plan lands in
`.aire-test-plans/test-plans/<cycle>/`. Bug and enhancement cycles write on the cycle branch itself.

For each story in scope, invoke the skill (Skill tool) with that story/ticket and
`mode: workflow`. Per its Mode Detection table that run:

- takes the story as given — its story-picker is never presented,
- **cuts no `ve/…` branch, pushes nothing, raises no PR** — the generated files stay where they
  were written and are published by this stage (Section 4),
- auto-confirms `implementation/test-plan.md` Step 2's applicability table (announced, not asked) and
  skips its Step 6 Approve/Request-Changes checkpoint — the Verification Engineer reviews the
  published plans instead (Section 3),
- still writes the story's test-plan folder (`common/branching-strategy.md` Section 7.1) and its
  `runtime-artifacts/audit.md` entry exactly as usual, stamped
  `Mode: workflow (invoked by the STOP CHECKPOINT test-plans stage) — no Verification Engineer approval, no Verification Engineer branch, no Verification Engineer PR`.

**Already present** → reuse as-is and say so; never overwrite a folder the Verification Engineer
already produced.

**Inputs** the skill reads: the tracker item and `spec/plans/stories.md` for acceptance criteria,
`spec/plans/requirements.md`, `spec/plans/architecture.md` and the approved design artifacts under
`spec/plans/` — plus, when Section 0 ran, the approved mockups for screen names, labels and messages.

Every rule of `implementation/test-plan.md` still binds — black-box derivation from acceptance
criteria, the `TC-[PLAN]-[nn]` format, the System Under Test precondition block, and the blocking
AC-coverage check. Skipping an approval never skips a check.

---

## 3. Coverage check, publish, and the Verification Engineer message

### 3.1 Blocking coverage check — runs BEFORE anything is published

Silent, automatic, and blocking — no user prompt:

1. **Every acceptance criterion of every in-scope story has ≥1 manual test case tracing to it**
   (`implementation/test-plan.md` Step 5's coverage table). A gap is fixed by extending the plan, then
   re-checking.
2. **Every story in scope has its test-plan folder.** A story with acceptance criteria is never
   `N/A`.

Nothing is published until both hold.

### 3.2 Publish — automatic, asks nothing

- **Epic cycle**: `common/branching-strategy.md` Section 7.2 items 4–6 from the worktree opened in
  Section 2 — push `test-plans/<cycle>` and raise the `[TEST]` PR into the Base Branch (or update the
  open one). This runs now, before the design commit.
- **Bug or enhancement cycle**: the plan rides the cycle branch's commit and push in the calling
  workflow's next step (`bug-fix.md` Step 9 / `enhancement-implement.md` HANDOFF BREAK, Item 1), whose
  message carries the Verification Engineer text.

### 3.3 The message (epic cycle) — print it, then continue the STOP CHECKPOINT

```markdown
# Test Plans Raised for the Verification Engineer

 Manual test plans: [N] folder(s) in `[Test Plan Folder]` — [T] test cases
 AC coverage: [A]/[A] acceptance criteria have at least one test case
 [TEST] PR: [PR URL] — `[test-plan branch]` into `[base-branch]`

> **Verification Engineer** — review the test plans in the [TEST] PR.
> Changes needed? Run `/ve-list-work` and pick **C**: it updates the test plan on
> `[test-plan branch]` and the open [TEST] PR (or raises the next [TEST] PR if this one has merged).
```

Nothing waits on a reply. Log the message in `runtime-artifacts/audit.md`.

---

## 4. Where the artifacts go, and when they are committed

The test plans live on the Base Branch, in the cycle's own Test Plan Folder
(`common/branching-strategy.md` Section 7). They never ride the epic branch.

- **Epic cycle** — published at Section 3.2, before the design commit: one `[TEST]` PR into the Base
  Branch carrying only `test-plans/<cycle>/`. That push is what unblocks the Verification Engineer,
  who reads the plans from that branch until the PR merges (Section 7.3).
- **Bug or enhancement cycle** — the plan is committed on the cycle branch with the rest of the STOP
  CHECKPOINT artifacts (the commit step in `bug-fix.md` / `enhancement-implement.md`) and reaches the
  Base Branch with the `[BUG]`/`[ENH]` PR (Section 7.4).

```text
test-plans/
└── 4800-payment-portal/          # the cycle's Test Plan Folder (bug/enh: the ticket's own folder)
    └── 4821-user-can-reset-password/
        ├── test-plan-summary.md
        └── <plan>-test-steps.md
```

---

## 5. Downstream — the implement workflows VERIFY, they do not author

`dev-implement`, `bug-fix-implement` and `enhancement-implement` read these plans in their test
plan check (`implementation/code-generation.md` Step 11d):

1. **Verify the plan exists** for this story, and announce it —
   ` Test plan: <story's test-plan folder> — written at the STOP CHECKPOINT.` Read it
   per `common/branching-strategy.md` Section 7.3.
2. **BACKFILL — only when the plan is genuinely absent** (a story added after the STOP CHECKPOINT,
   or an interrupted run): invoke `ve-implement` in WORKFLOW MODE now, per Section 2 — on an epic
   cycle inside the test-plan worktree, then publish it with Section 7.2 — **announce the backfill
   explicitly**, log it in `runtime-artifacts/audit.md` with the reason, and continue.
3. **Never overwrite or rewrite an existing plan** to match code that was written later.

A missing plan is never a reason to halt a story.

---

## 6. State and audit

Record in `runtime-artifacts/aire-state.md`:

```markdown
## Test Plans
- **Stories covered**: [N]
- **Manual test plans**: [Test Plan Folder] — [N] folder(s), [T] test cases
- **Test Plan PR**: [URL] (epic cycle; bug/enh: rides the [BUG]/[ENH] PR)
- **AC coverage**: [A]/[A]
- **Published**: [ISO 8601 timestamp]
```

Log in `runtime-artifacts/audit.md`, per `common/audit-logging.md`: the stage entry, every
`ve-implement` WORKFLOW MODE invocation, the coverage-check outcome, the push and PR, and the
Section 3.3 message.

---

## Critical Rules

- **Every story gets its manual test plan before any code.** A story with acceptance criteria is
  never `N/A`.
- **UI/UX Mockups run first when enabled** (Section 0). No test plan is written while generated
  mockups are still awaiting approval.
- **Written, checked, published — never held for a reply.** The coverage check is the only step
  between writing and publishing. Review happens in the `[TEST]` PR or on the cycle branch; changes go
  through `ve-list-work` Option C.
- **INVOKE the `ve-implement` skill in WORKFLOW MODE** — never re-implemented inline, and never
  presented afterwards as Verification Engineer sign-off.
- **The implement workflows VERIFY these plans; they never regenerate them.** Backfill only a
  genuinely absent plan, announced and logged.
- **The plans go to the Base Branch, never the epic branch** — an epic cycle's `[TEST]` PR, raised
  as soon as the plans are written, or a bug/enhancement cycle's own `[BUG]`/`[ENH]` PR
  (`common/branching-strategy.md` Section 7). The Verification Engineer cannot start until that push
  lands on origin.
