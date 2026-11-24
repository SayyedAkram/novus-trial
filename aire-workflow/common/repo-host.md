# Repo Host (GitHub or Azure Repos)

**Purpose**: Single source of truth for every operation AIRE performs on the git hosting service —
finding, reading, creating and editing pull requests, PR labels, review threads, posting reviews and
replies, and resolving a commit to the PR that merged it. Every rule file that touches a PR cites the
operation it needs (`RH-1` … `RH-12`) and this file supplies the command for the recorded host.

- **The Repo Host is independent of the Tracker.** The Tracker (`common/tracker-sync.md`) is where
  stories live (Azure DevOps Boards); the Repo Host is where branches and PRs live. Both hosts are
  valid with it — ADO Boards with GitHub, ADO Boards with Azure Repos.
- **The branching model does not change with the host.** Branch names, cut points and PR targets
  (`common/branching-strategy.md`) are identical on GitHub and Azure Repos; only the commands differ.
- Plain git (`fetch`, `checkout`, `merge`, `push`, `branch --merged`) is host-neutral and is NOT
  covered here — git authenticates through its own credential helper or SSH key on both hosts.

---

## 1. Detection and Record (once — Workspace Detection Step 1.6)

1. Read the remote: `git remote get-url origin`.
2. Classify it — detected, never asked (the remote URL is a fact of the repository):

   | `origin` URL | Type | Recorded identity |
   |---|---|---|
   | `https://github.com/<owner>/<repo>(.git)` or `git@github.com:<owner>/<repo>(.git)` | `GITHUB` | `Repository: <owner>/<repo>` |
   | `https://[<user>@]dev.azure.com/<org>/<project>/_git/<repo>` | `AZURE_REPOS` | Organization `https://dev.azure.com/<org>`, Project, Repository |
   | `git@ssh.dev.azure.com:v3/<org>/<project>/<repo>` | `AZURE_REPOS` | Organization `https://dev.azure.com/<org>`, Project, Repository |
   | `https://<org>.visualstudio.com/[DefaultCollection/]<project>/_git/<repo>` | `AZURE_REPOS` | Organization `https://<org>.visualstudio.com`, Project, Repository |
   | no `origin` remote | `NONE` | — |
   | any other host | `UNSUPPORTED` | — |

   URL-decode the Project and Repository names (`%20` → space).
3. Record in `runtime-artifacts/aire-state.md`:
   ```markdown
   ## Repo Host
   - Type: AZURE_REPOS
   - Remote: https://dev.azure.com/contoso/Payments/_git/payments-api
   - Organization: https://dev.azure.com/contoso
   - Project: Payments
   - Repository: payments-api
   ```
   For `GITHUB`, record `Type`, `Remote` and `Repository: <owner>/<repo>` only.
4. Announce it in one line (`Repo host: Azure Repos — contoso/Payments/payments-api`) and log it in
   `runtime-artifacts/audit.md`.
5. **Skip** when `## Repo Host` is already recorded (resumed project). A resumed project that predates
   this section has none — detect and record it at the first host operation, never ask.
6. **`NONE`** — no PR operation is possible; merge state comes from `git branch --merged
   <integration-branch>` (`common/tracker-sync.md` Section 4.1). **`UNSUPPORTED`** — git-only steps run
   as normal; at the first PR operation stop with: `AIRE raises and reads pull requests on GitHub or
   Azure Repos only — origin is <url>.` and log it.

---

## 2. Access Check (before the first host operation of a run)

| Type | Check | On failure |
|---|---|---|
| `GITHUB` | `gh auth status` | tell the user to run `gh auth login`, then wait |
| `AZURE_REPOS` | `az extension show --name azure-devops`, then `az repos show --repository "<Repository>" --org "<Organization>" --project "<Project>" --query name -o tsv` | missing extension → `az extension add --name azure-devops`; auth failure → tell the user to run `az login` (or set `AZURE_DEVOPS_EXT_PAT` to a PAT with **Code (Read & write)** scope), then wait |

On `AZURE_REPOS`, pass `--org "<Organization>"` on every `az` call, and `--project` /
`--repository` wherever the command accepts them — never rely on `az devops configure` defaults, which
can point at a different organization. (`az repos pr show`, `pr update`, `pr set-vote` and
`pr reviewer add` take `--org` only; the PR id is unique within the organization.)

