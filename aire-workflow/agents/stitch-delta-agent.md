# Stitch Delta Agent — Refresh the Atlas Deep Dive to the Current Face of the Application

**Role**: you are a release librarian. Code has merged into base — one story, or a whole cycle.
Your job is to make the deep dive document on Atlas describe the application as it is now —
completely, with no content left over from before that merge — and to record that you did.

**When this runs**: on the base branch, after a merge, in one of two kinds of run (one run handles
whatever of both is pending, in one pass):

| Run | After | Reads | Writes |
|---|---|---|---|
| **Story stitch** | every `[STORY]` PR merged into base | the merged tree — no delta exists yet | Atlas only, plus the `Synced to` header line (Step 4.6). No ledger row, no PR. Audit: the story's own fragment (Step 7) |
| **Cycle stitch** | the cycle's `[EPIC]`, `[BUG]` or `[ENH]` PR | the cycle's archived delta and the merged tree | Atlas, one ledger row per delta, a `[STITCH]` PR |

That timing is what makes the refresh possible: the merged code is right there in the working tree to
ground every factual section against. An epic's code reaches base story by story, so stitching each
story keeps the deep dive current while the epic is still open — an epic started or running in
parallel never designs against code the deep dive is missing. The `[EPIC]` PR carries only the archive
and is raised once every story is `Closed`; its cycle stitch publishes the delta and writes the ledger
row.

**THE DELIVERABLE IS A WHOLLY CURRENT DOCUMENT, NOT A SET OF EDITS.** A deep dive is a full system
analysis — directory structure, statistics, entry points, component catalog, flows, dependency graph,
database, test coverage, security posture, technical debt, file inventory. A real cycle invalidates
most of it at once. Every section that is no longer true MUST be brought current in this run, whether
or not the cycle's `delta.md` happened to name it. A document that is 90% current is a document nobody
can trust, because no reader can tell which 10% is stale.

**This supersedes the earlier "apply only the delta's directives, never widen scope" rule.** That rule
produced exactly the failure this file now exists to prevent: an epic added `src/organization/`,
`src/team/`, `src/admin/` and `scripts/seed.ts`, the delta named seven sections, and `### Directory
Structure` — along with Statistics, Entry Points, the Component Catalog and the File Inventory — was
knowingly left describing a codebase that no longer existed. **Widening is now REQUIRED wherever a
section is stale.** The delta tells you what the cycle intended and why; the merged code tells you what
is true; the document must end up matching the code.

---

## Why this shape — read before changing anything here

| Property | Why it holds |
|---|---|
| **The document ends current** | Every section is checked against the merged code, not against the delta's coverage. The delta cannot cause a silent gap, because it is not the scope boundary. |
| **Nothing can conflict in git** | Base has no `spec/` after a cycle closes, and this agent's entire repository footprint is one appended ledger row plus archived audit entries — and, for a story stitch, one entry in that story's own fragment on its epic branch. |
| **The delta cannot be lost** | It lives in the immutable cycle archive, not a working tree that gets reset. |
| **A delta cannot be applied twice** | Two independent guards — the ledger row and the stitch marker in the document itself (Step 2.2). |

---

## Step 0: Load the Source Rules

**MANDATORY** — read these before doing anything:
- `common/helix-atlas-integration.md` — resolving the Helix MCP provider and the Atlas document, and
  the provenance rules that apply in the write direction
- `agents/archive-epic-agent.md` Step 3 — the delta schema: what `delta.md` records about the cycle
- `common/content-validation.md` — validation for the document you write back
- `common/audit-logging.md` — this run's entries and its timestamp rule

---

## Step 1: Preconditions

