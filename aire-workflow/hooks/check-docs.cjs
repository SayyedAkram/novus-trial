#!/usr/bin/env node
'use strict';

// Document checker for AIRE workspaces. Verifies, without model calls, that the documents each workflow
// stage produces exist and have the structure later stages depend on. It is the Claude Code hook entry
// point (it also runs check-security.cjs on code) and a command-line tool. No dependencies.
//
// doc-checks.json lists every document: its path pattern, the documents it depends on (`requires`),
// the conditions under which it applies (`when`, `skipWhen`) and its structural checks (headings,
// regex patterns, JSON keys, named cross-file checks). Content quality is not assessed.
//
// Checks run at three levels:
//   shape     structure only; on every write and at the end of a turn
//   done      shape plus completion (no empty [Answer]: tags, every plan step [x]); applied when the
//             document is a prerequisite, by `stage`, and at commit
//   requires  the document's prerequisites are present and done; checked before the document is
//             written and before a stage marker ("- [x] User Stories", ...) is added to a state file
//
// Commands (node aire-workflow/hooks/check-docs.cjs <command>):
//   hook              read a Claude Code hook event from stdin and answer it
//   check <path..>    prerequisites, shape and completion of the given documents
//   before <path..>   prerequisites only
//   stage <stage>     every document the stage must have produced
//   staged            staged documents and stage markers (for a git pre-commit hook)
//   status            one line per document: present, missing, skipped, n/a, pending or invalid
//   selftest          validate doc-checks.json
//   --story=<key>     story key to evaluate (story-1.2, bug-4840, enhancement-4850, ve-4821; default: the
//                     key the current branch names, see storyKeyForBranch)
//
// Exit codes: 0 no problems, or not an AIRE workspace (hook answers are JSON on stdout with exit 0);
// 1 problems found, or the hook itself failed; 2 PostToolUse problems, written to stderr.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MANIFEST = path.join(__dirname, 'doc-checks.json');
const STATE = 'runtime-artifacts/aire-state.md';
const KEY_RX = '(?:story|bug|enhancement|ve|auto)-[^/]+';

function git(root, args, opts = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, ...opts });
}

// A workspace can span three git worktrees (common/branching-strategy.md Sections 4 and 7). During a
// story run the main tree holds the story branch (code and tests), `.aire-docs/` holds the epic branch
// (spec/, runtime-artifacts/, reports/) and `.aire-test-plans/` holds a test-plans branch while plans
// are written. Functions in this file take logical workspace-relative paths; physical() maps a logical
// path to the worktree that contains it. Without the extra worktrees every path is in the main tree.

const DOCS_WORKTREE = '.aire-docs';
const PLANS_WORKTREE = '.aire-test-plans';
const SIDE_WORKTREES = new Set([DOCS_WORKTREE, PLANS_WORKTREE]);
// The opt-in Novus automation worktree (common/branching-strategy.md Section 8). It is deliberately NOT a
// side worktree: logical() would strip its prefix and make `.aire-automation/tests/e2e/X` and a main-tree
// `tests/e2e/X` the same path. A path inside it is instead checked with the automation worktree itself as
// the root — its own branch (automation/<TICKET-ID>-… → key auto-<TICKET-ID>) and its own HEAD — by
// automationHook() and automationStop().
const AUTOMATION_WORKTREE = '.aire-automation';
const DOC_ROOT_RX = /^(?:spec|runtime-artifacts|reports)(?:\/|$)/;

// True when the state file is not in the main tree and the docs worktree is checked out.
const docsInWorktree = (root) => !fs.existsSync(path.join(root, STATE)) && fs.existsSync(path.join(root, DOCS_WORKTREE, STATE));

// Directory of the worktree that holds logical path `rel`, and the path within it.
function physical(root, rel) {
  if (DOC_ROOT_RX.test(rel) && docsInWorktree(root)) return { dir: path.join(root, DOCS_WORKTREE), rel };
  if (/^test-plans(?:\/|$)/.test(rel) && fs.existsSync(path.join(root, PLANS_WORKTREE, 'test-plans'))) return { dir: path.join(root, PLANS_WORKTREE), rel };
  return { dir: root, rel };
}

// Removes a worktree prefix: `.aire-docs/spec/x.md` -> `spec/x.md`.
const logical = (rel) => (rel && SIDE_WORKTREES.has(rel.split('/')[0]) ? rel.slice(rel.indexOf('/') + 1) : rel);

// Workspace root for a path, found without spawning git (a spawn costs about 100 ms on Windows). Walks
// up to the nearest .git (directory or file). That directory is the root if it contains the state file;
// otherwise the nearest directory below it that does (AIRE installed in a subfolder). State files under
// aire-archives/ are ignored. `.aire-docs/` and `.aire-test-plans/` resolve to the enclosing workspace.
function findRoot(start) {
  let d = path.resolve(start);
  let nearest = null;
  for (;;) {
    const hasState = fs.existsSync(path.join(d, STATE));
    if (fs.existsSync(path.join(d, '.git')) && SIDE_WORKTREES.has(path.basename(d)) && fs.existsSync(path.join(path.dirname(d), '.git'))) {
      return path.dirname(d);
    }
    if (hasState && !nearest && !toPosix(d).split('/').includes('aire-archives')) nearest = d;
    if (fs.existsSync(path.join(d, '.git'))) return hasState ? d : (nearest || d);
    const up = path.dirname(d);
    if (up === d) return nearest || path.resolve(start);
    d = up;
  }
}

// The workspace's prefix inside its repository ('' at the repository root, 'app/' for a subfolder).
// git status and git diff report repository-relative paths; the rest of this file is workspace-relative.
function gitPrefix(root) {
  if (fs.existsSync(path.join(root, '.git'))) return '';
  try { return toPosix(git(root, ['rev-parse', '--show-prefix']).trim()); } catch (_) { return ''; }
}

const toPosix = (p) => p.replace(/\\/g, '/');

// Absolute path with symlinks and Windows 8.3 short names (C:\Users\ABHIGY~1.RAN) resolved through the
// nearest existing ancestor, so hook file paths and git paths compare equal.
function canonical(p) {
  let head = path.resolve(p); const tail = [];
  for (;;) {
    try { return path.join(fs.realpathSync.native(head), ...tail); } catch (_) { /* not there yet */ }
    const up = path.dirname(head);
    if (up === head) return path.resolve(p);
    tail.unshift(path.basename(head)); head = up;
  }
}

// Logical workspace-relative path of `p`, or null when `p` is outside the workspace.
function relToRoot(root, p) {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(root, p);
  let rel = toPosix(path.relative(root, abs));
  if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel)) rel = toPosix(path.relative(canonical(root), canonical(abs)));
  if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel)) return null;
  return logical(rel);
}

const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.mypy_cache', '.ruff_cache', 'dist', 'build', 'target', '.next', 'coverage', '.pytest_cache', DOCS_WORKTREE, PLANS_WORKTREE, AUTOMATION_WORKTREE]);
const LIST_ROOTS = ['spec', 'reports', 'runtime-artifacts', 'test-plans', 'aire-archives', 'tests/e2e/automation'];

// Test Plan Folder recorded under ## Branching ("test-plans/<cycle>/"), or null.
function recordedPlanFolder(state) {
  const branching = section(state || '', 'Branching') || '';
  const m = /Test Plan Folder:\s*`?(test-plans\/[^/\s`]+)\/?/.exec(branching);
  return m ? `${m[1]}/` : null;
}

// Git ref to read the cycle's test plans from when no worktree on disk holds them
// (common/branching-strategy.md Section 7.3): the newest origin/test-plans/<cycle>[-n], else
// origin/<base>. Returns null when ## Branching records no Test Plan Folder.
function testPlanRef(root, state) {
  const branching = section(state || '', 'Branching') || '';
  const folder = (recordedPlanFolder(state) || '').replace(/^test-plans\/|\/$/g, '');
  const base = (/Base Branch:\s*`?([^\s`(]+)/.exec(branching) || [])[1];
  if (!folder) return null;
  try {
    const refs = git(root, ['for-each-ref', '--format=%(refname:short)', `refs/remotes/origin/test-plans/${folder}`, `refs/remotes/origin/test-plans/${folder}-*`]).split(/\r?\n/).filter(Boolean);
    const n = (r) => +((new RegExp(`/${esc(folder)}-(\\d+)$`).exec(r) || [])[1] || 1);
    if (refs.length) return refs.sort((a, b) => n(b) - n(a))[0];
  } catch (_) { /* not a git repository, or no remote */ }
  return base ? `origin/${base}` : null;
}