---

## 3. Normalised PR Vocabulary

Rule files speak in these normalised terms; this table maps them to each host's fields.

| Normalised | GitHub (`gh` JSON) | Azure Repos (`az repos pr` JSON) |
|---|---|---|
| PR number | `number` | `pullRequestId` |
| State **OPEN** | `state == "OPEN"` | `status == "active"` |
| State **MERGED** | `state == "MERGED"` | `status == "completed"` |
| State **CLOSED** (not merged) | `state == "CLOSED"` | `status == "abandoned"` |
| Merged date | `mergedAt` | `closedDate` (only when `status == "completed"`) |
| Target branch | `baseRefName` | `targetRefName` without `refs/heads/` |
| Source branch | `headRefName` | `sourceRefName` without `refs/heads/` |
| Head commit | `headRefOid` | `lastMergeSourceCommit.commitId` |
| Draft | `isDraft` | `isDraft` |
| Body | `body` | `description` |
| Labels | `labels[].name` | `labels[].name` |
| Author | `author.login` | `createdBy.uniqueName` |
| Mergeable | `mergeable`, `mergeStateStatus` | `mergeStatus` (`succeeded`, `conflicts`, …) |
| Review decision | `reviewDecision`, `reviews[]` | `reviewers[].vote`: `10` approved · `5` approved with suggestions · `0` no vote · `-5` waiting for author · `-10` rejected |
| Changes requested | `reviewDecision == "CHANGES_REQUESTED"` | any reviewer vote `-5` or `-10` |
| Web URL | `url` | `<Organization>/<Project>/_git/<Repository>/pullrequest/<pullRequestId>` (the `url` field `az` returns is the REST URL — never show it to the user) |
| PR reference in text | `#<n>` | `!<n>` |

Every message, PR body, tracker comment and Story Tracker `PR` cell that shows a PR as `#<n>` renders
it as `!<n>` on Azure Repos.

---

## 4. Operations

`<Org>`, `<Project>`, `<Repo>` below are the recorded `## Repo Host` values; `<owner>/<repo>` is the
recorded GitHub Repository.

### RH-1 — Find PRs by branch

| GitHub | Azure Repos |
|---|---|
| `gh pr list --head <branch> [--base <target>] --state open\|all --json number,url,state,mergedAt,baseRefName,headRefName,title` | `az repos pr list --org "<Org>" --project "<Project>" --repository "<Repo>" --source-branch <branch> [--target-branch <target>] --status active\|all --top 100 -o json` |
| By target branch (e.g. open `ve/…` PRs into the cycle branch): `gh pr list --base <target> [--head <branch>] --state open --json number,url,headRefName,title` | `az repos pr list --org "<Org>" --project "<Project>" --repository "<Repo>" --target-branch <target> [--source-branch <branch>] --status active --top 100 -o json` |
| By branch prefix (e.g. every open `stitch-delta/` PR): `gh pr list --state open --search "head:stitch-delta/" --json number,title,url` | `az repos pr list … --status active --top 500 --query "[?starts_with(sourceRefName, 'refs/heads/stitch-delta/')].{id:pullRequestId,title:title}" -o json` |
| Open AIRE PRs (`pr-fix` picker): `gh pr list --state open --label ai-generated --limit 50 --json number,title,headRefName,baseRefName,url` | `az repos pr list … --status active --top 200 --query "[?labels[?name=='ai-generated']]" -o json` |
| Open PRs (picker): `gh pr list --state open --limit 30` | `az repos pr list … --status active --top 30 -o table` |

### RH-2 — Read one PR

| GitHub | Azure Repos |
|---|---|
| `gh pr view <n-or-branch> --json <fields>` | `az repos pr show --id <n> --org "<Org>" -o json` (by branch: resolve the id with RH-1 first) |

Read the normalised fields from Section 3. Merge check (Doability Gate, dependency-merge check,
change-request routing, `ve-list-work`): the PR is merged only when its state is MERGED and its
target branch is the expected integration branch.

### RH-3 — Create a PR

Called only by `pr-generator` and by `ve-implement` in STANDALONE mode.

