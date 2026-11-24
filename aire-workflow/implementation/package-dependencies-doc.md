# `package-dependencies.md` — Approved Packages and Versions

**Purpose**: one approved list of every third-party package (and runtime) the cycle's code installs,
each at an exact version looked up live from its registry — never a version recalled from memory.
Code generation installs only what this list approves, so no story, bug or enhancement ships an old
package version.

**Location**: `spec/plans/package-dependencies.md` (story runs read it from
`.aire-docs/spec/plans/package-dependencies.md` — `common/branching-strategy.md` Section 4).

**When**:
- **Epic cycle** — STOP CHECKPOINT Step 1.0 (CLAUDE.md): after the design stages, before
  `architecture.md`.
- **Bug / enhancement cycle** — `bug-fix.md` / `enhancement-implement.md` Step 8.5 item 1.5, before
  `architecture.md`.

**Load this file when**: writing or updating `package-dependencies.md`, and in every code generation
run (Section 6).

---

## 1. Inputs — what the list must cover

**Cover every package the cycle's code will need, up front.** Section 6's fallback for an unlisted
package exists for the rare miss, not as the normal path. Walk:

1. The tech stack decided in `spec/plans/nfr.md` (NFR Requirements) and the other design documents
   that ran (`functional-design.md`, `application-design.md`, `infrastructure-design.md`).
2. Every story's acceptance criteria in `spec/plans/stories.md` (bug/enhancement: the single story) —
   what each one needs to build: framework, UI library, router, state, forms, validation, HTTP client,
   ORM/driver, auth, logging, date/number handling, and so on.
3. The test and tooling packages the gates need: the unit test runner and coverage tool
   (`implementation/code-generation.md` Step 11a), the API contract test tooling (Step 11a.5), build
   tool, linter and formatter, type definitions.
4. The runtimes and scaffolders: Node.js / Python / JDK / .NET SDK / Go version, and any scaffolder the
   plan runs (`create-vite`, `@angular/cli`, `create-next-app`, …).
5. **Existing code**: every manifest and lockfile in the repository (`package.json` +
   `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`, `requirements.txt` / `pyproject.toml` /
   `poetry.lock`, `pom.xml`, `build.gradle`, `*.csproj`, `go.mod`, `Cargo.toml`), plus Atlas truth.

---

## 2. Versions — looked up live, at write time

For every row run the registry lookup and record the timestamp of the check. **A version from
memory or training data is never written** — the whole point of this file is that versions are current.

| Ecosystem | Latest stable version | Peer / engine constraints |
|---|---|---|
| npm | `npm view <pkg> dist-tags.latest` | `npm view <pkg>@<version> peerDependencies engines` |
| PyPI | `pip index versions <pkg>` (first entry), or `https://pypi.org/pypi/<pkg>/json` → `info.version` | `requires_dist`, `requires_python` from the same JSON |
| Maven | `https://search.maven.org/solrsearch/select?q=g:<group>+AND+a:<artifact>&rows=1&wt=json` → `latestVersion` | the artifact's POM |
| NuGet | `https://api.nuget.org/v3-flatcontainer/<id-lowercase>/index.json` → last non-prerelease | `https://api.nuget.org/v3/registration5-semver1/<id>/index.json` |
| Go | `go list -m -versions <module>` (last) | `go.mod` of that version |
| Cargo | `cargo search <crate> --limit 1` | `cargo info <crate>@<version>` |
| Node.js runtime | `https://nodejs.org/dist/index.json` → newest entry with `lts` set | — |

Rules:
- **Latest stable only** — never a pre-release (`alpha`, `beta`, `rc`, `next`, `canary`, `preview`,
  `-SNAPSHOT`).
- **Compatible as a set** — packages that must agree (for example `react` + `react-dom` + their type
  packages, a framework and its plugins, a build tool and its plugin) are checked against each other's
  peer and engine constraints. When the latest of one does not fit, take the highest version that does
  and say why in the row's Notes.
- **Exact versions** — `19.1.0`, never `^19.1.0`, `~19.1`, `latest` or `*`.
- **Registry unreachable** → the row's Checked column reads `unverified — registry unreachable`, and
  the approval message says so plainly. Never fill the gap from memory.

---

## 3. Existing packages (existing code)

A package already in a manifest keeps its installed version (read from the lockfile, else the
manifest): Status `existing — kept`. The Latest stable column still shows the live latest, so the user
can see the gap. It moves only when the user asks for it with Request Changes — then Status
`upgrade` and the row carries the target version. Code generation never upgrades, downgrades or
re-ranges an existing package on its own.