// File access for the working tree. Logical paths are read from the worktree that holds them. The
// cycle's test plans are read from testPlanRef(), resolved on first use, when its Test Plan Folder is
// not on disk: a story branch cut before the [TEST] PR merged, or the epic branch, which never carries
// the cycle's plans (it may still hold earlier cycles' folders). With no folder recorded, the ref is
// used only when there is no test-plans/ on disk at all.
function worktreeSource(root) {
  const cache = new Map();
  let listing = null;
  let planRef;
  let planFolder;
  function readFile(rel) {
    const p = physical(root, rel);
    try { return fs.readFileSync(path.join(p.dir, p.rel), 'utf8'); } catch (_) { return null; }
  }
  const onDisk = (rel) => { const p = physical(root, rel); return fs.existsSync(path.join(p.dir, p.rel)); };
  const folder = () => { if (planFolder === undefined) planFolder = recordedPlanFolder(readFile(STATE)); return planFolder; };
  const plansFromGit = () => { const f = folder(); return f ? !onDisk(f) : !onDisk('test-plans'); };
  const ref = () => { if (planRef === undefined) planRef = testPlanRef(root, readFile(STATE)); return planRef; };
  const fromRef = (rel) => {
    if (!ref()) return null;
    try { return git(root, ['show', `${ref()}:./${rel}`]); } catch (_) { return null; }
  };
  return {
    kind: 'worktree',
    read(rel) {
      if (cache.has(rel)) return cache.get(rel);
      let text = readFile(rel);
      if (text === null && /^test-plans\//.test(rel) && (!folder() || rel.startsWith(folder())) && plansFromGit()) text = fromRef(rel);
      cache.set(rel, text);
      return text;
    },
    isDir(rel) { const p = physical(root, rel); try { return fs.statSync(path.join(p.dir, p.rel)).isDirectory(); } catch (_) { return false; } },
    list() {
      if (listing) return listing;
      const found = [];
      const walk = (dir, dirRel) => {
        let entries = [];
        try { entries = fs.readdirSync(path.join(dir, dirRel), { withFileTypes: true }); } catch (_) { return; }
        for (const e of entries) {
          if (SKIP_DIRS.has(e.name)) continue;
          const rel = `${dirRel}/${e.name}`;
          if (e.isDirectory()) { found.push(rel + '/'); walk(dir, rel); } else found.push(rel);
        }
      };
      for (const top of LIST_ROOTS) {
        const { dir } = physical(root, top);
        if (fs.existsSync(path.join(dir, top))) { found.push(top + '/'); walk(dir, top); }
      }
      if (plansFromGit() && ref()) {
        try {
          const files = git(root, ['ls-tree', '-r', '--name-only', ref(), '--', folder() || 'test-plans/']).split(/\r?\n/).filter(Boolean);
          const dirs = new Set();
          for (const f of files) { const parts = f.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/'); }
          found.push(...files, ...dirs);
        } catch (_) { /* no such ref */ }
      }
      listing = [...new Set(found)];
      return listing;
    },
  };
}

// File access for the git index, used by `staged`: the content that will be committed.
function indexSource(root) {
  let listing = null;
  return {
    kind: 'index',
    read(rel) { try { return git(root, ['show', `:./${rel}`]); } catch (_) { return null; } }, // ":./" resolves the path relative to the workspace, not the repository root
    isDir(rel) { return this.list().includes(rel.endsWith('/') ? rel : rel + '/'); },
    list() {
      if (listing) return listing;
      const files = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
      const dirs = new Set();
      for (const f of files) {
        const parts = f.split('/');
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/');
      }
      listing = [...files, ...dirs];
      return listing;
    },
  };
}

// Document paths are glob patterns with placeholders:
//   {key}          story key (story-1.2, bug-4840, enhancement-4850, ve-4821)
//   {N.M}          story number taken from {key}
//   {story}        expands once per Story Tracker row
//   {any}          any single path segment (CR-{any}, round-{any}, v{any})
//   * ** ? {a,b}   glob syntax

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Compiled patterns are cached: Stop matches every changed file against every document pattern.
const templateCache = new Map();
function templateToRegex(t) {
  let rx = templateCache.get(t);
  if (!rx) { rx = compileTemplate(t); templateCache.set(t, rx); }
  return rx;
}

function compileTemplate(t) {
  let re = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '{') {
      const end = t.indexOf('}', i);
      if (end === -1) { re += '\\{'; continue; } // an unmatched brace (it can come from workspace text) is literal
      const name = t.slice(i + 1, end);
      if (name === 'key') re += `(?<key>${KEY_RX})`;
      else if (name === 'N.M') re += '(?<nm>\\d+\\.\\d+)';
      else if (name === 'story') re += '(?<story>\\d+\\.\\d+)';
      else if (name === 'any') re += '[^/]+';
      else re += '(?:' + name.split(',').map(esc).join('|') + ')';
      i = end;
    } else if (c === '*') {
      if (t[i + 1] === '*') { i++; if (t[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += esc(c);
  }
  return new RegExp('^' + re + '$', process.platform === 'win32' ? 'i' : '');
}

// Replaces bound placeholders with their values; unbound placeholders are left as they are.
function subst(t, ctx, quote = (v) => v) {
  return t
    .replace(/\{key\}/g, () => (ctx.key ? quote(ctx.key) : '{key}'))
    .replace(/\{N\.M\}/g, () => (ctx.nm ? quote(ctx.nm) : '{N.M}'))
    .replace(/\{story\}/g, () => (ctx.story ? quote(ctx.story) : '{story}'));
}

// Same substitution for use inside a regex: values are escaped, so "1.2" does not match "1x2".
const substRe = (re, ctx) => subst(re, ctx, esc);

const hasOpenPlaceholder = (t) => /\{(key|N\.M|story)\}/.test(t);
const isPattern = (t) => /[*?{]/.test(t);

function listMatches(t, ctx) {
  const rx = templateToRegex(t);
  const wantDir = t.endsWith('/');
  return ctx.src.list().filter((f) => (wantDir ? f.endsWith('/') : !f.endsWith('/')) && rx.test(f));
}

let manifestCache = null;
function loadManifest() {
  if (manifestCache) return manifestCache;
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  for (const [id, d] of Object.entries(m.docs)) d.id = id;
  manifestCache = m;
  return m;
}

const docPaths = (d) => (d.paths ? d.paths : d.path ? [d.path] : []);
const nmOf = (key) => (/^story-(\d+\.\d+)$/.exec(key || '') || [])[1] || null;

// Documents whose path pattern matches `rel`, each with the placeholder values the match binds.
function docsForPath(manifest, ctx, rel) {
  const out = [];
  for (const d of Object.values(manifest.docs)) {
    if (d.noWrite || d.marker) continue; // markers are checked by newMarkerProblems, only when newly added
    if ((d.exceptPaths || []).some((p) => templateToRegex(p).test(rel))) continue;
    const candidates = d.codeRoot ? codeRoots(ctx).map((r) => `${r}/**`).concat(d.alsoPaths || []) : docPaths(d);
    for (const p of candidates) {
      const m = templateToRegex(p).exec(rel);
      if (!m) continue;
      const g = m.groups || {};
      out.push({ d, bind: { key: g.key || null, nm: g.nm || nmOf(g.key), story: g.story || null } });
      break;
    }
  }
  return out;
}

// Body under the heading `name` (levels 1-3) up to the next heading of the same or higher level, or null.
function section(text, name) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const head = new RegExp('^(#{1,3})\\s+' + esc(name) + '\\s*(?:$|[\\s(—-])', 'i');
  let level = 0; const body = [];
  for (const line of lines) {
    const h = /^(#{1,6})\s/.exec(line);
    if (level) {
      if (h && h[1].length <= level) break;
      body.push(line);
    } else {
      const m = head.exec(line);
      if (m) level = m[1].length;
    }
  }
  return level ? body.join('\n') : null;
}

// Rows of the `## Story Tracker` table (or a fragment's `## Story Tracker Row`): [{ story, trackerId, status }].
function trackerRows(state) {
  const sec = section(state, 'Story Tracker');
  if (!sec) return [];
  const lines = sec.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  if (lines.length < 2) return [];
  const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  const col = (re) => head.findIndex((h) => re.test(h));
  const ci = { story: col(/^story/), tid: col(/^tracker id/), status: col(/^status/) };
  const rows = [];
  for (const l of lines.slice(1)) {
    if (/^\s*\|\s*:?-/.test(l)) continue;
    const c = cells(l);
    const m = /(\d+\.\d+)/.exec(c[ci.story === -1 ? 0 : ci.story] || '');
    if (!m) continue;
    rows.push({ story: m[1], trackerId: ci.tid >= 0 ? c[ci.tid] : '', status: ci.status >= 0 ? c[ci.status] : '' });
  }
  return rows;
}

function codeRoots(ctx) {
  const sec = section(ctx.state, 'Code Root');
  const roots = ['src'];
  if (sec) {
    const m = /Path\(s\)\W*\s*(.+)/.exec(sec);
    if (m) {
      for (const p of splitOutsideBraces(m[1])) {
        const r = p.trim().replace(/^`|`$/g, '').replace(/\/+$/, '');
        if (r && r !== 'src' && !/[<>]/.test(r)) roots.push(r);
      }
    }
  }
  return [...new Set(roots)];
}

// Splits on commas and pipes outside braces: "apps/{web,api}, lib" -> ["apps/{web,api}", " lib"].
function splitOutsideBraces(s) {
  const out = []; let cur = ''; let depth = 0;
  for (const c of s) {
    if (c === '{') depth++;
    else if (c === '}' && depth) depth--;
    if (!depth && (c === ',' || c === '|')) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

// Story key a branch name carries (workflows/pr-fix.md Step 3; common/parallel-work-state.md Section 2.1):
//   story/<N.M>-<title>, story/<TICKET-ID>-<N.M>-<title>   story-<N.M>
//   bug/<TICKET-ID>-<title>[-r2]                          bug-<TICKET-ID>
//   enhancement/<TICKET-ID>-<title>                       enhancement-<TICKET-ID>
//   ve/<TICKET-ID>-<title>                                ve-<TICKET-ID>
//   automation/<TICKET-ID>-<title>                        auto-<TICKET-ID>   (opt-in Novus automation)
// Any other branch (the Base Branch, an epic or test-plans branch) carries no story key: null.
function storyKeyForBranch(branch) {
  const b = String(branch || '').trim();
  let m = /^story\/(?:[^/]*?-)?(\d+\.\d+)(?=-|$)/.exec(b);
  if (m) return `story-${m[1]}`;
  m = /^automation\/([^/-]+)(?=-|$)/.exec(b);
  if (m) return `auto-${m[1]}`;
  m = /^(bug|enhancement|ve)\/([^/-]+)(?=-|$)/.exec(b);
  return m ? `${m[1]}-${m[2]}` : null;
}

// Name of the branch checked out in `root`, read without spawning git where possible (a spawn costs
// about 100 ms on Windows). '' for a detached HEAD.
function currentBranch(root) {
  const dotGit = path.join(root, '.git');
  let stat = null;
  try { stat = fs.statSync(dotGit); } catch (_) { /* a sub-folder install: .git is higher up */ }
  let gitDir = null;
  if (stat && stat.isDirectory()) gitDir = dotGit;
  else if (stat) { // a worktree or submodule: .git is a file naming the git directory
    const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, 'utf8'));
    if (m) gitDir = path.resolve(root, m[1].trim());
  }
  if (gitDir) {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    return head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : '';
  }
  return git(root, ['branch', '--show-current']).trim();
}

// Story key for the branch checked out in the main tree, or null.
function branchStoryKey(root) {
  try { return storyKeyForBranch(currentBranch(root)); } catch (_) { return null; }
}

// Evaluates a `when` / `skipWhen` condition from doc-checks.json against the workspace.

function evalCond(cond, ctx) {
  if (cond === undefined || cond === 'always' || cond === true) return true;
  if (cond === 'never' || cond === false) return false;
  if (typeof cond === 'string') return evalCond({ ref: cond }, ctx);
  if (cond.ref) {
    const c = ctx.manifest.conditions && ctx.manifest.conditions[cond.ref];
    if (c === undefined) throw new Error(`unknown condition "${cond.ref}"`);
    return evalCond(c, ctx);
  }
  if (cond.all) return cond.all.every((c) => evalCond(c, ctx));
  if (cond.any) return cond.any.some((c) => evalCond(c, ctx));
  if (cond.not) return !evalCond(cond.not, ctx);
  if (cond.state) return new RegExp(substRe(cond.state, ctx), 'mi').test(ctx.state);
  if (cond.section) {
    const body = section(ctx.state, cond.section.name);
    return body !== null && (!cond.section.re || new RegExp(substRe(cond.section.re, ctx), 'mi').test(body));
  }
  if (cond.file) {
    const t = subst(cond.file.path, ctx);
    const files = isPattern(t) ? listMatches(t, ctx) : [t];
    const rx = new RegExp(substRe(cond.file.re, ctx), 'mi');
    return files.some((f) => { const x = ctx.src.read(f); return x !== null && rx.test(x); });
  }
  if (cond.exists) {
    const t = subst(cond.exists, ctx);
    if (hasOpenPlaceholder(t)) return false;
    return isPattern(t) || t.endsWith('/') ? listMatches(t, ctx).length > 0 : ctx.src.read(t) !== null;
  }
  if (cond.storyKey) return !!ctx.key && new RegExp(cond.storyKey).test(ctx.key);
  throw new Error('unknown condition ' + JSON.stringify(cond));
}

const MOJIBAKE = /â€|â†|Ã[\u0080-¿]/;

// Applies `rules` (a document entry or its `done` block) to `text` and appends messages to `problems`.
// File-level checks (readable, non-empty, encoding, parse) run only for the entry itself.
function checkText(rules, where, text, problems, { fileChecks = true } = {}) {
  if (fileChecks) {
    if (text === null) { problems.push(`${where}: cannot be read`); return; }
    if (!text.trim()) { problems.push(`${where}: is empty`); return; }
    if (MOJIBAKE.test(text)) problems.push(`${where}: contains double-encoded UTF-8 (e.g. "â€") — rewrite the file as UTF-8`);
  } else if (!text) return;
  if (rules.parse === 'json') {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { problems.push(`${where}: is not valid JSON (${e.message})`); return; }
    for (const k of rules.jsonKeys || []) if (getPath(obj, k) === undefined) problems.push(`${where}: missing JSON key "${k}"`);
  }
  if (rules.parse === 'yaml' && /^\t/m.test(text)) problems.push(`${where}: YAML indented with tabs`);
  if (rules.parse === 'html' && !/<html[\s>]/i.test(text)) problems.push(`${where}: no <html> element`);

  // Emoji are removed before heading patterns are applied.
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[\p{Extended_Pictographic}️]\s*/gu, ''));
  let from = 0;
  for (const h of rules.headings || []) {
    const rx = new RegExp(h, 'i');
    let found = -1;
    for (let i = from; i < lines.length; i++) if (rx.test(lines[i])) { found = i; break; }
    if (found === -1) {
      problems.push(lines.some((l) => rx.test(l)) ? `${where}: heading /${h}/ is out of order` : `${where}: missing /${h}/`);
    } else from = found + 1;
  }
  for (const h of rules.headingsAny || []) {
    const rx = new RegExp(h, 'i');
    if (!lines.some((l) => rx.test(l))) problems.push(`${where}: missing /${h}/`);
  }
  for (const p of rules.patterns || []) {
    const n = (text.match(new RegExp(p.re, 'g' + (p.flags === undefined ? 'm' : p.flags))) || []).length;
    const min = p.min === undefined ? 1 : p.min;
    if (n < min) problems.push(`${where}: ${p.msg || `needs /${p.re}/`}${min > 1 ? ` (found ${n}, need ${min})` : ''}`);
    if (p.max !== undefined && n > p.max) problems.push(`${where}: ${p.msg || `/${p.re}/`} — found ${n}, at most ${p.max} allowed`);
  }
  for (const p of rules.forbid || []) {
    const m = new RegExp(p.re, p.flags === undefined ? 'm' : p.flags).exec(text);
    if (m) problems.push(`${where}: ${p.msg || `must not contain /${p.re}/`} — "${m[0].trim().slice(0, 70)}"`);
  }
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

// Contexts to evaluate a document in: one per Story Tracker row for per-story documents, else one.
function expansions(d, ctx) {
  const paths = docPaths(d);
  if (d.perStory || paths.some((p) => p.includes('{story}'))) {
    const rows = ctx.story ? [{ story: ctx.story, trackerId: ctx.trackerId }] : trackerRows(ctx.state);
    return rows.map((r) => ({ ...ctx, story: r.story, trackerId: r.trackerId }));
  }
  return [ctx];
}

function resolveFiles(d, ctx) {
  const found = [];
  for (const p of docPaths(d)) {
    const t = subst(p, ctx);
    if (hasOpenPlaceholder(t)) {
      // Unbound story placeholder: a file of any story satisfies it.
      found.push(...listMatches(t, ctx));
    } else if (isPattern(t) || t.endsWith('/')) found.push(...listMatches(t, ctx));
    else if (ctx.src.read(t) !== null) found.push(t);
    else if (ctx.src.isDir(t)) found.push(t + '/');
  }
  // exceptPaths name files the pattern matches but that are not this document (docsForPath skips them too).
  const except = (d.exceptPaths || []).map((p) => templateToRegex(p));
  return [...new Set(found)].filter((f) => !except.some((rx) => rx.test(f)));
}

// Evaluates a document at level 'exists', 'shape' or 'done'. Returns { state, problems } with state one
// of 'n/a', 'skipped', 'missing', 'pending' (marker not yet written), 'invalid' or 'present'.
function evaluate(d, ctx, level = 'shape') {
  if (d.scope === 'story' && !ctx.key && docPaths(d).some((p) => p.includes('{key}') || p.includes('{N.M}'))) return { state: 'n/a', problems: [] };
  if (!evalCond(d.when, ctx)) return { state: 'n/a', problems: [] };
  if (d.skipWhen && evalCond(d.skipWhen, ctx)) return { state: 'skipped', problems: [] };

  // A per-story document with no Story Tracker rows yet is n/a.
  const xs = expansions(d, ctx);
  if (!xs.length) return { state: 'n/a', problems: [] };
  const problems = [];
  let anyMissing = false;
  for (const x of xs) {
    // Section document: a named heading inside another file.
    if (d.section) {
      const file = subst(d.path, x);
      const body = section(x.src.read(file) || '', subst(d.section, x));
      if (body === null) { anyMissing = true; problems.push(`missing: "## ${subst(d.section, x)}" in ${file}`); continue; }
      if (level !== 'exists') applyRules(d, `${file} (## ${subst(d.section, x)})`, body, x, level, problems);
      continue;
    }
    // Marker document: a line in a state file recording a completed stage.
    if (d.marker) {
      const file = subst(d.path, x);
      const text = x.src.read(file) || '';
      if (!new RegExp(substRe(d.marker, x), 'm').test(text)) { anyMissing = true; problems.push(`pending: ${d.title} not yet recorded in ${file}`); }
      continue;
    }
    if (d.perStory && !docPaths(d).some((p) => p.includes('{story}'))) {
      // Per-story entry without a per-story path (test-plan folders are named by Tracker ID): cross-checks only.
      for (const name of d.cross || []) runCross(name, x, d, [], problems);
      continue;
    }
    const files = resolveFiles(d, x);
    const min = d.min === undefined ? 1 : d.min;
    if (files.length < min) {
      anyMissing = true;
      const shown = docPaths(d).map((p) => subst(p, x));
      problems.push(`missing: ${shown[0]}${shown.length > 1 ? ` (or ${shown.slice(1).join(', ')})` : ''}${min > 1 ? ` — need ${min}, found ${files.length}` : ''}`);
      continue;
    }
    if (level === 'exists') continue;
    for (const f of files) {
      if (f.endsWith('/')) {
        for (const inner of d.contains || []) if (!listMatches(f + subst(inner, x), x).length) problems.push(`${f}: missing ${inner}`);
        continue;
      }
      applyRules(d, f, x.src.read(f), x, level, problems);
    }
    for (const name of d.cross || []) runCross(name, x, d, files, problems);
    if (level === 'done' && d.done) for (const name of d.done.cross || []) runCross(name, x, d, files, problems);
  }
  if (anyMissing) return { state: d.optional ? 'n/a' : (d.marker ? 'pending' : 'missing'), problems: d.optional ? [] : problems };
  return { state: problems.length ? 'invalid' : 'present', problems };
}

function applyRules(d, where, text, ctx, level, problems) {
  checkText(d, where, text, problems);
  if (level === 'done' && d.done) checkText({ ...d.done, parse: undefined }, where, text, problems, { fileChecks: false });
  if (d.section) for (const name of d.cross || []) runCross(name, ctx, d, [], problems);
}

function runCross(name, ctx, d, files, problems) {
  const fn = CROSS[name];
  if (!fn) { problems.push(`doc-checks.json: unknown cross-check "${name}"`); return; }
  for (const p of fn(ctx, d, files) || []) problems.push(p);
}

// Problems with a document's prerequisites. Each must be present, structurally valid and done; an
// optional prerequisite is checked only when present.
function prerequisiteProblems(manifest, d, ctx) {
  const problems = [];
  for (const rid of d.requires || []) {
    const r = manifest.docs[rid];
    if (!r) { problems.push(`doc-checks.json: ${d.id} requires unknown doc "${rid}"`); continue; }
    // A plan is read while its steps are still being executed, so entries can lower the prerequisite
    // level with `prereqLevel`; completion is then checked when the plan itself is committed.
    const res = evaluate(r, ctx, r.prereqLevel || 'done');
    if (res.state === 'missing' || res.state === 'invalid' || res.state === 'pending') {
      problems.push(`${r.title} (${r.stage}) — ${res.problems.slice(0, 4).join('; ')}`);
    }
  }
  return problems;
}

const read = (ctx, p) => ctx.src.read(p) || '';
const uniq = (a) => [...new Set(a)];
const near = (a, b, tol = 1e-6) => Math.abs(Number(a) - Number(b)) < tol;

function liveReqIds(ctx) {
  const text = read(ctx, 'spec/plans/requirements.md');
  const all = uniq((text.match(/REQ-(?:F|NF)-\d{2,}/g) || []));
  return all.filter((r) => !new RegExp(`~~[^~\\n]*\\b${r}\\b[^~\\n]*~~|\\b${r}\\b[^\\n]*\\bSUPERSEDED\\b`).test(text));
}

const archVersion = (a) => (/^>\s*\*\*Version\*\*:\s*v?(\d+\.\d+\.\d+)/m.exec(a) || [])[1] || null;

function parseGraph(y) {
  const stories = {}; let cur = null; let inReq = false;
  const id = (s) => (/(\d+\.\d+)/.exec(s) || [])[1];
  for (const line of y.split(/\r?\n/)) {
    let m;
    if ((m = /^\s*-\s*id\s*:\s*(.+)$/.exec(line))) { cur = id(m[1]); if (cur) stories[cur] = { requires: [] }; inReq = false; continue; }
    if (!cur) continue;
    if ((m = /^\s+requires\s*:\s*(.*)$/.exec(line))) {
      const v = m[1].trim();
      if (v.startsWith('[')) { stories[cur].requires.push(...(v.match(/\d+\.\d+/g) || [])); inReq = false; } else inReq = v === '';
      continue;
    }
    if (inReq && (m = /^\s+-\s*["']?(\d+\.\d+)/.exec(line))) { stories[cur].requires.push(m[1]); continue; }
    if (/^\s+\w+\s*:/.test(line)) inReq = false;
  }
  return stories;
}

function findCycle(graph) {
  const color = {}; const stack = []; let cycle = null;
  const visit = (n) => {
    color[n] = 1; stack.push(n);
    for (const m of graph[n] || []) {
      if (cycle) return;
      if (color[m] === 1) { cycle = stack.slice(stack.indexOf(m)).concat(m); return; }
      if (!color[m] && graph[m]) visit(m);
    }
    stack.pop(); color[n] = 2;
  };
  for (const n of Object.keys(graph)) if (!color[n] && !cycle) visit(n);
  return cycle;
}

// Test-plan folders belonging to a story: sub-folders of the cycle's Test Plan Folder, or the folder
// itself for a bug or enhancement cycle. Without a recorded folder, folders of any cycle are searched.
function testPlanFolders(ctx, row) {
  const own = recordedPlanFolder(ctx.state);
  const all = own ? [own, ...listMatches(`${own}*/`, ctx)] : listMatches('test-plans/*/', ctx).concat(listMatches('test-plans/*/*/', ctx));
  const tid = row.trackerId && !/^(—|-|TBD)?$/i.test(row.trackerId) ? row.trackerId.replace(/^#/, '') : null;
  return all.filter((f) => ctx.src.isDir(f) || ctx.src.list().includes(f)).filter((f) => {
    const name = f.slice(0, -1).split('/').pop();
    return (tid && name.toLowerCase().startsWith(tid.toLowerCase() + '-'))
      || new RegExp(`^story-${esc(row.story)}(?:-|$)`, 'i').test(name)
      || new RegExp(`-story-${esc(row.story)}$`, 'i').test(name);
  });
}

function evalJson(ctx) {
  try { return JSON.parse(read(ctx, `reports/eval-evidence/${ctx.key}/eval.json`)); } catch (_) { return null; }
}

const STORY_STATUSES = ['ToDo', 'In Progress', 'Ready for Testing', 'In Testing', 'Bug fixing', 'Closed'];
const BUG_STATUSES = ['New', 'Active', 'In-Revision', 'Resolved', 'Closed'];
const RESULT_STATUS = /^(PASS|FAIL|ERROR|N\/A)$/;

// Cross-file checks referenced by name from doc-checks.json (`cross`). Each returns problem messages.
const CROSS = {
  // Every live REQ-ID in requirements.md is referenced in stories.md.
  'req-covered-by-stories'(ctx) {
    const stories = read(ctx, 'spec/plans/stories.md');
    const gaps = liveReqIds(ctx).filter((r) => !new RegExp(`\\b${r}\\b`).test(stories));
    return gaps.length ? [`spec/plans/stories.md: no story covers ${gaps.join(', ')} (requirements-traceability.md Rule 3)`] : [];
  },

  // Every REQ-ID a story cites exists in requirements.md.
  'covers-ids-exist'(ctx) {
    const req = read(ctx, 'spec/plans/requirements.md');
    const cited = uniq((read(ctx, 'spec/plans/stories.md').match(/^.*\*\*Covers\*\*:.*$/gm) || []).join('\n').match(/REQ-(?:F|NF)-\d{2,}/g) || []);
    const bad = cited.filter((r) => !req.includes(r));
    return bad.length ? [`spec/plans/stories.md: **Covers** cites ${bad.join(', ')}, which requirements.md does not define`] : [];
  },

  // Story Tracker Status values are canonical statuses (common/status-model.md Section 1).
  'tracker-statuses'(ctx, d, files) {
    const out = [];
    const valid = new Set([...STORY_STATUSES, ...BUG_STATUSES]);
    const sources = files.length ? files : [STATE];
    for (const f of sources) {
      for (const r of trackerRows(read(ctx, f))) if (r.status && !valid.has(r.status)) out.push(`${f}: story ${r.story} has Status "${r.status}" — a story is ${STORY_STATUSES.join(' / ')}, a bug ${BUG_STATUSES.join(' / ')} (common/status-model.md Section 1)`);
    }
    return out;
  },

  // dependency-graph.yml names exactly the Story Tracker stories; requires point at known stories; no cycle.
  'graph-matches-tracker'(ctx) {
    const graph = parseGraph(read(ctx, 'spec/plans/dependency-graph.yml'));
    const ids = Object.keys(graph);
    const rows = trackerRows(ctx.state).map((r) => r.story);
    const out = [];
    if (!ids.length) return ['spec/plans/dependency-graph.yml: no "- id:" entries under stories:'];
    const miss = rows.filter((s) => !ids.includes(s));
    const extra = rows.length ? ids.filter((s) => !rows.includes(s)) : [];
    if (miss.length) out.push(`spec/plans/dependency-graph.yml: no entry for story ${miss.join(', ')} (in the Story Tracker)`);
    if (extra.length) out.push(`spec/plans/dependency-graph.yml: story ${extra.join(', ')} has no Story Tracker row`);
    for (const [k, v] of Object.entries(graph)) {
      for (const r of v.requires) {
        if (r === k) out.push(`spec/plans/dependency-graph.yml: ${k} requires itself`);
        else if (!ids.includes(r)) out.push(`spec/plans/dependency-graph.yml: ${k} requires unknown story ${r}`);
      }
    }
    const cyc = findCycle(Object.fromEntries(Object.entries(graph).map(([k, v]) => [k, v.requires])));
    if (cyc) out.push(`spec/plans/dependency-graph.yml: dependency cycle ${cyc.join(' -> ')}`);
    return out;
  },

  // architecture.md carries the two ALWAYS diagrams inline (architecture-doc.md Section 2.1).
  'architecture-diagrams'(ctx) {
    const a = read(ctx, 'spec/plans/architecture.md');
    const out = [];
    if (!/```mermaid\s*\n\s*C4Context\b/.test(a)) out.push('spec/plans/architecture.md: no System Context diagram (a ```mermaid block starting C4Context) — architecture-doc.md Section 2.1');
    if (!/```mermaid\s*\n\s*flowchart\s+TB\b[\s\S]*?subgraph[\s\S]*?```/.test(a)) out.push('spec/plans/architecture.md: no Component Architecture diagram (```mermaid flowchart TB with subgraph) — architecture-doc.md Section 2.1');
    return out;
  },

  // Every design input that exists is listed in architecture.md "Derived from" (architecture-doc.md Section 1).
  'architecture-derived-from'(ctx) {
    const a = read(ctx, 'spec/plans/architecture.md');
    const line = (/^>\s*\*\*Derived from\*\*:(.*)$/m.exec(a) || [])[1] || '';
    const docs = ['spec/plans/functional-design.md', 'spec/plans/nfr.md', 'spec/plans/infrastructure-design.md', 'spec/plans/application-design.md', 'spec/plans/package-dependencies.md'];
    const miss = docs.filter((p) => ctx.src.read(p) !== null && !line.includes(p) && !line.includes(path.posix.basename(p)));
    return miss.length ? [`spec/plans/architecture.md: "Derived from" does not list ${miss.join(', ')}`] : [];
  },

  // judge-rubrics.md: its Rubric version equals the architecture.md version, and the weights in each
  // table sum to 1.0 (architecture-doc.md Section 6). An empty J1 table (J1: N/A) has no weights.
  'judge-rubrics-match'(ctx) {
    const F = 'spec/plans/judge-rubrics.md';
    const t = read(ctx, F);
    const out = [];
    const rv = (/^>\s*Rubric version:\s*v?(\d+\.\d+\.\d+)/m.exec(t) || [])[1];
    const av = archVersion(read(ctx, 'spec/plans/architecture.md'));
    if (rv && av && rv !== av) out.push(`${F}: Rubric version ${rv} != architecture.md version ${av} — re-derive it with the new version (architecture-doc.md Section 3)`);
    for (const j of ['J1', 'J2']) {
      const rows = (section(t, j) || '').split(/\r?\n/).filter((l) => new RegExp(`^\\s*\\|\\s*${j}-`).test(l));
      if (!rows.length) continue;
      let sum = 0; const ids = [];
      for (const l of rows) {
        const cells = l.split('|').slice(1, -1).map((c) => c.trim());
        const w = parseFloat(cells[cells.length - 2]);
        ids.push(cells[0]);
        if (Number.isNaN(w)) out.push(`${F}: ${cells[0]} has no numeric Weight`);
        else sum += w;
      }
      if (!near(sum, 1, 1e-3)) out.push(`${F}: ${j} weights sum to ${+sum.toFixed(6)}, not 1.0`);
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dup.length) out.push(`${F}: duplicate criterion id ${uniq(dup).join(', ')}`);
    }
    return out;
  },

  // A test-plan folder exists for the story (by Tracker ID, or story-N.M for a story not yet pushed).
  'test-plan-folder'(ctx) {
    const row = { story: ctx.story, trackerId: ctx.trackerId || '' };
    return testPlanFolders(ctx, row).length ? [] : [`${recordedPlanFolder(ctx.state) || 'test-plans/'}: no test-plan folder for story ${ctx.story} (expected <TICKET-ID>-<title>/)`];
  },

  // audit.md: every entry with a **Timestamp** uses ISO 8601 UTC and has a **User Email** field, and
  // entries are in chronological order. Order is not checked after the "Story Audit Trails (folded at
  // cycle close)" heading, where folded entries keep their original timestamps.
  'audit-entries'(ctx, d, files) {
    const out = [];
    for (const f of files) {
      const text = read(ctx, f);
      const fold = text.search(/^## Story Audit Trails \(folded at cycle close\)/m);
      const entries = text.split(/^(?=## )/m).filter((e) => e.startsWith('## '));
      let prev = null; let badTs = 0; let noEmail = 0; let disorder = 0; let at = 0;
      for (const e of entries) {
        const folded = fold !== -1 && text.indexOf(e, at) >= fold;
        at = text.indexOf(e, at) + e.length;
        const ts = /^\*\*Timestamp\*\*:\s*(.*?)\s*$/m.exec(e);
        if (!ts) continue;
        const v = ts[1].replace(/^"|"$/g, '');
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)) badTs++;
        else if (!folded) { if (prev && v < prev) disorder++; prev = v; }
        if (!/^\*\*User Email\*\*:\s*\S/m.test(e)) noEmail++;
      }
      if (badTs) out.push(`${f}: ${badTs} **Timestamp** value(s) not ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ)`);
      if (noEmail) out.push(`${f}: ${noEmail} entr${noEmail === 1 ? 'y has' : 'ies have'} no **User Email**: field`);
      if (disorder) out.push(`${f}: ${disorder} entr${disorder === 1 ? 'y is' : 'ies are'} out of chronological order — audit is append-only`);
    }
    return out;
  },

  // aire-state.md contains no email address. A legacy "## Session Identity" section is ignored.
  'state-no-identity'(ctx, d, files) {
    const out = [];
    for (const f of files) {
      const legacy = section(read(ctx, f), 'Session Identity');
      const t = legacy === null ? read(ctx, f) : read(ctx, f).replace(legacy, '');
      const m = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(t.replace(/https?:\/\/\S+/g, ''));
      if (m) out.push(`${f}: contains an email address ("${m[0]}") — emails go in audit.md only`);
    }
    return out;
  },

  // reverse-engineering-timestamp.md lists the RE files and each exists next to it.
  're-files-listed'(ctx, d, files) {
    const out = [];
    for (const f of files) {
      const dir = path.posix.dirname(f);
      for (const m of read(ctx, f).matchAll(/^- \[x\] ([\w-]+\.md)\s*$/gm)) if (ctx.src.read(`${dir}/${m[1]}`) === null) out.push(`${f}: lists ${m[1]}, which does not exist in ${dir}/`);
    }
    return out;
  },

  // UI/UX mockups: self-contained screens with a header comment; index.html links every screen.
  'mockups-self-contained'(ctx) {
    const out = [];
    const screens = listMatches('spec/plans/ui-ux/SCR-*.html', ctx);
    const index = read(ctx, 'spec/plans/ui-ux/index.html');
    for (const s of screens) {
      const t = read(ctx, s);
      const ext = /<(?:link|script|img)[^>]+(?:href|src)=["']https?:\/\//i.exec(t);
      if (ext) out.push(`${s}: loads an external resource — mockups must be self-contained`);
      if (!/Screen:\s*SCR-\d{2}/.test(t)) out.push(`${s}: no "Screen: SCR-NN" header comment`);
      if (index && !index.includes(path.posix.basename(s))) out.push(`spec/plans/ui-ux/index.html: does not link ${path.posix.basename(s)}`);
    }
    return out;
  },

  // eval.json: every result has a valid status, a PASS verdict has no failing result, and the key
  // matches its folder (story-artifacts.md E7; code-generation.md Step 11c.7).
  'eval-consistency'(ctx) {
    const e = evalJson(ctx);
    if (!e) return [];
    const F = `reports/eval-evidence/${ctx.key}/eval.json`;
    const results = e.results && typeof e.results === 'object' ? e.results : {};
    const out = [];
    for (const [id, v] of Object.entries(results)) {
      const s = v && v.status;
      if (!RESULT_STATUS.test(String(s))) out.push(`${F}: ${id} status "${s}" is not PASS, FAIL, ERROR or N/A`);
    }
    const allOk = Object.values(results).every((v) => v && (v.status === 'PASS' || v.status === 'N/A'));
    if (e.verdict === 'PASS' && !allOk) out.push(`${F}: verdict is PASS but a result is not PASS or N/A`);
    if (e.key && e.key !== ctx.key) out.push(`${F}: "key" is ${e.key}, folder is ${ctx.key}`);
    return out;
  },

  // eval-summary.md agrees with eval.json: verdict in the header, one row per result.
  'summary-matches-eval'(ctx) {
    const e = evalJson(ctx); if (!e) return [];
    const F = `reports/eval-evidence/${ctx.key}/eval-summary.md`;
    const s = read(ctx, F); const out = [];
    const head = /^###\s*Eval Scorecard\b.*\*\*(\w+)\*\*\s*$/m.exec(s);
    if (head && e.verdict && head[1] !== e.verdict) out.push(`${F}: header verdict ${head[1]} != eval.json verdict ${e.verdict}`);
    const rows = (s.match(/^\|(?!\s*Check\s*\|)(?!\s*:?-).*\|\s*(PASS|FAIL|ERROR|N\/A)\s*\|\s*$/gm) || []).length;
    const results = Object.keys(e.results || {}).length;
    if (results && rows && rows < results) out.push(`${F}: ${rows} result rows, eval.json has ${results} results — one row per result`);
    return out;
  },

  // changed-lines-coverage.json agrees with the unitCoverage result in eval.json.
  'coverage-matches-eval'(ctx) {
    const e = evalJson(ctx); if (!e || !e.results || !e.results.unitCoverage) return [];
    const F = `reports/unit-test-evidence/${ctx.key}/coverage/changed-lines-coverage.json`;
    let c; try { c = JSON.parse(read(ctx, F)); } catch (_) { return []; }
    const out = [];
    const u = e.results.unitCoverage;
    if (c.status && u.status && c.status !== u.status) out.push(`${F}: status ${c.status} != eval.json unitCoverage ${u.status}`);
    if (typeof u.value === 'number' && typeof c.lineCoverage === 'number' && !near(u.value, c.lineCoverage)) out.push(`${F}: lineCoverage ${c.lineCoverage} != eval.json unitCoverage.value ${u.value}`);
    if (c.key && c.key !== ctx.key) out.push(`${F}: key ${c.key} != folder ${ctx.key}`);
    return out;
  },

  // Review reports: versions v1..vX contiguous, and the latest has a valid Status.
  'review-versions'(ctx) {
    const reviews = listMatches(`reports/reviews/${ctx.key}-code-review-v*.md`, ctx);
    if (!reviews.length) return [];
    const nums = reviews.map((f) => +(/-v(\d+)\.md$/.exec(f) || [])[1]).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
    if (!nums.length) return [];
    const out = [];
    nums.forEach((n, i) => { if (n !== i + 1) out.push(`reports/reviews/: ${ctx.key} review versions are not contiguous (${nums.join(', ')})`); });
    const latest = nums[nums.length - 1];
    const t = read(ctx, `reports/reviews/${ctx.key}-code-review-v${latest}.md`);
    if (!/^\*\*Status\*\*:[^A-Za-z\n]*(APPROVED WITH COMMENTS|APPROVED|CHANGES REQUESTED)\b/m.test(t)) out.push(`reports/reviews/${ctx.key}-code-review-v${latest}.md: **Status** is not APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED`);
    return uniq(out);
  },

  // Delta Folder values in a stitch ledger are unique (the column is the idempotency key). A story
  // row carries "—" there and is not a delta.
  'ledger-unique-delta'(ctx, d, files) {
    const out = [];
    for (const f of files) {
      const lines = read(ctx, f).split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*:?-/.test(l)).slice(1);
      const folders = lines.map((l) => (l.split('|')[3] || '').trim()).filter((x) => x && !/^(—|-)$/.test(x));
      const dup = folders.filter((x, i) => folders.indexOf(x) !== i);
      if (dup.length) out.push(`${f}: Delta Folder ${uniq(dup).join(', ')} appears more than once — the ledger is append-only and idempotent`);
    }
    return out;
  },
};

function context(root, src, key, manifest) {
  const ctx = { root, src, manifest, key: key || null, nm: null, story: null, state: '' };
  ctx.state = src.read(STATE) || '';
  if (ctx.key) ctx.nm = nmOf(ctx.key);
  return ctx;
}

const withBind = (ctx, b) => {
  const c = { ...ctx };
  if (b.key) { c.key = b.key; c.nm = nmOf(b.key); }
  if (b.nm) { c.nm = b.nm; if (!b.key) c.key = `story-${b.nm}`; }
  if (b.story) {
    c.story = b.story;
    const row = trackerRows(ctx.state).find((r) => r.story === b.story);
    c.trackerId = row ? row.trackerId : '';
  }
  return c;
};

function isAireWorkspace(root) { return fs.existsSync(path.join(root, STATE)) || docsInWorktree(root); }

// Problems for the documents `rels` belong to: prerequisites and/or shape, plus completion when `done`.
function checkPaths(manifest, ctx, rels, { prereqs = true, shape = true, done = false } = {}) {
  const problems = [];
  const seen = new Set();
  for (const rel of rels) {
    for (const { d, bind } of docsForPath(manifest, ctx, rel)) {
      const c = withBind(ctx, bind);
      const sig = d.id + '|' + (c.key || '') + '|' + (c.story || '');
      if (seen.has(sig)) continue;
      seen.add(sig);
      // Documents that do not apply to this cycle type, or whose stage is skipped, are not checked.
      if (!evalCond(d.when, c) || (d.skipWhen && evalCond(d.skipWhen, c))) continue;
      if (prereqs) for (const p of prerequisiteProblems(manifest, d, c)) problems.push(`${d.title} needs: ${p}`);
      if (shape && !d.codeRoot) {
        const res = evaluate(d, c, done ? 'done' : 'shape');
        if (res.state === 'invalid') problems.push(...res.problems);
      }
    }
  }
  return uniq(problems);
}

function stageProblems(manifest, ctx, stage) {
  const out = [];
  for (const d of Object.values(manifest.docs)) {
    if (d.stage !== stage || d.marker) continue;
    const res = evaluate(d, ctx, 'done');
    if (res.state === 'missing' || res.state === 'invalid') out.push(...res.problems.map((p) => `${d.id}: ${p}`));
  }
  return out;
}

function selftest(manifest) {
  const problems = [];
  const stages = new Set((manifest.stages || []).map((s) => s.id));
  const ctx = { manifest, state: '', src: { list: () => [], read: () => null, isDir: () => false } };
  for (const d of Object.values(manifest.docs)) {
    if (!d.title) problems.push(`${d.id}: no title`);
    if (!d.path && !d.paths && !d.codeRoot) problems.push(`${d.id}: no path`);
    if (!d.stage) problems.push(`${d.id}: no stage`);
    else if (!stages.has(d.stage)) problems.push(`${d.id}: stage "${d.stage}" is not in stages[]`);
    if (!d.source) problems.push(`${d.id}: no source (the rule file and section it implements)`);
    if (d.scope !== undefined && d.scope !== 'story') problems.push(`${d.id}: scope "${d.scope}" is not "story"`);
    for (const r of d.requires || []) if (!manifest.docs[r]) problems.push(`${d.id}: requires unknown doc ${r}`);
    for (const c of [...(d.cross || []), ...((d.done && d.done.cross) || [])]) if (!CROSS[c]) problems.push(`${d.id}: unknown cross-check ${c}`);
    for (const p of [...docPaths(d), ...(d.alsoPaths || []), ...(d.exceptPaths || [])]) { try { templateToRegex(p); } catch (e) { problems.push(`${d.id}: bad path ${p}`); } }
    const rules = [d, d.done || {}];
    for (const r of rules) {
      for (const h of [...(r.headings || []), ...(r.headingsAny || [])]) { try { new RegExp(h); } catch (e) { problems.push(`${d.id}: bad heading regex ${h}`); } }
      for (const p of [...(r.patterns || []), ...(r.forbid || [])]) { try { new RegExp(p.re); } catch (e) { problems.push(`${d.id}: bad regex ${p.re}`); } }
    }
    if (d.marker) { try { new RegExp(d.marker); } catch (e) { problems.push(`${d.id}: bad marker regex ${d.marker}`); } }
    try { evalCond(d.when, ctx); if (d.skipWhen) evalCond(d.skipWhen, ctx); } catch (e) { problems.push(`${d.id}: ${e.message}`); }
  }
  const cyc = findCycle(Object.fromEntries(Object.values(manifest.docs).map((d) => [d.id, d.requires || []])));
  if (cyc) problems.push(`requires cycle: ${cyc.join(' -> ')}`);
  return problems;
}

// Marker docs whose state file is `rel` (aire-state.md, or a story's state fragment).
function markersFor(manifest, ctx, rel) {
  const out = [];
  for (const d of Object.values(manifest.docs)) {
    if (!d.marker) continue;
    const m = templateToRegex(d.path).exec(rel);
    if (m) out.push({ d, ctx: withBind(ctx, { key: m.groups && m.groups.key }) });
  }
  return out;
}

// Stage markers present in `after` but not in `before` (newly added to a state file).
function newMarkers(manifest, ctx, rel, before, after) {
  if (after === null || after === undefined) return [];
  const out = [];
  for (const m of markersFor(manifest, ctx, rel)) {
    if (!evalCond(m.d.when, m.ctx)) continue;
    const rx = new RegExp(substRe(m.d.marker, m.ctx), 'm');
    if (rx.test(after) && !rx.test(before || '')) out.push(m);
  }
  return out;
}

// Problems for newly added stage markers: the stage's required documents must be present and done.
function newMarkerProblems(manifest, ctx, rel, before, after) {
  const problems = [];
  for (const { d, ctx: c } of newMarkers(manifest, ctx, rel, before, after)) {
    for (const p of prerequisiteProblems(manifest, d, c)) problems.push(`${d.title}: ${p}`);
  }
  return uniq(problems);
}

// Documents in doc-checks.json that `rel` is and that apply to this cycle (their `when` holds and no
// `skipWhen` does).
function applicableDocs(manifest, ctx, rel) {
  return docsForPath(manifest, ctx, rel)
    .map(({ d, bind }) => ({ d, c: withBind(ctx, bind) }))
    .filter(({ d, c }) => evalCond(d.when, c) && !(d.skipWhen && evalCond(d.skipWhen, c)));
}

// Claude Code hook handlers. The hook configuration lives in .claude/settings.json; aire-annexus merges it
// into a project's settings. A passing check prints nothing. Exit 1 means the checker failed;
// PreToolUse is configured with onFailure "block", so a failure never lets a write through. Every event
// runs the document checks and check-security.cjs (which judges only the lines a change adds).
//
//   PreToolUse   Write|Edit  deny (JSON permissionDecision) when the file's prerequisites are not met, a
//                            stage marker added by the write is missing documents, the write adds a
//                            secret, or a story branch edits architecture.md Section 11
//   PostToolUse  Write|Edit  exit 2 with the problems on stderr when the written file is malformed or the
//                            code it adds breaks a security rule; the write is kept. (Claude Code passes
//                            PostToolUse stderr to the model; a JSON "block" decision is not shown to it.)
//   Stop                     JSON "block" for problems in files changed since HEAD, stage markers added
//                            since HEAD and code lines added since HEAD, including changes made through
//                            shell commands; skipped while stop_hook_active is set
//   SessionStart             JSON additionalContext listing documents whose prerequisites are missing
//
// Each event that ran a check also appends a row to the hook log (reports/hooks-log/, below).

const H = 'AIRE document check';
const HS = 'AIRE security check';
const MAX_LISTED = 25;
const OUTPUT_LIMIT = 9500; // Claude Code caps hook output at 10,000 characters

// One block of a hook message: { head, lead, problems, width (max characters per item), more (command
// that lists the items left out) }.
const docSection = (lead, problems) => ({ head: H, lead, problems, width: 300, more: 'node aire-workflow/hooks/check-docs.cjs status' });
const securitySection = (lead, problems) => ({ head: HS, lead, problems, width: 700, more: 'node aire-workflow/hooks/check-security.cjs scan' });

// Required lazily, after the aire-workflow/hooks/ exemption, so a syntax error in the security rules
// cannot block edits to the hook files themselves.
const security = () => require('./check-security.cjs');

// True on a story branch: its Security Decisions are fixed (read from the epic branch, never edited).
const isStoryRun = (ctx) => /^story-/.test(ctx.key || '');

// architecture.md whose "## 11. Security Decisions" apply. On a story branch it is read from the epic
// branch named in ## Branching as committed (local, then origin), so an edit made during the story run
// has no effect. Otherwise it is read from the working tree.
function approvedArchitecture(root, ctx) {
  const rel = 'spec/plans/architecture.md';
  if (!isStoryRun(ctx)) return ctx.src.read(rel);
  const epic = (/^\s*-\s*Epic Branch:\s*`?([^\s`]+)/m.exec(section(ctx.state, 'Branching') || '') || [])[1];
  for (const ref of epic ? [epic, `origin/${epic}`] : []) {
    try { return git(root, ['show', `${ref}:./${rel}`]); } catch (_) { /* not on that ref: try the next */ }
  }
  return null;
}

function renderSection(s, max) {
  const shown = s.problems.slice(0, max).map((p) => (p.length > s.width ? `${p.slice(0, s.width - 3)}...` : p));
  const more = s.problems.length - shown.length;
  const tail = more > 0 ? `\n- ...and ${more} more; run: ${s.more}` : '';
  return `${s.head}: ${s.lead}\n- ${shown.join('\n- ')}${tail}`;
}

// Joins the non-empty blocks into one message within Claude Code's 10,000-character hook output limit,
// listing fewer items per block until it fits. Returns null when there are no problems.
function reasons(...sections) {
  const live = sections.filter((s) => s.problems.length);
  if (!live.length) return null;
  for (let max = MAX_LISTED; ; max--) {
    const text = live.map((s) => renderSection(s, max)).join('\n\n');
    if (text.length <= OUTPUT_LIMIT || max === 1) return text;
  }
}

// Content of `text` after applying an Edit; null when old_string is not found (the Edit tool rejects it).
function applyEdit(text, oldStr, newStr, all) {
  if (typeof oldStr !== 'string' || typeof newStr !== 'string') return null;
  if (oldStr === '') return text === null ? newStr : null;
  if (text === null) return null;
  for (const lf of [false, true]) {
    const n = (s) => (lf ? s.replace(/\r\n/g, '\n') : s);
    const t = n(text); const o = n(oldStr); const r = n(newStr);
    if (t.includes(o)) return all ? t.split(o).join(r) : t.replace(o, () => r);
  }
  return null;
}

// File a Write or Edit call targets, with its content before and after the call.
function toolWrite(ev, root, ctx) {
  const input = ev.tool_input || {};
  const rel = relToRoot(root, input.file_path);
  if (!rel) return null;
  const before = ctx.src.read(rel);
  let after = null;
  if (ev.tool_name === 'Write') after = typeof input.content === 'string' ? input.content : null;
  else if (ev.tool_name === 'Edit') after = applyEdit(before, input.old_string, input.new_string, input.replace_all === true);
  return { rel, before, after };
}

// Context in which `rel` already contains `text`. PreToolUse evaluates prerequisites in it, because a
// stage marker and the section it depends on can be written to aire-state.md in the same call.
function withWrite(ctx, rel, text) {
  if (text === null) return ctx;
  const base = ctx.src;
  const src = {
    kind: base.kind,
    read: (r) => (r === rel ? text : base.read(r)),
    isDir: (r) => base.isDir(r),
    list: () => { const l = base.list(); return l.includes(rel) ? l : [...l, rel]; },
  };
  return { ...ctx, src, state: rel === STATE ? text : ctx.state };
}

// ------------------------------------------------------------------ hook log
//
// Every hook event that ran a check appends one row (time, session, event, file, stage, checks, result,
// reason) to a Markdown log, so a run's passes and failures can be reviewed without its transcript:
//   reports/hooks-log/hooks-log.md               cycle-level work on the epic branch: planning and design
//   reports/hooks-log/<story-key>/hooks-log.md   one story: story-1.2, bug-4840, enhancement-4855
// The story is the one the checked-out branch names (story/1.2-... -> story-1.2, bug/4840-... ->
// bug-4840), else the story folder of the path written (runtime-artifacts/stories/<story-key>/,
// reports/<type>/<story-key>/). A story run (documents in .aire-docs/) never writes the cycle-level
// log, so parallel story runs never append to one file. The log is committed with the audit trail of
// its scope (common/audit-logging.md). Only the hooks write it: a Write/Edit to it is refused, and Stop
// does not check it. Writing it never changes a hook's answer. AIRE_HOOK_LOG=0 turns it off.

const HOOK_LOG_DIR = 'reports/hooks-log';
const STORY_PATH_RX = new RegExp(`^(?:runtime-artifacts/stories|reports/[^/]+)/(${KEY_RX})/`);
const isHookLog = (rel) => rel === HOOK_LOG_DIR || rel.startsWith(`${HOOK_LOG_DIR}/`);
const HOOK_LOG_LOCKED = `${HOOK_LOG_DIR}/ is written only by the AIRE hooks — never edit it; it records every check they run.`;
const LOG_COLUMNS = ['Time (UTC)', 'Session', 'Event', 'Target', 'Stage', 'Checks', 'Result', 'Reason'];
const LOG_ITEM = 600;
const LOG_ITEMS = 20;

// Story whose log an event goes to; null for the cycle-level log.
function logStory(ctx, rels) {
  if (ctx.key) return ctx.key;
  const keys = uniq(rels.map((r) => (STORY_PATH_RX.exec(r) || [])[1]).filter(Boolean));
  return keys.length === 1 ? keys[0] : null;
}

function logHeader(key) {
  const scope = key ? `story \`${key}\`` : 'cycle-level work (planning and design)';
  return `# AIRE Hook Log — ${key || 'cycle'}\n\n`
    + `Every check the AIRE hooks ran for ${scope}, one row per hook event, oldest first. Written by \`aire-workflow/hooks/check-docs.cjs\`; never edit it by hand.\n\n`
    + 'Result: `PASS` · `BLOCKED` (PreToolUse: the write was refused) · `FAIL` (PostToolUse: the write was kept and the agent told to fix it) · '
    + '`BLOCKED-STOP` (Stop: the agent was sent back to fix it) · `WARN` (SessionStart: the inconsistencies were given to the agent) · '
    + '`ERROR` (the checker failed; on PreToolUse the write was refused)\n\n'
    + `| ${LOG_COLUMNS.join(' | ')} |\n|${LOG_COLUMNS.map(() => '---').join('|')}|\n`;
}

const logCell = (s) => String(s === null || s === undefined ? '' : s).replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim() || '—';

function logReason(docs, sec) {
  const all = [...docs.map((p) => `[docs] ${p}`), ...sec.map((p) => `[security] ${p}`)];
  const shown = all.slice(0, LOG_ITEMS).map((p) => (p.length > LOG_ITEM ? `${p.slice(0, LOG_ITEM - 3)}...` : p));
  return shown.join('\n') + (all.length > shown.length ? `\n...and ${all.length - shown.length} more` : '');
}

// Appends one row; creates the file with its header first (atomically: a parallel hook call never sees
// a file without one).
function appendHookLog(root, key, e) {
  if (process.env.AIRE_HOOK_LOG === '0') return;
  if (!key && docsInWorktree(root)) return; // a story run: the cycle-level log is not this run's
  try {
    const p = physical(root, key ? `${HOOK_LOG_DIR}/${key}/hooks-log.md` : `${HOOK_LOG_DIR}/hooks-log.md`);
    writeLogRow(path.join(p.dir, p.rel), key, e);
  } catch (_) { /* logging never changes the hook's answer */ }
}

function writeLogRow(file, key, e) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, logHeader(key));
    try { fs.linkSync(tmp, file); } catch (err) { if (err.code !== 'EEXIST') throw err; } finally { fs.rmSync(tmp, { force: true }); }
  }
  const row = [new Date().toISOString().replace(/\.\d+Z$/, 'Z'), String(e.session || '').slice(0, 8), e.event, e.target, (e.stages || []).join(', '), (e.checks || []).join(', '), e.result, e.reason];
  fs.appendFileSync(file, `| ${row.map(logCell).join(' | ')} |\n`);
}

// ------------------------------------------------------------------ automation worktree
//
// The opt-in /novus-automate skill writes only inside `.aire-automation/` (a linked worktree on
// automation/<TICKET-ID>-<title>), and only under tests/e2e/ (common/directory-structure.md rule 4d;
// extensions/testing/novus-automation/novus-automation.md NA-11). Its writes are checked with the
// worktree as the root, so its own branch gives the key and its own HEAD gives the added lines; the main
// tree's path handling is untouched. Its hook log goes to <common git dir>/aire-hooks-log/<key>.md —
// untracked, so it can never be committed, and kept when the worktree is removed.

// The automation worktree that contains `start`, or null.
function automationRootOf(start) {
  let d = path.resolve(start);
  for (;;) {
    if (path.basename(d) === AUTOMATION_WORKTREE && fs.existsSync(path.join(d, '.git')) && fs.existsSync(path.join(path.dirname(d), '.git'))) return d;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// The repository's common git directory for a linked worktree, read from its .git file (no git spawn).
function commonGitDir(worktree) {
  const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(path.join(worktree, '.git'), 'utf8'));
  if (!m) throw new Error(`${worktree}/.git names no gitdir`);
  return path.resolve(worktree, m[1].trim(), '..', '..'); // <common>/worktrees/<name> -> <common>
}

function automationKey(autoRoot) {
  try { return storyKeyForBranch(currentBranch(autoRoot)); } catch (_) { return null; }
}

function appendAutomationLog(autoRoot, key, e) {
  if (process.env.AIRE_HOOK_LOG === '0') return;
  try {
    writeLogRow(path.join(commonGitDir(autoRoot), 'aire-hooks-log', `${key || 'automation'}.md`), key, e);
  } catch (_) { /* logging never changes the hook's answer */ }
}

const inAutomation = (rel) => `${AUTOMATION_WORKTREE}/${rel}`;
const E2E_RX = /^tests\/e2e\//;

// PreToolUse / PostToolUse for a file inside the automation worktree.
function automationHook(ev, autoRoot, file) {
  const manifest = loadManifest();
  const key = automationKey(autoRoot);
  const ctx = context(autoRoot, worktreeSource(autoRoot), key, manifest);
  const log = (e) => appendAutomationLog(autoRoot, key, { session: ev.session_id, ...e });
  const sec = security();
  switch (ev.hook_event_name) {
    case 'PreToolUse': {
      const w = toolWrite(ev, autoRoot, ctx);
      if (!w) return null;
      const deny = (reason) => ({ code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }) });
      const entry = { event: `PreToolUse ${ev.tool_name || ''}`.trim(), target: inAutomation(w.rel) };
      let lock = null;
      if (!/^auto-/.test(key || '')) {
        lock = `${AUTOMATION_WORKTREE}/ must be checked out on an automation/<TICKET-ID>-<title> branch before anything is written in it (common/branching-strategy.md Section 8).`;
      } else if (!E2E_RX.test(w.rel)) {
        lock = `${AUTOMATION_WORKTREE}/ may write only tests/e2e/ (common/directory-structure.md rule 4d; novus-automation.md NA-11) — refused: ${w.rel}`;
      }
      if (lock) {
        log({ ...entry, checks: ['automation scope'], result: 'BLOCKED', reason: lock });
        return deny(`${H}: ${lock}`);
      }
      const added = w.after === null ? new Set() : sec.newLines(w.before, w.after);
      const s = w.after === null ? [] : sec.review([{ rel: w.rel, text: w.after, isNew: (n) => added.has(n) }], ctx.src.read, { only: (r) => r.secret });
      const reason = reasons(securitySection(sec.LEAD_SECRET, s));
      log({ ...entry, checks: ['automation scope', w.after !== null && sec.isScanned(w.rel) && 'secrets'].filter(Boolean), result: reason ? 'BLOCKED' : 'PASS', reason: logReason([], s) });
      return reason ? deny(reason) : null;
    }
    case 'PostToolUse': {
      const rel = relToRoot(autoRoot, file);
      if (!rel || !E2E_RX.test(rel)) return null;
      const p = checkPaths(manifest, ctx, [rel], { prereqs: false, shape: true });
      let s = [];
      if (sec.isScanned(rel)) {
        const text = ctx.src.read(rel);
        const input = ev.tool_input || {};
        const undone = ev.tool_name === 'Edit' ? sec.textBeforeEdit(text, input.old_string, input.new_string, input.replace_all === true) : null;
        const added = sec.newLines(undone !== null ? undone : headText(autoRoot, rel), text);
        s = sec.review([{ rel, text, isNew: (n) => added.has(n) }], ctx.src.read);
      }
      const reason = reasons(docSection(`${inAutomation(rel)} does not have its required shape — fix it now:`, p), securitySection(sec.LEAD, s));
      const docs = applicableDocs(manifest, ctx, rel);
      const checks = [docs.some(({ d }) => !d.codeRoot) && 'shape', sec.isScanned(rel) && 'security'].filter(Boolean);
      if (checks.length) {
        log({ event: `PostToolUse ${ev.tool_name || ''}`.trim(), target: inAutomation(rel), stages: uniq(docs.map(({ d }) => d.stage)), checks, result: reason ? 'FAIL' : 'PASS', reason: logReason(p, s) });
      }
      return reason ? { code: 2, stderr: `${reason}\n` } : null;
    }
    default:
      return null;
  }
}

// Stop: the automation worktree's own changes since its own HEAD. Returns the block reason, or null.
function automationStop(root, ev) {
  const autoRoot = path.join(root, AUTOMATION_WORKTREE);
  if (!fs.existsSync(path.join(autoRoot, '.git'))) return null;
  const rels = changedIn(autoRoot);
  if (!rels.length) return null;
  const manifest = loadManifest();
  const key = automationKey(autoRoot);
  const ctx = context(autoRoot, worktreeSource(autoRoot), key, manifest);
  const e2e = rels.filter((r) => E2E_RX.test(r));
  const p = uniq([
    ...checkPaths(manifest, ctx, e2e, { prereqs: false, shape: true }),
    ...rels.filter((r) => !E2E_RX.test(r)).map((r) => `${inAutomation(r)} is outside tests/e2e/ — revert it (novus-automation.md NA-11)`),
  ]);
  const sec = security();
  const code = e2e.filter(sec.isScanned);
  let s = [];
  if (code.length) {
    const added = sec.addedSinceHead(autoRoot, git);
    s = sec.review(code.map((rel) => ({ rel, text: ctx.src.read(rel), isNew: sec.isNewIn(added, rel) })), ctx.src.read);
  }
  const reason = reasons(
    docSection(`${AUTOMATION_WORKTREE}/ has changes to fix before finishing:`, p),
    securitySection(sec.LEAD, s),
  );
  appendAutomationLog(autoRoot, key, { session: ev.session_id, event: 'Stop', target: `${rels.length} changed in ${AUTOMATION_WORKTREE}/`, checks: ['automation scope', 'documents', code.length && 'security'].filter(Boolean), result: reason ? 'BLOCKED-STOP' : 'PASS', reason: logReason(p, s) });
  return reason || null;
}

// Handles one hook event. Returns null when there is nothing to report, else { code, stdout, stderr }.
function hookMain(raw) {
  const text = String(raw || '').replace(/^﻿/, '').trim();
  const ev = text ? JSON.parse(text) : {};
  const cwd = ev.cwd || process.cwd();
  const file = ev.tool_input && typeof ev.tool_input.file_path === 'string' ? path.resolve(cwd, ev.tool_input.file_path) : null;
  // A file inside the opt-in automation worktree is checked with that worktree as the root.
  const autoRoot = file ? automationRootOf(path.dirname(file)) : null;
  if (autoRoot) return automationHook(ev, autoRoot, file);
  // The root comes from the written file's path, not from the session's working directory.
  const root = findRoot(file ? path.dirname(file) : cwd);
  // Stop also checks an open automation worktree, whether or not the main tree is an AIRE workspace.
  const autoStop = ev.hook_event_name === 'Stop' && !ev.stop_hook_active ? automationStop(root, ev) : null;
  if (!isAireWorkspace(root)) return autoStop ? { code: 0, stdout: JSON.stringify({ decision: 'block', reason: autoStop }) } : null;
  // Writes to the hook files are always allowed, so a broken doc-checks.json can still be fixed.
  if (file && (relToRoot(root, file) || '').startsWith('aire-workflow/hooks/')) return null;
  const manifest = loadManifest();
  const ctx = context(root, worktreeSource(root), branchStoryKey(root), manifest);
  const architecture = () => approvedArchitecture(root, ctx);
  const log = (rels, e) => appendHookLog(root, logStory(ctx, rels), { session: ev.session_id, event: ev.hook_event_name, ...e });

  switch (ev.hook_event_name) {
    case 'PreToolUse': {
      const w = toolWrite(ev, root, ctx);
      if (!w) return null;
      const sec = security();
      const deny = (reason) => ({ code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }) });
      const entry = { event: `PreToolUse ${ev.tool_name || ''}`.trim(), target: w.rel };
      if (isHookLog(w.rel)) {
        log([w.rel], { ...entry, checks: ['hook log lock'], result: 'BLOCKED', reason: HOOK_LOG_LOCKED });
        return deny(`${H}: ${HOOK_LOG_LOCKED}`);
      }
      // tests/e2e/ belongs to /novus-automate's automation worktree, never to a story, bug, enhancement or ve run.
      if (E2E_RX.test(w.rel) && /^(story|bug|enhancement|ve)-/.test(ctx.key || '')) {
        const msg = `tests/e2e/ is written only by /novus-automate on an automation/ branch (common/directory-structure.md rule 4d) — not by a ${ctx.key} run.`;
        log([w.rel], { ...entry, checks: ['e2e ownership'], result: 'BLOCKED', reason: msg });
        return deny(`${H}: ${msg}`);
      }
      // architecture.md Section 11 cannot be changed on a story branch.
      if (isStoryRun(ctx) && w.rel === sec.ARCHITECTURE && w.after !== null
        && sec.decisionsSection(w.before) !== sec.decisionsSection(w.after)) {
        log([w.rel], { ...entry, checks: ['security decisions lock'], result: 'BLOCKED', reason: sec.DECISIONS_LOCKED });
        return deny(`${HS}: ${sec.DECISIONS_LOCKED}`);
      }
      const next = withWrite(ctx, w.rel, w.after);
      const docs = applicableDocs(manifest, next, w.rel);
      const marks = newMarkers(manifest, next, w.rel, w.before, w.after);
      const p = uniq([
        ...checkPaths(manifest, next, [w.rel], { prereqs: true, shape: false }),
        ...newMarkerProblems(manifest, next, w.rel, w.before, w.after),
      ]);
      const added = w.after === null ? new Set() : sec.newLines(w.before, w.after);
      const s = w.after === null ? [] : sec.review([{ rel: w.rel, text: w.after, isNew: (n) => added.has(n) }], ctx.src.read, { only: (r) => r.secret, architecture });
      const reason = reasons(
        docSection("blocked — an earlier stage's document is missing, malformed or unfinished. Generate or fix it first:", p),
        securitySection(sec.LEAD_SECRET, s),
      );
      const checks = [docs.length && 'prerequisites', marks.length && 'stage marker', w.after !== null && sec.isScanned(w.rel) && 'secrets'].filter(Boolean);
      if (checks.length) {
        log([w.rel], { ...entry, stages: uniq([...docs, ...marks].map(({ d }) => d.stage)), checks, result: reason ? 'BLOCKED' : 'PASS', reason: logReason(p, s) });
      }
      return reason ? deny(reason) : null;
    }
    case 'PostToolUse': {
      const rel = relToRoot(root, file);
      if (!rel || isHookLog(rel)) return null;
      const p = checkPaths(manifest, ctx, [rel], { prereqs: false, shape: true });
      const sec = security();
      let s = [];
      if (sec.isScanned(rel)) {
        const text = ctx.src.read(rel);
        const input = ev.tool_input || {};
        // Lines added by this call: an Edit is reversed in memory to get the previous content; a Write is
        // compared with HEAD.
        const undone = ev.tool_name === 'Edit' ? sec.textBeforeEdit(text, input.old_string, input.new_string, input.replace_all === true) : null;
        const added = sec.newLines(undone !== null ? undone : headText(root, rel), text);
        s = sec.review([{ rel, text, isNew: (n) => added.has(n) }], ctx.src.read, { architecture });
      }
      const reason = reasons(docSection(`${rel} does not have its required shape — fix it now:`, p), securitySection(sec.LEAD, s));
      const docs = applicableDocs(manifest, ctx, rel);
      const checks = [docs.some(({ d }) => !d.codeRoot) && 'shape', sec.isScanned(rel) && 'security'].filter(Boolean);
      if (checks.length) {
        log([rel], { event: `PostToolUse ${ev.tool_name || ''}`.trim(), target: rel, stages: uniq(docs.map(({ d }) => d.stage)), checks, result: reason ? 'FAIL' : 'PASS', reason: logReason(p, s) });
      }
      return reason ? { code: 2, stderr: `${reason}\n` } : null;
    }
    case 'Stop': {
      if (ev.stop_hook_active) return null;
      const rels = changedFiles(root);
      const marked = rels.filter((rel) => markersFor(manifest, ctx, rel).length);
      const p = uniq([
        ...checkPaths(manifest, ctx, rels, { prereqs: true, shape: true }),
        ...marked.flatMap((rel) => newMarkerProblems(manifest, ctx, rel, headText(root, rel), ctx.src.read(rel))),
      ]);
      const sec = security();
      const code = rels.filter(sec.isScanned);
      let s = [];
      if (code.length) {
        const added = sec.addedSinceHead(root, git);
        s = sec.review(code.map((rel) => ({ rel, text: ctx.src.read(rel), isNew: sec.isNewIn(added, rel) })), ctx.src.read, { architecture });
      }
      const reason = reasons(
        docSection('documents changed since the last commit are incomplete — fix them before finishing:', p),
        securitySection(sec.LEAD, s),
      );
      const docs = rels.flatMap((rel) => applicableDocs(manifest, ctx, rel));
      const marks = marked.flatMap((rel) => newMarkers(manifest, ctx, rel, headText(root, rel), ctx.src.read(rel)));
      const checks = [docs.length && 'documents', marks.length && 'stage markers', code.length && 'security'].filter(Boolean);
      if (checks.length) {
        const listed = rels.slice(0, 5).join(', ') + (rels.length > 5 ? `, +${rels.length - 5} more` : '');
        log(rels, { target: `${rels.length} changed since HEAD: ${listed}`, stages: uniq([...docs, ...marks].map(({ d }) => d.stage)), checks, result: reason ? 'BLOCKED-STOP' : 'PASS', reason: logReason(p, s) });
      }
      const all = [reason, autoStop].filter(Boolean).join('\n\n');
      return all ? { code: 0, stdout: JSON.stringify({ decision: 'block', reason: all }) } : null;
    }
    case 'SessionStart': {
      const p = [];
      for (const d of Object.values(manifest.docs)) {
        if (d.marker || d.codeRoot || d.scope === 'story') continue;
        if (evaluate(d, ctx, 'exists').state !== 'present') continue;
        for (const x of prerequisiteProblems(manifest, d, ctx)) p.push(`${d.title} exists, but needs: ${x}`);
      }
      const reason = reasons(docSection('inconsistencies in this workspace:', uniq(p)));
      log([], { event: `SessionStart ${ev.source || ''}`.trim(), target: 'workspace', checks: ['existing documents'], result: reason ? 'WARN' : 'PASS', reason: logReason(uniq(p), []) });
      return reason ? { code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: reason } }) } : null;
    }
    default:
      return null;
  }
}