| GitHub | Azure Repos |
|---|---|
| Labels must exist in the repo first — list by **exact** name (`gh label list --limit 500 --json name --jq '.[].name'`, never the fuzzy `--search`) and create only the absent ones: `gh label create "ai-generated" --description "Pull request generated by an AI agent" --color "8A2BE2"` · `gh label create "aire-anx-v[N]" --description "Developed with AIRE framework v[N]" --color "1D76DB"` | No setup — Azure Repos creates a label the first time it is applied |
| `gh pr create --base <target> --head <branch> --title "<title>" --body-file <file> --label "ai-generated" --label "aire-anx-v[N]"` | `az repos pr create --org "<Org>" --project "<Project>" --repository "<Repo>" --source-branch <branch> --target-branch <target> --title "<title>" --description "$(cat <file>)" --labels "ai-generated" "aire-anx-v[N]" [--work-items <id>] -o json` |

- **Work item** (when the caller passes one): GitHub — the body carries `AB#<id>` (RH-12); Azure Repos —
  `--work-items <id>`, which fills the PR's Work Items section (nothing in the description). Verify with
  RH-12 either way.
- **Azure Repos caps a PR description at 4,000 characters.** When the body is longer, keep every
  section a rule verifies (the type/summary block, `Tests & Review`, `Change Impact`, `Defect
  Provenance`, the `AIRE Framework: v[N]` line) in the description, add the line `Full description: see
  the first comment.`, and post the complete body as a comment with RH-8. Log that you did.
- Never pass `--auto-complete`, `--bypass-policy`, `--squash`, `--delete-source-branch`,
  `--transition-work-items` or `--draft` (unless the caller asks for a draft) — AIRE never completes a PR.
- After creating, verify the labels landed with RH-2 and add any missing one with RH-5.

### RH-4 — Edit a PR's title or body

| GitHub | Azure Repos |
|---|---|
| `gh pr edit <n> --title "<title>"` / `gh pr edit <n> --body-file <file>` | `az repos pr update --id <n> --org "<Org>" --title "<title>"` / `--description "$(cat <file>)"` (4,000-character cap — RH-3) |

Always read the PR back with RH-2 and confirm the change landed.

### RH-5 — Add, remove and list PR labels

| GitHub | Azure Repos |
|---|---|
| Add: `gh pr edit <n> --add-label "<label>"` (create the label first if absent — RH-3) | `az devops invoke --org "<Org>" --area git --resource pullRequestLabels --route-parameters project="<Project>" repositoryId="<Repo>" pullRequestId=<n> --http-method POST --in-file <file> --api-version 7.1` with `{"name": "<label>"}` in the file |
| Remove: `gh pr edit <n> --remove-label "<label>"` | same `invoke`, `--http-method DELETE`, extra route parameter `labelIdOrName="<label>"` |
| List: `gh pr view <n> --json labels --jq '.labels[].name'` | `az repos pr show --id <n> --org "<Org>" --query "labels[].name" -o tsv` |

### RH-6 — Changed files and diff

| GitHub | Azure Repos |
|---|---|
| `gh pr diff <n>` / `gh pr diff <n> --name-only` | Source branch still exists: `git fetch origin <target> <source>` then `git diff [--name-only] origin/<target>...origin/<source>`. Source branch deleted (merged PR): `az devops invoke --org "<Org>" --area git --resource pullRequestIterations --route-parameters project="<Project>" repositoryId="<Repo>" pullRequestId=<n> --api-version 7.1` → take the last iteration `id`, then `--resource pullRequestIterationChanges` with the extra route parameter `iterationId=<id>` → `changeEntries[].item.path` |

### RH-7 — Read review feedback

| GitHub | Azure Repos |
|---|---|
| One GraphQL call (paginate while `hasNextPage`):<br>`gh api graphql -F owner=<owner> -F name=<repo> -F number=<n> -f query='query($owner:String!,$name:String!,$number:Int!){ repository(owner:$owner,name:$name){ pullRequest(number:$number){ reviewThreads(first:100){ nodes{ id isResolved isOutdated path line originalLine comments(first:100){ nodes{ databaseId author{login} body createdAt url } } } } reviews(first:100){ nodes{ databaseId state author{login} body submittedAt url } } comments(first:100){ nodes{ databaseId author{login} body createdAt url } } } } }'` | `az devops invoke --org "<Org>" --area git --resource pullRequestThreads --route-parameters project="<Project>" repositoryId="<Repo>" pullRequestId=<n> --api-version 7.1 -o json`, plus the reviewer votes from RH-2 |