---

## 4. Required structure

```markdown
# Package Dependencies — <system name>

> **Version**: <n> · **Generated**: <ISO 8601> · **AIRE**: v<N> · **Cycle**: <EPIC-ID | TICKET-ID>
> **Approved**: <ISO 8601 of the user's approval | pending>

## 1. Runtimes and tools
| Runtime / tool | Approved version | Latest stable | Checked | Notes |
|---|---|---|---|---|
| Node.js | 22.x.y | 22.x.y (LTS) | <ISO 8601> | |

## 2. Packages
| Package | Ecosystem | Type (runtime / dev) | Approved version | Latest stable | Status | Needed by | Checked | Notes |
|---|---|---|---|---|---|---|---|---|
| react | npm | runtime | 19.1.0 | 19.1.0 | new | Story 1.1, 1.3 | <ISO 8601> | same version as react-dom |
| express | npm | runtime | 4.21.2 | 5.1.0 | existing — kept | — | <ISO 8601> | |

Status: `new` · `existing — kept` · `upgrade` · `added during code generation` (Section 6).

## 3. Install commands
<the exact commands code generation runs, for example
 `npm install --save-exact react@19.1.0 react-dom@19.1.0`,
 `npm install --save-dev --save-exact vite@7.0.4`, `pip install fastapi==0.116.1`>
```

---

## 5. The approval — one gate

Present the standardized 2-option completion message, then WAIT. Log the prompt before
presenting it and the user's complete raw response after.

```markdown
# Package Dependencies Ready

 Packages: [N] new · [U] upgrade · [E] existing — kept · Runtimes: [list with versions]
 Versions checked live at [ISO 8601] · Unverified: [none | list]

[One line per new or upgrade row: package — approved version — needed by]

> **<u>REVIEW REQUIRED:</u>**  
> `spec/plans/package-dependencies.md`

> ** <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> **Request Changes** - Change a version, add or remove a package, or upgrade an existing one  
> **Continue to Next Stage** - Approve these versions and continue to `architecture.md`

---
```

- **Request Changes** → apply it, re-run the Section 2 lookup for every changed row, re-present.
- **Continue to Next Stage** → set `Approved` in the header, log it, continue with the checkpoint.
- **Nothing new to install** (every row `existing — kept`) → no gate: write the file, announce
  `No new packages — existing versions kept`, and continue.

The file rides the checkpoint's own commit (`spec/**`).

---

## 6. Code generation installs only what is approved — every flow

Binds `dev-implement`, `bug-fix-implement`, `enhancement-implement`, `epic-enhancement`, `epic-bugfix`
and `pr-fix`:

1. **Install exactly the approved rows** with the file's Section 3 commands — exact version, saved
   exact (`--save-exact`, `==`, a fixed `<version>`). Never `@latest`, never a range. A scaffolder runs
   at its approved version, and the manifest it generates is set to the approved versions before the
   first install.
2. **The lockfile is committed with the change.** Transitive dependencies are left to the package
   manager and are not listed.
3. **Never change an existing package's version** unless the file has an approved `upgrade` row for it.
4. **A package the code needs that is not in the file → continue automatically**: look up its latest
   stable compatible version live (Section 2), install it exact, and record it as
   `added during code generation` with the story or ticket that needed it:
   - **story runs** (`dev-implement`, `epic-enhancement`, `epic-bugfix`, `pr-fix` on a `[STORY]` PR) — in
     the story's fragment `## Package Additions` (`common/parallel-work-state.md`), never the shared file;
   - **bug / enhancement cycles** — append the row to `spec/plans/package-dependencies.md` directly.
   Announce it in the run's output, name it in the PR body, log it in the audit trail.
5. `epic-enhancement` and `epic-bugfix` list any new package in their one document's implementation /
   fix plan, so the plan approval covers it.

---

## Critical Rules

- **LIVE VERSIONS ONLY** — every version comes from a registry lookup at write time; never memory.
- **LATEST STABLE, COMPATIBLE, EXACT** — no pre-release, peers checked as a set, no ranges.
- **EXISTING VERSIONS ARE KEPT** unless the user approves an upgrade.
- **CODE INSTALLS ONLY APPROVED ROWS**; an unlisted package is looked up live, installed exact,
  recorded and announced — never silently.