// Logs a checker failure (the hook then exits 1) to the log the event would have gone to. Best effort.
function logHookError(raw, err) {
  try {
    const ev = JSON.parse(String(raw || '').replace(/^﻿/, '').trim() || '{}');
    const cwd = ev.cwd || process.cwd();
    const file = ev.tool_input && typeof ev.tool_input.file_path === 'string' ? path.resolve(cwd, ev.tool_input.file_path) : null;
    const autoRoot = file ? automationRootOf(path.dirname(file)) : null;
    if (autoRoot) {
      appendAutomationLog(autoRoot, automationKey(autoRoot), {
        session: ev.session_id, event: `${ev.hook_event_name || 'hook'} ${ev.tool_name || ''}`.trim(), target: inAutomation(relToRoot(autoRoot, file) || ''), checks: ['checker'], result: 'ERROR', reason: err.message,
      });
      return;
    }
    const root = findRoot(file ? path.dirname(file) : cwd);
    if (!isAireWorkspace(root)) return;
    const rel = file ? relToRoot(root, file) : null;
    appendHookLog(root, logStory({ key: branchStoryKey(root) }, rel ? [rel] : []), {
      session: ev.session_id, event: `${ev.hook_event_name || 'hook'} ${ev.tool_name || ''}`.trim(), target: rel || 'workspace', checks: ['checker'], result: 'ERROR', reason: err.message,
    });
  } catch (_) { /* the event itself may be unreadable */ }
}