Normalise the Azure Repos threads (`value[]`) before applying any rule:
- **Skip system threads** — a thread whose comments are all `commentType == "system"` (votes, pushes,
  branch updates) and every `isDeleted` thread or comment.
- **Inline thread** ⇔ `threadContext.filePath` is set; line = `threadContext.rightFileStart.line`.
  Otherwise it is a PR-level comment.
- **Resolved** ⇔ `status` is `fixed`, `wontFix`, `closed` or `byDesign`. `active` or `pending` is
  unresolved. Azure Repos has no outdated flag — treat every unresolved thread as current.
- Comment fields: `id`, `parentCommentId`, `author.uniqueName`, `content`, `publishedDate`. A
  "Request changes" review is a reviewer vote of `-5` or `-10`.

### RH-8 — Post a review, a comment or a reply

| Action | GitHub | Azure Repos |
|---|---|---|
| PR-level comment | `gh pr comment <n> --body-file <file>` | `az devops invoke --org "<Org>" --area git --resource pullRequestThreads --route-parameters project="<Project>" repositoryId="<Repo>" pullRequestId=<n> --http-method POST --in-file <file> --api-version 7.1` with `{"comments":[{"parentCommentId":0,"content":"<text>","commentType":"text"}],"status":"active"}` |
| Inline comment | review-comments API (`gh api repos/<owner>/<repo>/pulls/<n>/comments` with `path`, `line`, `side: RIGHT`, `commit_id`) | the same thread POST plus `"threadContext":{"filePath":"/<path>","rightFileStart":{"line":<L>,"offset":1},"rightFileEnd":{"line":<L>,"offset":1}}` — the path starts with `/` |
| Review summary | `gh pr review <n> --comment --body-file <file>` | a PR-level comment thread (above) |
| Formal verdict (STANDALONE `pr-review` only, when the user chose it) | `--approve` / `--request-changes` instead of `--comment` | after posting the threads: `az repos pr set-vote --id <n> --org "<Org>" --vote approve` / `--vote wait-for-author` |
| Reply in a thread | `gh api repos/<owner>/<repo>/pulls/<n>/comments/<comment-id>/replies -f body=@<file>` | `az devops invoke --org "<Org>" --area git --resource pullRequestThreadComments --route-parameters project="<Project>" repositoryId="<Repo>" pullRequestId=<n> threadId=<thread-id> --http-method POST --in-file <file> --api-version 7.1` with `{"parentCommentId":<comment-id>,"content":"<text>","commentType":"text"}` |
| Re-request a review | `gh api -X POST repos/<owner>/<repo>/pulls/<n>/requested_reviewers -f "reviewers[]=<login>"` | `az repos pr reviewer add --id <n> --org "<Org>" --reviewers "<uniqueName>"`, then a PR-level comment asking that reviewer to re-review (a reviewer's earlier vote stays until they change it) |

**AUTO MODE posts comments only, on both hosts** — never a formal verdict, never a vote. Return the
web URL of what was posted (GitHub: the review or comment URL; Azure Repos: the PR web URL plus
`?discussionId=<thread-id>`).

### RH-9 — Find the PR that merged a commit

| GitHub | Azure Repos |
|---|---|
| `gh api repos/<owner>/<repo>/commits/<sha>/pulls` (fallback: `gh pr list --search "<sha>" --state merged`) | `az devops invoke --org "<Org>" --area git --resource pullRequestQuery --route-parameters project="<Project>" repositoryId="<Repo>" --http-method POST --in-file <file> --api-version 7.1` with `{"queries":[{"type":"lastMergeCommit","items":["<sha>"]},{"type":"commit","items":["<sha>"]}]}` → `results[]` maps the SHA to its PRs |

### RH-10 — Default branch

| GitHub | Azure Repos |
|---|---|
| `gh repo view <owner>/<repo> --json defaultBranchRef -q .defaultBranchRef.name` | `az repos show --repository "<Repo>" --org "<Org>" --project "<Project>" --query defaultBranch -o tsv` (strip `refs/heads/`) |

Fallback on either host: `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`).