1. **Resolve the base branch.** `runtime-artifacts/aire-state.md` is not on base — it lives on the
   cycle's branch, and a closed cycle archived it. Resolve in order, announcing which was used:
   1. The `Base Branch` in `## Branching` of every open epic branch
      (`git show origin/<epic-branch>:runtime-artifacts/aire-state.md` for each `origin/epic/*`).
   2. The `Base Branch` recorded in the most recent archive's
      `aire-archives/<type>/<ID>-<slug>/runtime-artifacts/aire-state.md`.
   3. The repository's default branch (`common/repo-host.md` RH-10 — the host is detected from `origin`
      per its Section 1).
   4. Ask the user, naming what you found — also when the recorded values disagree.
2. **Be on it, and be current**:
   ```bash
   git fetch origin && git checkout <base-branch> && git pull --ff-only
   ```
   Dirty tree → STOP and show `git status`. Never stash or discard the user's work.
   The working tree must be the merged post-cycle state — that is the ground truth Step 4 reads.
3. **Verify each candidate cycle actually merged** (`common/repo-host.md` RH-2 — state MERGED into
   base — or the merge commit in `git log`). An unmerged cycle is skipped, not stitched — publishing an
   analysis of code that is not on base is the one failure this precondition prevents. The same holds
   for a story: only a `[STORY]` PR MERGED into base counts (Step 3 item 6).
   - **`custom-branching-strategy`**: if the cycle PR targeted an intermediate branch (`dev`, `qa`,
     `preprod`), this agent still runs on base only, once the code has landed there.
4. **ONE STITCH RUN AT A TIME — refuse to start while a `stitch-delta/*` PR is open.**
   List the open PRs whose source branch starts with `stitch-delta/` (`common/repo-host.md` RH-1, by
   branch prefix).
   Its ledger rows are not on base until it merges, so a second run would re-discover those deltas as
   pending. One or more open → STOP with nothing written:
   ```
    A stitch-delta PR is already open and unmerged:
      • <url> — <title>

   Its ledger rows are not on <base-branch> yet, so this run would re-discover those deltas as
   pending. Merge (or close) that PR, pull <base-branch>, then re-run /stitch-delta.
   ```

**No open-CYCLE-branch check is needed** — this run touches no `spec/` path.

---

## Step 2: Discover Pending Deltas

### 2.1 The ledger

**`aire-archives/stitch-ledger.md`** — the record of what has been published. Written by **this agent
alone**, strictly **append-only**: one row per successful refresh, appended after the Atlas write
verifies. Rows are never edited, re-ordered or removed.

```markdown
# Stitch Ledger — cycle deltas published to the Atlas deep dive
<!-- Append-only. One row per stitched delta, written by stitch-delta after the Atlas write verifies. -->

| Cycle | Ticket | Delta Folder | Stitched At | Commit Range | Atlas Doc | Atlas Version | Sections Updated |
|---|---|---|---|---|---|---|---|
| epic | 4800 | 4800-payment-portal | 2026-01-14T09:22:11Z | a1b2c3d..e4f5a6b | 3509 | 15 | 23 of 80 (full-document refresh) |
```

- **`Delta Folder` is the idempotency key** — `<CYCLE-ID>-<slug>`, unique per cycle.
- **There is no "pending" row.** A delta is pending precisely because it has no row. Absence is
  the signal, which keeps every write a pure append.
- **No `merge=union`.** The ledger deliberately has no `merge=union` entry in `.gitattributes`: this
  agent is its only writer, on base, one run at a time (Step 1 item 4), so a merge conflict on it means
  that serialization broke, and it must surface rather than be merged away.
- An older ledger with pending rows or different columns: migrate in place once, keeping every row
  that records a real stitch and dropping `Stitched At: —` rows (they re-derive as pending).

### 2.2 Two independent guards against a double refresh

1. **Ledger row present** → already published. Skip.
2. **Stitch marker present** → the document header carries one `> **Stitched**: <CYCLE-ID> at <ts>` line
   per published cycle (Step 4.6). Marker in the Atlas body but no ledger row = the write landed and
   the ledger write did not. Do NOT refresh again. Write the missing row from the marker's
   timestamp and the document's current version, announce the self-heal, move on.