// Workspace files that differ from HEAD (staged, unstaged or untracked), excluding deletions, SKIP_DIRS
// and the hook log. Includes changes inside the .aire-docs/ and .aire-test-plans/ worktrees.
function changedFiles(root) {
  const files = changedIn(root);
  // Changes in the extra worktrees, limited to the paths each one holds.
  for (const [tree, own] of [[DOCS_WORKTREE, DOC_ROOT_RX], [PLANS_WORKTREE, /^test-plans[/]/]]) {
    if (fs.existsSync(path.join(root, tree, '.git'))) for (const rel of changedIn(path.join(root, tree))) if (own.test(rel) && physical(root, rel).dir !== root) files.push(rel);
  }
  return files.filter((rel) => !isHookLog(rel));
}

function changedIn(root) {
  let out;
  try { out = git(root, ['status', '--porcelain=v1', '-z', '-uall', '--', '.']); } catch (_) { return []; }
  const prefix = gitPrefix(root);
  const entries = out.split('\0');
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.length < 4) continue;
    const xy = e.slice(0, 2);
    if (/[RC]/.test(xy)) i++; // -z puts a rename's or copy's source path in the next entry
    if (xy.includes('D')) continue;
    const p = e.slice(3);
    if (!p.startsWith(prefix)) continue;
    const rel = p.slice(prefix.length);
    if (!rel.split('/').some((s) => SKIP_DIRS.has(s))) files.push(rel);
  }
  return files;
}