### RH-11 — Required approvals on a branch

Read-only, used once by `common/branching-strategy.md` Section 1 to check the Base Branch has a
2-approval policy. Never writes a policy.

| GitHub | Azure Repos |
|---|---|
| `gh api repos/<owner>/<repo>/rules/branches/<branch> --jq '[.[] \| select(.type=="pull_request") \| .parameters.required_approving_review_count] \| max'` (rulesets, readable without admin); if that is empty, `gh api repos/<owner>/<repo>/branches/<branch>/protection/required_pull_request_reviews --jq .required_approving_review_count` (classic protection — `404` means none, `403` means not readable) | `REPO_ID=$(az repos show --repository "<Repo>" --org "<Org>" --project "<Project>" --query id -o tsv)` then `az repos policy list --org "<Org>" --project "<Project>" --repository-id "$REPO_ID" --branch "<branch>" --query "[?isEnabled && type.displayName=='Minimum number of reviewers'].settings.minimumApproverCount" -o tsv` |

The result is the highest count found, `0` when no rule exists, or `not readable`.

### RH-12 — Link a work item to a PR

Used by `pr-generator` for every `[STORY]`, `[BUG]` and `[ENH]` PR. `<id>` is the ADO work item ID;
`<TrackerOrg>` is `## Tracker` → Organization.

| Step | GitHub | Azure Repos |
|---|---|---|
| Link | Put `AB#<id>` in the PR body (RH-3 / RH-4) — the Azure Boards GitHub app turns it into the link | Into the PR's **Work Items** section, never the description: `az repos pr work-item add --id <n> --work-items <id> --org "<Org>"` (skip when RH-3 passed `--work-items`) |
| Verify | `az boards work-item show --id <id> --org "<TrackerOrg>" --expand relations --query "relations[?attributes.name=='GitHub Pull Request'].url" -o tsv` — one URL ends `%2F<n>` (the app links within seconds; re-check once) | `az repos pr work-item list --id <n> --org "<Org>" --query "[].id" -o tsv` contains `<id>` |

- Missing after verify → link again once (Azure Repos) and re-verify. Still missing — or the work item
  lives in another organization than the repo — warn, non-blocking:
  `Work item <id> is not linked to PR <ref> — link it on the PR's Work Items panel (GitHub: connect the
  Azure Boards app to <owner>/<repo>).` and log it.
- Never remove a link a human added.

### When an `az devops invoke` resource is not found

`az devops invoke` resolves `--resource` names through the organization's location service. If one
reports an unknown resource, call the same REST endpoint with
`az rest --method <GET|POST|DELETE> --resource 499b84ac-1321-427f-aa17-267ca6975798 --url "<Organization>/<Project>/_apis/git/repositories/<Repo>/<path>?api-version=7.1" [--body @<file>]`,
where `<path>` is `pullRequests/<n>/threads`, `pullRequests/<n>/threads/<thread-id>/comments`,
`pullRequests/<n>/labels[/<label>]`, `pullRequests/<n>/iterations[/<id>/changes]` or
`pullrequestquery`. Log the fallback.

---

## 5. Rules

- **AIRE never merges, completes, auto-completes, abandons, or bypasses policy on a PR** — on either
  host. Humans merge.
- **Pushes rejected by branch protection or a branch policy** (GitHub: `protected branch hook
  declined`; Azure Repos: `TF402455` / `TF402454`) → stop, show the message, name the branch whose
  policy blocks AIRE's direct commits (only the epic, bug or enhancement branch ever receives them), and
  log it. Never retry with force, never bypass.
- **Branch-name collisions on Azure Repos compare case-insensitively** — Azure Repos treats branch
  names that differ only in case as the same branch.
- Every PR operation dispatches on `## Repo Host` → `Type`. Never call `gh pr` on an Azure Repos
  remote or `az repos` on a GitHub remote.
- Log every host operation that writes (create, edit, label, work item link, comment, vote, reviewer) in
  `runtime-artifacts/audit.md` — or the story's fragment audit for a story run
  (`common/parallel-work-state.md`) — with the PR reference and the result observed.