Check guard 2 against the live Atlas body, not a cached read — it is the only guard that survives
a lost or reverted ledger.

### 2.3 Discovery

1. Glob archived deltas: `ls -d aire-archives/*/*/spec/plans/delta/*/ 2>/dev/null`
2. Drop any with a ledger row (guard 1); drop any whose cycle PR is not merged (Step 1.3).
3. **Order by merge order** — the `**Archived**:` timestamp in each archive's `archive-manifest.md`,
   falling back to the cycle's merge-commit date. Oldest first.
4. **Several pending deltas → ONE refresh pass, not N.** Read them all, then perform a single
   full-document refresh reflecting the cumulative current state, and append one ledger row per delta
   (all naming the same resulting Atlas version). Refreshing serially would re-analyse the same merged
   tree several times and produce identical output each time.
5. Nothing pending → report and STOP, once Step 3 item 6 has also found no pending story merge (it needs the
   document's `Synced to` line). A normal outcome:
   ```
    Nothing to stitch — every archived delta already has a row in
      aire-archives/stitch-ledger.md, and every story merged into <base-branch> is already
      in the deep dive. The Atlas deep dive is up to date.
   ```
6. **Code that never reached base**: read each pending delta's archive manifest. A
   `**Not on Base Branch**:` line (`agents/archive-epic-agent.md` Step 5.4) names stories whose code
   was not on base when the cycle closed. Carry the list to the completion message, the PR body and the
   audit — the refresh cannot describe that code, and the reader must be told.

---

## Step 3: Resolve the Atlas Deep-Dive Document

Resolve the Helix MCP provider per `common/helix-atlas-integration.md` Section 3 (runtime discovery —
never hardcode tool names), then:

1. List the solution documents available to this session (the Helix DOCS listing tool).
2. **Match the deep dive for this estate** — the archived `spec/plans/atlas-deep-dive.md` (a story
   stitch with no archive yet: the open epic branch's copy,
   `git show origin/<epic-branch>:spec/plans/atlas-deep-dive.md`) opens with the provenance block naming
   the server, estate and document it was pulled from. Use that first, then a
   title containing "Deep Dive" (document type is not checked — `common/helix-atlas-integration.md`
   Section 5.4).
3. **Exactly one match** → bind it; record `document_id` and `version`.
4. **Several plausible matches** → ask which one, listing what you found. Writing an estate's analysis
   into the wrong org document is worse than one question.
5. **No provider, or no deep-dive document** → HALT, nothing written:
   ```
    HELIX MCP REQUIRED — cannot publish the refresh

      <n> delta(s), and any story merged since the last stitch, are pending, but [no Helix MCP
      server is connected in this session | Atlas has no deep dive document for this estate].

      Nothing was written. The deltas stay in their archives and stay pending, so this run
      repeats as-is once Helix is connected.

    Connect Helix (or generate the deep dive on Atlas), then re-run /stitch-delta on <base-branch>.
   ```
6. **Pending story merges** — read the document header's `> **Synced to**: <base-branch> @ <sha>` line
   (Step 4.6): the commit the deep dive last described. Missing (a document stitched before this line
   existed) → the newest `Stitched` marker's head sha; neither → every merged `[STORY]` PR of a cycle with
   no ledger row is pending. Otherwise a story is pending when its `[STORY]` PR merged into
   `<base-branch>` (`common/repo-host.md` RH-1 by target branch, all states, title prefix `[STORY]`) and
   its merge commit (RH-2) is not yet in the synced commit:
   ```bash
   git merge-base --is-ancestor <merge-sha> <synced-sha> || echo pending
   ```
   A story PR merged into any other branch is not pending — its code is not on base. Pending stories
   join the same one refresh pass as any pending delta.

---

## Step 4: FULL-DOCUMENT REFRESH — every section, grounded in the merged code

This is the heart of the run. The output is a complete replacement body for the Atlas document that
describes the application as it exists on base right now.

### 4.1 Read the three inputs

| Input | Role |
|---|---|
| **The live Atlas document** (full view) | The current published text. Its **outline is the section contract** — you refresh in place, you do not restructure. Record its `version`. |
| **Every pending `delta.md`** | What each cycle intended to change, and why — the narrative and the traceability (commit ranges, tickets). |
| **Every pending story merge** (Step 3 item 6) | The story's PR — title, changed files (`common/repo-host.md` RH-6) and merge commit. A story has no delta yet; the merged tree carries the whole weight. |
| **The merged working tree on base** | **The ground truth.** Every factual claim in the refreshed document is verified against the real code, not against the delta's description of it. |

### 4.2 Enumerate the document's own sections — this is the coverage checklist

Read the document's outline (headings-only view) and build the full list. A deep dive typically runs
60–90 headings across areas like: Executive Summary · System Overview · Complexity Assessment · Critical
Findings · Risk Assessment · Directory Structure · Technology Stack · **Comprehensive
Statistics** · Entry Points · Architectural Style & Patterns · Architecture Diagrams · **Component
Catalog** · Flow Analysis (one per flow) · Internal/External Dependencies · Coupling Metrics ·
Circular Dependencies · Database Analysis · Quality Assessment · Complexity Metrics · Code
Duplication · Code Smells · Technical Debt · Test Coverage · Testing Gaps · Security
(per concern) · Performance · Documentation Audit · Recommendations · Getting Started · Quick
Reference · Appendices (File Inventory, Dependency List, Metrics, Diagrams) · Referenced Paths.

**The checklist is the document's ACTUAL outline, never this illustrative list.** Read it.

### 4.3 Decide every section against the code — three outcomes, no fourth

For every heading in that checklist:

| Outcome | When | What you do |
|---|---|---|
| **REFRESH** | The section makes a factual claim the merged code no longer supports | Rewrite it from the real tree. |
| **KEEP** | Re-verified against the code and still accurate | Leave byte-identical. |
| **REMOVE/RESOLVE** | It describes something that no longer exists (a resolved anti-pattern, a deleted module, a closed debt item) | Update or strike it, noting the cycle that resolved it. |

**"Not named in the delta" is NOT a reason to KEEP.** KEEP requires positive re-verification against
the code. The observed failure was exactly this: a section left alone because no directive pointed at it.

**Sections that are almost always stale after a real cycle** — check these explicitly, every run:
Directory Structure · Comprehensive Statistics (file/LOC counts) · Entry Points · Component Catalog ·
Internal Dependencies + Coupling · Database Analysis (schema changes) · Test Coverage · Appendix file
inventory · Appendix dependency list · Referenced Paths.

### 4.4 Grounding commands — read the real tree, do not infer

Derive facts from the repository, not from the delta's prose. Adapt to the stack:

```bash
git diff --name-status <base-sha>..<head-sha>      # what the cycle actually changed (story run: <synced-sha>..<head-sha>)
git ls-files | sed 's#/[^/]*$##' | sort -u         # real directory structure
git ls-files | wc -l                                # real file count
cat package.json requirements.txt pom.xml go.mod 2>/dev/null   # real dependency set
```

**Every number in the refreshed document is measured, never carried forward and never estimated.**
A stale statistic is indistinguishable from a fabricated one to a reader.

### 4.5 Preserve what is not yours to change

- **Structure**: same headings, same order, same depth. Refresh *content*; do not restructure the
  analysis. If the cycle genuinely introduces a new area (a new flow, a new service), add a section in
  the matching pattern and say so in the ledger's `Sections Updated`.
- **Human-authored commentary** that remains true — judgement calls, rationale, recommendations still
  open — is preserved verbatim.
- **Title and metadata** are unchanged. The header's `**Status:**` / `**Steps Completed:**` line stays as
  the document defines it.
- **`## Referenced Paths` is MANDATORY and must end the document** (High / Medium / Low relevance) —
  the Helix save contract requires it for markdown. Regenerate it from the files this refresh actually
  examined; never drop it and never leave it stale.

### 4.6 Write the header provenance

Add to the document header, one line per published cycle (cumulative — never replace prior lines):

```
> **Stitched**: <CYCLE-ID> at <ISO 8601 timestamp> · commit <base-sha>..<head-sha>
```

Guard 2 reads these. A refresh published without its marker is invisible to the recovery path.

**Every run** — story or cycle — also sets exactly one line, replacing its previous value:

```
> **Synced to**: <base-branch> @ <head-sha> at <ISO 8601 timestamp>
```

It names the commit the document now describes. Step 3 item 6 and the next cycle's Workspace Detection
(`planning/workspace-detection.md` Step 3) read it to find story merges the document is still missing.
A story stitch adds no `Stitched` line — the `Synced to` line is its record on Atlas.

### 4.7 Publish

1. **Re-read the document's `version`** immediately before writing. If it moved since Step 4.1, someone
   edited it on Atlas meanwhile: re-read the body, redo the 4.3 pass against it, and write from that —
   never blind-overwrite a newer version.
2. **Write the complete refreshed body back to the same `document_id`** using the Helix full-replace
   document tool. A whole-document refresh is a whole-document write; a per-section edit tool is the
   wrong instrument when most of the document moved.
3. **Verify**: re-read the document and confirm the refreshed sections are present, the outline is
   unchanged in structure, `## Referenced Paths` closes it, and every stitch marker is there. Record the
   new `version`.
4. **On a failed or partial write**: STOP. Report what landed, write no ledger row (the delta stays
   pending, so the re-run is safe and idempotent), and do not continue.

**Never publish a refresh you could not verify**, and never "tidy" beyond bringing content current —
a refresh is an accuracy operation, not an editorial one.

---

## Step 5: Append the Ledger Row(s)

**A story-only run appends nothing** — the ledger records cycle deltas only; go to Step 7.

Immediately after the Atlas write verifies, append one row per published delta: cycle type, ticket,
delta folder, an ISO 8601 timestamp from a real clock (`common/audit-logging.md` Section 2), the commit
range, the `document_id`, the new `version`, and a `Sections Updated` count (`23 of 80`).

**Append only** — never rewrite, re-sort, or edit a row. Write them immediately, never batched into
a later step, so a crash leaves the ledger truthful.

---

## Step 6: Commit and Raise the PR — never directly to base

This run's whole repository diff is the appended ledger row(s) plus the archived audit entries. **A
story-only run has no base diff** — no branch, no commit, no PR; skip this step.

1. `git checkout -b stitch-delta/<name>` — `<name>` = the ticket ID, or `-`-joined IDs when several were
   published together. Announce it; do not ask.
2. **Stage exactly** `aire-archives/stitch-ledger.md` and the archived `audit.md` files you appended.
   Anything else in `git status` → stop and investigate.
3. **Commit**, with the `AIRE-Version:` trailer read live from `CLAUDE.md` — never hardcoded:
   ```
   docs: refresh Atlas deep dive for <CYCLE-ID(s)>

   AIRE-Version: [N]
   ```
4. **Push and raise the PR** into base — title `[STITCH] <CYCLE-ID(s)> — Atlas deep dive refreshed`,
   labels `ai-generated` and `aire-anx-v[N]`. The body states the `document_id`, the new `version`,
   how many sections were refreshed versus kept, the commit range, the archive(s) read, any story
   merges included, and any story named `Not on Base Branch` (Step 2.3 item 6).
5. **On a race-rejected push**: fetch, rebase the stitch branch onto base, re-read the ledger, drop any
   delta published meanwhile, retry with `--force-with-lease` on the stitch branch only. Never
   force-push base.

---

## Step 7: Audit Logging

`runtime-artifacts/audit.md` does not exist here. Append to each published cycle's archived copy at
`aire-archives/<type>/<CYCLE-ID>-<slug>/runtime-artifacts/audit.md`. Each stitched story gets its
entry in its own fragment, `runtime-artifacts/stories/<story-key>/audit.md` on its epic branch: find the
branch whose fragment records the PR URL
(`git grep -l "<PR URL>" <each origin/epic/* ref> -- runtime-artifacts/stories/`), open it as the docs
worktree (`common/branching-strategy.md` Section 4 item 1), append, commit and push (item 3), and
close it (item 6). A story whose cycle is already archived → that archive's `audit.md`, in the stitch PR.
Every entry carries
`**User Email**:`, an ISO 8601 timestamp from a real clock, and: the sections refreshed / kept /
resolved with the reason per section, the grounding commands run, the `document_id` and resulting
`version`, and the raw text of any user answer (Step 3.4).

---

## Step 8: Completion Message

```markdown
# Atlas Deep Dive Refreshed

- **Published**: [N] delta(s) — [CYCLE-ID list] · [S] story merge(s) — [Story / PR list]
- **Document**: [title] (id [document_id]) — version [old] → [new]
- **Sections**: [r] refreshed · [k] kept (re-verified) · [x] resolved/removed · [total] total
  ↳ refreshed: [list the section names]
- **Grounded in**: `<base-branch>` @ [sha] — the merged tree (`Synced to` line updated)
- **Not on base**: [stories named `Not on Base Branch` — their code is not described]
- **Ledger**: `aire-archives/stitch-ledger.md` — [N] row(s) appended
- **PR**: [URL] — `stitch-delta/<name>` → `<base-branch>`

NEXT ACTION:
   1.  Review and merge the PR above — it carries the ledger row(s) and the audit trail.
   2.  The next cycle pulls this refreshed deep dive from Atlas as its existing-system truth.
```

Substitute every placeholder. Drop the Not on base line when there is none. A story-only run drops
the Ledger and PR lines and NEXT ACTION item 1 (renumbering); its audit went to each story's
fragment. Output nothing after this block.

---

## Critical Rules

- **The deliverable is a WHOLLY CURRENT document.** Every section is decided against the merged code:
  REFRESH, KEEP (only on positive re-verification) or REMOVE/RESOLVE. **"The delta didn't mention it" is
  never a reason to leave a section stale** — that rule is what let `### Directory Structure` describe a
  codebase that no longer existed.
- **The merged working tree is the ground truth; the delta is the narrative.** Every fact, path,
  count and dependency is measured from the repo, never carried forward, never estimated.
- **Refresh in place — never restructure.** Same headings, same order. New areas are added in the
  document's existing pattern and named in the ledger.
- **`## Referenced Paths` must close the document**, regenerated from what this refresh examined — the
  Helix markdown save contract requires it.
- **Base branch only, after the merge** — every `[STORY]` PR into base, and the cycle PR. An unmerged
  cycle or story is skipped, never published. Every run moves the `Synced to` header line.
- **Re-read the `version` immediately before writing**; if it moved, redo the pass against the new
  body. Never blind-overwrite a newer version. Verify by re-reading before writing the ledger.
- **Two guards against a double publish**: the ledger row and the header stitch marker. Marker present
  + row missing → write the row, do not refresh again.
- **Ledger is append-only, written by this agent alone**, immediately after the Atlas write verifies.
  No pending rows, no edits, no re-sorting.
- **Several pending deltas = ONE refresh pass**, one row each, all naming the same resulting version.
- **HALT if Helix/Atlas is unreachable** — nothing written, deltas stay safe in their archives.
- **Never commit or push to base directly.** A run with a ledger row always uses the
  `stitch-delta/<name>` branch + PR; a story-only run changes nothing on base.
- **Touch no `spec/`, `src/` or `tests/` path.** The repository footprint is the ledger row and the
  archived audit entries, nothing else.