function headText(root, rel) {
  const p = physical(root, rel);
  try { return git(p.dir, ['show', `HEAD:./${p.rel}`]); } catch (_) { return null; } // ":./" resolves the path relative to the workspace, not the repository root
}

function main(argv) {
  const [cmd, ...args] = argv;
  if (cmd === 'hook') {
    let raw = '';
    try {
      raw = fs.readFileSync(0, 'utf8');
      const res = hookMain(raw);
      if (!res) return 0;
      if (res.stdout) process.stdout.write(res.stdout);
      if (res.stderr) process.stderr.write(res.stderr);
      return res.code;
    } catch (e) {
      logHookError(raw, e);
      process.stderr.write(`${H} could not run: ${e.message}\n`);
      return 1;
    }
  }
  const manifest = loadManifest();
  if (cmd === 'selftest') {
    const p = selftest(manifest);
    if (p.length) { console.log(p.join('\n')); return 1; }
    return 0;
  }
  const root = findRoot(process.cwd());
  if (!isAireWorkspace(root)) return 0;
  const keyArg = args.find((a) => a.startsWith('--story='));
  const rest = args.filter((a) => !a.startsWith('--'));
  const src = cmd === 'staged' ? indexSource(root) : worktreeSource(root);
  const ctx = context(root, src, keyArg ? keyArg.slice('--story='.length) : branchStoryKey(root), manifest);
  const rels = () => rest.map((p) => relToRoot(root, path.resolve(p))).filter(Boolean);
  let problems = [];
  if (cmd === 'check') problems = checkPaths(manifest, ctx, rels(), { prereqs: true, shape: true, done: true });
  else if (cmd === 'before') problems = checkPaths(manifest, ctx, rels(), { prereqs: true, shape: false });
  else if (cmd === 'stage') {
    if (!rest[0] || !(manifest.stages || []).some((s) => s.id === rest[0])) { console.log('stages: ' + (manifest.stages || []).map((s) => s.id).join(', ')); return 1; }
    problems = stageProblems(manifest, ctx, rest[0]);
  } else if (cmd === 'staged') {
    const staged = git(root, ['diff', '--cached', '--name-only', '--relative', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
    problems = uniq([
      ...checkPaths(manifest, ctx, staged, { prereqs: true, shape: true, done: true }),
      ...staged.flatMap((rel) => (markersFor(manifest, ctx, rel).length ? newMarkerProblems(manifest, ctx, rel, headText(root, rel), src.read(rel)) : [])),
    ]);
  } else if (cmd === 'status') {
    const rows = [];
    for (const d of Object.values(manifest.docs)) {
      if (d.codeRoot) continue;
      let res; try { res = evaluate(d, ctx, 'done'); } catch (e) { res = { state: 'error', problems: [e.message] }; }
      rows.push([d.stage, d.id, res.state, res.problems.slice(0, 2).join('; ')]);
    }
    const w = [0, 0, 0];
    for (const r of rows) for (let i = 0; i < 3; i++) w[i] = Math.max(w[i], r[i].length);
    for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${r[1].padEnd(w[1])}  ${r[2].padEnd(w[2])}  ${r[3]}`.trimEnd());
    return rows.some((r) => r[2] === 'invalid' || r[2] === 'error') ? 1 : 0;
  } else {
    console.log('usage: check-docs.cjs hook | check <path..> | before <path..> | stage <stage> | staged | status | selftest  [--story=<key>]');
    return 1;
  }
  if (problems.length) { console.log(problems.join('\n')); return 1; }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {
  main, hookMain, logHookError, applyEdit, loadManifest, evaluate, CROSS, templateToRegex, parseGraph, trackerRows, section, selftest,
  reasons, docSection, securitySection, storyKeyForBranch,
  // used by check-security.cjs's command line
  findRoot, isAireWorkspace, relToRoot, changedFiles, git, context, worktreeSource, branchStoryKey, approvedArchitecture,
};
