#!/usr/bin/env node
'use strict';

// Static security check for code written in an AIRE workspace. Applies the pattern rules in
// security-rules.cjs; each rule maps to a SECURITY-NN rule of the security baseline and an OWASP Top
// 10:2025 category. Called from the check-docs.cjs hook handlers and usable from the command line.
// No dependencies.
//
// Only lines added by a change are evaluated, so existing code never blocks new work. The rules are
// single-line or single-block patterns; anything requiring data-flow or authorization analysis is left
// to code review.
//
// A finding is suppressed only by a row of the "## 11. Security Decisions" table in
// spec/plans/architecture.md (implementation/architecture-doc.md Section 2.2):
//   | Rule | Applies to | Decision | Source |
//   | access/cors-any-origin | src/public-api/** | Public, read-only API; no cookies, no auth | REQ-NF-04 |
// Rule is a rule id, Applies to a workspace-relative path or glob, Decision the reason, and Source a
// live REQ-ID in requirements.md or an existing design document in spec/plans/. Invalid rows are ignored
// and reported. The hook handlers choose which architecture.md is read (see approvedArchitecture() in
// check-docs.cjs).
//
// Commands (node aire-workflow/hooks/check-security.cjs <command>):
//   scan [path..]        lines added since HEAD in the given files, or in every changed file
//   scan --all [path..]  every line, not only added ones
//   rules                list the rules: id, SECURITY-NN, OWASP category, languages
//   selftest             each rule must match its bad examples and none of its good ones
//
// Exit codes: 0 no findings, or not an AIRE workspace; 1 findings, or selftest problems.

const fs = require('fs');
const path = require('path');
const RULES = require('./security-rules.cjs');

const ARCHITECTURE = 'spec/plans/architecture.md';
const REQUIREMENTS = 'spec/plans/requirements.md';
const DECISIONS = '11. Security Decisions';

const OWASP = {
  'A01:2025': 'Broken Access Control',
  'A02:2025': 'Security Misconfiguration',
  'A03:2025': 'Software Supply Chain Failures',
  'A04:2025': 'Cryptographic Failures',
  'A05:2025': 'Injection',
  'A06:2025': 'Insecure Design',
  'A07:2025': 'Authentication Failures',
  'A08:2025': 'Software or Data Integrity Failures',
  'A09:2025': 'Logging & Alerting Failures',
  'A10:2025': 'Mishandling of Exceptional Conditions',
};

// Default OWASP category per SECURITY-NN rule. A rule's `owasp` field overrides it (for example SSRF and
// path traversal are A01:2025, XXE is A02:2025).
const BASELINE_OWASP = {
  'SECURITY-01': 'A04:2025', 'SECURITY-02': 'A09:2025', 'SECURITY-03': 'A09:2025', 'SECURITY-04': 'A02:2025',
  'SECURITY-05': 'A05:2025', 'SECURITY-06': 'A01:2025', 'SECURITY-07': 'A02:2025', 'SECURITY-08': 'A01:2025',
  'SECURITY-09': 'A02:2025', 'SECURITY-10': 'A03:2025', 'SECURITY-11': 'A06:2025', 'SECURITY-12': 'A07:2025',
  'SECURITY-13': 'A08:2025', 'SECURITY-14': 'A09:2025', 'SECURITY-15': 'A10:2025', 'SECURITY-16': 'A04:2025',
};

const owaspOf = (r) => r.owasp || BASELINE_OWASP[r.baseline];

// Paths that are never scanned: AIRE documents, test plans, evidence and framework files, dependency
// folders, lock files and minified bundles. Project tests under tests/ are scanned like application code.
const NOT_SCANNED = /^(?:aire-workflow|aire-archives|spec|reports|runtime-artifacts|test-plans|framework-tests|\.aire-docs|\.aire-test-plans|\.claude|\.git)\//;
const SKIP_SEGMENTS = new Set(['node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', 'target', '.next', 'coverage', 'vendor', '.terraform']);
const GENERATED = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Pipfile\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock|go\.sum|packages\.lock\.json)$|\.min\.(?:js|css)$|\.map$/;

const EXT = {
  js: 'js', mjs: 'js', cjs: 'js', jsx: 'js', ts: 'js', tsx: 'js', mts: 'js', cts: 'js', vue: 'js', svelte: 'js',
  py: 'py', pyw: 'py',
  java: 'jvm', kt: 'jvm', kts: 'jvm', scala: 'jvm', groovy: 'jvm',
  go: 'go', cs: 'cs', php: 'php', rb: 'rb',
  tf: 'tf', tfvars: 'tf', hcl: 'tf',
  yml: 'yaml', yaml: 'yaml', json: 'json',
  html: 'html', htm: 'html', cshtml: 'html', razor: 'html', jinja: 'html', jinja2: 'html', j2: 'html', hbs: 'html', ejs: 'html', njk: 'html', twig: 'html', erb: 'html', jsp: 'html',
  sh: 'shell', bash: 'shell', zsh: 'shell', ksh: 'shell', ps1: 'ps', psm1: 'ps',
  properties: 'config', ini: 'config', cfg: 'config', conf: 'config', toml: 'config', env: 'config', xml: 'config', config: 'config', csproj: 'config', fsproj: 'config', props: 'config', gradle: 'jvm',
  md: 'text', txt: 'text', sql: 'text',
};
const NAMED = { makefile: 'text', procfile: 'text', jenkinsfile: 'text', vagrantfile: 'rb', gemfile: 'rb', '.npmrc': 'config', '.pypirc': 'config', '.netrc': 'config', '.yarnrc': 'config', pipfile: 'config' };
const LANGS = new Set(['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb', 'tf', 'yaml', 'json', 'html', 'shell', 'ps', 'config', 'docker', 'text']);

function langOf(rel) {
  const base = path.posix.basename(rel).toLowerCase();
  if (/^(?:dockerfile|containerfile)(?:\..+)?$|\.(?:dockerfile|containerfile)$/.test(base)) return 'docker';
  if (/^\.env(?:\..+)?$/.test(base)) return 'config';
  if (NAMED[base]) return NAMED[base];
  const dot = base.lastIndexOf('.');
  return dot > 0 || (dot === 0 && base.length > 1) ? EXT[base.slice(dot + 1)] || null : null;
}

function isScanned(rel) {
  if (!rel || NOT_SCANNED.test(rel) || GENERATED.test(rel)) return false;
  if (rel.split('/').some((s) => SKIP_SEGMENTS.has(s))) return false;
  return langOf(rel) !== null;
}

// 1-based line numbers of `after` that are not in `before`, compared as a multiset of line texts:
// moved or unchanged lines are not new, edited lines are. `before` null means every line is new.
function newLines(before, after) {
  const lines = String(after).split(/\r?\n/);
  if (before === null || before === undefined) return new Set(lines.map((_, i) => i + 1));
  const pool = new Map();
  for (const l of String(before).split(/\r?\n/)) pool.set(l, (pool.get(l) || 0) + 1);
  const out = new Set();
  lines.forEach((l, i) => {
    const n = pool.get(l) || 0;
    if (n > 0) pool.set(l, n - 1); else out.add(i + 1);
  });
  return out;
}

// Reconstructs a file's content before an Edit by replacing new_string with old_string in the current
// content. Returns null when new_string is empty or not found; the caller then compares with HEAD.
function textBeforeEdit(after, oldStr, newStr, all) {
  if (typeof after !== 'string' || typeof oldStr !== 'string' || typeof newStr !== 'string' || newStr === '') return null;
  for (const lf of [false, true]) {
    const n = (s) => (lf ? s.replace(/\r\n/g, '\n') : s);
    const a = n(after); const o = n(oldStr); const r = n(newStr);
    if (a.includes(r)) return all ? a.split(r).join(o) : a.replace(r, () => o);
  }
  return null;
}

// Parses `git diff HEAD -U0` output into Map(path -> Set of added line numbers). Untracked files do not
// appear in the diff; callers treat them as entirely new.
function parseAddedLines(diff) {
  const map = new Map();
  let cur = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).replace(/^"|"$/g, '');
      cur = p === '/dev/null' ? null : p.replace(/^b\//, '');
      if (cur && !map.has(cur)) map.set(cur, new Set());
    } else if (cur && line.startsWith('@@')) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(line);
      if (!m) continue;
      const start = +m[1]; const count = m[2] === undefined ? 1 : +m[2];
      for (let k = 0; k < count; k++) map.get(cur).add(start + k);
    }
  }
  return map;
}

const COMMENT_HASH = new Set(['py', 'rb', 'shell', 'docker', 'yaml', 'config', 'ps', 'tf', 'text']);
const COMMENT_SLASH = new Set(['js', 'jvm', 'go', 'cs', 'php', 'tf']);

// True when the line is a whole-line comment in the given language.
function isCommentLine(line, lang) {
  const t = line.trimStart();
  if (COMMENT_HASH.has(lang) && t.startsWith('#') && !t.startsWith('#{')) return true;
  if (COMMENT_SLASH.has(lang) && (t.startsWith('//') || t.startsWith('/*') || /^\*(?!\*)/.test(t) || t.startsWith('*/'))) return true;
  if (lang === 'php' && t.startsWith('#') && !t.startsWith('#[')) return true;
  if ((lang === 'html' || lang === 'config') && t.startsWith('<!--')) return true;
  if (lang === 'config' && t.startsWith(';')) return true;
  return false;
}

// Returns the line with string literal contents replaced by spaces and any trailing comment removed.
// Interpolated expressions (${x}, #{x}, and {x} in f-strings and $"..." strings) are kept. Used by rules
// that must match identifiers, not text inside strings.
function codeOnly(line, lang) {
  let out = '';
  let i = 0;
  const hashComments = COMMENT_HASH.has(lang) || lang === 'php';
  while (i < line.length) {
    const c = line[i];
    if (c === '/' && line[i + 1] === '/' && COMMENT_SLASH.has(lang)) break;
    if (c === '#' && hashComments && line[i + 1] !== '{' && line[i + 1] !== '[') break;
    if (c === '"' || c === "'" || c === '`') {
      const prefix = /[fF][rR]?$|[rR][fF]$|\$@?$|@\$$/.test(out) ? 'format' : '';
      out += c; i++;
      while (i < line.length && line[i] !== c) {
        if (line[i] === '\\') { out += '  '; i += 2; continue; }
        const interp = (line[i] === '$' || line[i] === '#') && line[i + 1] === '{' ? 2 : prefix && line[i] === '{' && line[i + 1] !== '{' ? 1 : 0;
        if (interp) {
          let depth = 1; let j = i + interp;
          while (j < line.length && depth) { if (line[j] === '{') depth++; else if (line[j] === '}') depth--; j++; }
          out += ' ' + line.slice(i + interp, j - 1) + ' ';
          i = j; continue;
        }
        out += ' '; i++;
      }
      if (i < line.length) { out += c; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// A rule field may be a value or an object keyed by language; returns the value for `lang`.
const forLang = (x, lang) => (x instanceof RegExp || typeof x === 'function' || x == null ? x : x[lang]);
const ruleLangs = (r) => (r.re && !(r.re instanceof RegExp) ? Object.keys(r.re) : r.langs || []);
// True when rule `r` covers language `lang` and its `path` filter (if any) matches `rel`.
const appliesTo = (r, lang, rel) => {
  const langs = ruleLangs(r);
  if (!(langs.includes('*') ? lang !== null : langs.includes(lang))) return false;
  return !r.path || r.path.test(rel);
};

// Global-flag copy of a regex, cached per regex, with lastIndex reset.
const globalCache = new WeakMap();
function globalOf(re) {
  let g = globalCache.get(re);
  if (!g) { g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); globalCache.set(re, g); }
  g.lastIndex = 0;
  return g;
}

// True when rule `r` matches a line: its pattern (and `when`) on `target`, `also` on `target`, and none
// of `unless` (on the raw line) or `unlessNear` (on the surrounding lines).
function lineMatches(r, lang, target, raw, at) {
  const re = forLang(r.re, lang);
  if (!re) return false;
  if (r.when) {
    let hit = false;
    for (const m of target.matchAll(globalOf(re))) if (r.when(m, at)) { hit = true; break; }
    if (!hit) return false;
  } else if (!re.test(target)) return false;
  const also = forLang(r.also, lang);
  if (also && !also.test(target)) return false;
  const unless = forLang(r.unless, lang);
  if (unless && unless.test(raw)) return false;
  if (r.unlessNear) {
    for (let j = Math.max(0, at.i - r.unlessNear.lines); j <= Math.min(at.lines.length - 1, at.i + r.unlessNear.lines); j++) {
      if (r.unlessNear.re.test(at.lines[j])) return false;
    }
  }
  return true;
}

const MAX_LINE = 5000; // longer lines (minified or generated) are checked for secrets only

// Findings for `text` at workspace path `rel`: [{ rule, line, end, detail }], sorted by line. A finding is
// kept when any line it spans satisfies isNew(lineNumber). `only(rule)` restricts the rule set.
function scanText(rel, text, isNew = () => true, only = null) {
  const lang = langOf(rel);
  if (!lang || typeof text !== 'string' || !text) return [];
  const lines = text.split(/\r?\n/);
  const anyNew = (a, b) => { for (let n = a; n <= b; n++) if (isNew(n)) return true; return false; };
  const out = [];
  for (const r of RULES) {
    if ((only && !only(r)) || !appliesTo(r, lang, rel)) continue;
    const unlessFile = forLang(r.unlessFile, lang);
    if (unlessFile && unlessFile.test(text)) continue;
    const alsoFile = forLang(r.alsoFile, lang);
    if (alsoFile && !alsoFile.test(text)) continue;
    if (r.check) {
      for (const f of r.check(text, lines, lang)) {
        const end = f.end || f.line;
        if (anyNew(f.line, end)) out.push({ rule: r, line: f.line, end, detail: f.detail || '' });
      }
      continue;
    }
    if (r.multiline) {
      const re = forLang(r.re, lang);
      if (!re) continue;
      for (const m of text.matchAll(globalOf(re))) {
        const line = text.slice(0, m.index).split('\n').length;
        const end = line + (m[0].match(/\n/g) || []).length;
        if (!r.comments && isCommentLine(lines[line - 1], lang)) continue;
        if (anyNew(line, end)) out.push({ rule: r, line, end, detail: '' });
      }
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!isNew(i + 1)) continue;
      const raw = lines[i];
      if (raw.length > MAX_LINE && !r.secret) continue;
      if (!r.comments && isCommentLine(raw, lang)) continue;
      const target = r.code ? codeOnly(raw, lang) : raw;
      if (lineMatches(r, lang, target, raw, { lines, i, lang, target })) out.push({ rule: r, line: i + 1, end: i + 1, detail: '' });
    }
  }
  return out.sort((a, b) => a.line - b.line);
}

// Converts a path glob (*, **, ?) to an anchored regex; case-insensitive on Windows. Cached.
const globCache = new Map();
function globToRegex(g) {
  let rxp = globCache.get(g);
  if (rxp) return rxp;
  let s = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; s += '(?:.*/)?'; } else s += '.*'; } else s += '[^/]*';
    } else if (c === '?') s += '[^/]';
    else s += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  rxp = new RegExp(`^${s}$`, process.platform === 'win32' ? 'i' : '');
  globCache.set(g, rxp);
  return rxp;
}

// Text under "## 11. Security Decisions" in architecture.md up to the next "## " heading, or null.
function decisionsSection(arch) {
  if (!arch) return null;
  const lines = arch.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+11\.\s*Security Decisions\b/i.test(l));
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join('\n');
}

// REQ-IDs in requirements.md that are neither struck through nor marked SUPERSEDED.
function liveReqIds(text) {
  const all = new Set(text.match(/REQ-(?:F|NF)-\d{2,}/g) || []);
  return new Set([...all].filter((r) => !new RegExp(`~~[^~\\n]*\\b${r}\\b[^~\\n]*~~|\\b${r}\\b[^\\n]*\\bSUPERSEDED\\b`).test(text)));
}

// Parses the Security Decisions table in `arch` into { entries: [{ rule, path }], problems }. read(rel)
// is used to check each row's Source against requirements.md and the files in spec/plans/.
function parseDecisions(arch, read) {
  const body = decisionsSection(arch);
  if (!body) return { entries: [], problems: [] };
  const ids = new Set(RULES.map((r) => r.id));
  const reqs = liveReqIds(read(REQUIREMENTS) || '');
  const entries = []; const problems = [];
  for (const row of body.split(/\r?\n/).filter((l) => /^\s*\|/.test(l) && !/^\s*\|\s*:?-/.test(l))) {
    const [rule = '', applies = '', decision = '', source = ''] = row.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ''));
    if (/^rule$/i.test(rule) || /^<.*>$/.test(rule)) continue; // the header, the template's placeholder row
    const where = `${ARCHITECTURE} Section 11 row "${rule.slice(0, 40)}"`;
    const missing = [['Rule', rule], ['Applies to', applies], ['Decision', decision], ['Source', source]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) { problems.push(`${where} ignored: no ${missing.join(', ')}`); continue; }
    if (!ids.has(rule)) { problems.push(`${where} ignored: no rule "${rule}" (node aire-workflow/hooks/check-security.cjs rules)`); continue; }
    const reqHit = (source.match(/REQ-(?:F|NF)-\d{2,}/g) || []).some((r) => reqs.has(r));
    const docHit = (source.match(/[\w./-]+\.md\b/g) || []).some((d) => {
      const p = d.startsWith('spec/plans/') ? d : `spec/plans/${path.posix.basename(d)}`;
      return p !== ARCHITECTURE && read(p) !== null;
    });
    if (!reqHit && !docHit) { problems.push(`${where} ignored: Source cites no live REQ-ID of ${REQUIREMENTS} and no design document in spec/plans/`); continue; }
    entries.push({ rule, path: globToRegex(applies.replace(/^\.?\//, '')) });
  }
  return { entries, problems };
}

// Formats a finding as one line. The fix text is included the first time a rule is reported. The source
// line of a secret is never included.
function describe(rel, f, lines, firstOfRule) {
  const r = f.rule; const ow = owaspOf(r);
  const where = f.end > f.line ? `${rel}:${f.line}-${f.end}` : `${rel}:${f.line}`;
  const code = (lines[f.line - 1] || '').trim();
  const shown = code.length > 100 ? `${code.slice(0, 97)}...` : code;
  const what = r.secret ? '' : ` — \`${shown}\``;
  const fix = firstOfRule ? `. Fix: ${r.fix}` : ` (fix as above for ${r.id})`;
  return `${where} [${r.baseline} | ${ow} ${OWASP[ow]} | rule ${r.id}] ${r.title}${f.detail ? ` (${f.detail})` : ''}${what}${fix}`;
}

// Formatted findings for a set of files, minus those covered by a Security Decision, followed by any
// problems with the decisions table. Returns [] when nothing is found.
//   files         [{ rel, text, isNew }]
//   read(rel)     reads workspace files (requirements, design documents)
//   only(rule)    restricts the rule set
//   architecture  () -> architecture.md text to take decisions from; called only when there are findings
function review(files, read, { only = null, architecture = () => read(ARCHITECTURE) } = {}) {
  const found = [];
  for (const { rel, text, isNew } of files) {
    if (!isScanned(rel) || typeof text !== 'string') continue;
    const lines = text.split(/\r?\n/);
    const hits = scanText(rel, text, isNew, only);
    // Drop the generic credential finding on a line that already has a specific secret-format finding.
    const secretLines = new Set(hits.filter((f) => f.rule.secret).map((f) => f.line));
    for (const f of hits) if (!(f.rule.id.startsWith('secret/hardcoded-credential') && secretLines.has(f.line))) found.push({ rel, f, lines });
  }
  if (!found.length) return [];
  const { entries, problems } = parseDecisions(architecture(), read);
  const out = [];
  const reported = new Set();
  for (const { rel, f, lines } of found) {
    if (entries.some((e) => e.rule === f.rule.id && e.path.test(rel))) continue;
    out.push(describe(rel, f, lines, !reported.has(f.rule.id)));
    reported.add(f.rule.id);
  }
  return out.length ? [...out, ...problems] : [];
}

const LEAD = 'code added in this session breaks the AIRE Security Baseline. Fix every finding in the code — do not suppress, '
  + 'rename or move it. A rule is skipped only where the approved design says it does not apply (spec/plans/architecture.md '
  + 'Section 11 Security Decisions, sourced from the requirements or design); never add such a decision while writing code. '
  + 'If you believe the design should allow it, stop and tell the user.';
const LEAD_SECRET = 'blocked — this write would put a secret into the repository. Read it at runtime from a secrets manager or '
  + 'the environment instead, and do not write the value anywhere else in the workspace.';
const DECISIONS_LOCKED = `${ARCHITECTURE} Section 11 (Security Decisions) is part of the approved design. While a story is `
  + 'being built its decisions are read from the epic branch as committed, so a change made here would not count. Fix the code '
  + 'instead; if the design itself is wrong, stop and tell the user (epic-change-request amends the design).';

// Validates the rule set: required fields, known languages and categories, and that every rule matches
// all of its bad examples (covering each of its languages) and none of its good examples.
function selftest() {
  const problems = [];
  const seen = new Set();
  for (const r of RULES) {
    const id = r.id || '(no id)';
    if (!r.id) problems.push('a rule has no id');
    if (seen.has(id)) problems.push(`${id}: duplicate id`);
    seen.add(id);
    if (!/^SECURITY-(?:0[1-9]|1[0-6])$/.test(r.baseline || '')) problems.push(`${id}: baseline "${r.baseline}" is not SECURITY-01..16`);
    if (!OWASP[owaspOf(r)]) problems.push(`${id}: OWASP "${owaspOf(r)}" is not A01:2025..A10:2025`);
    if (!r.title || !r.fix) problems.push(`${id}: needs a title and a fix`);
    if (!r.re && !r.check) problems.push(`${id}: needs re or check`);
    const langs = ruleLangs(r);
    if (!langs.length) problems.push(`${id}: no languages`);
    for (const l of langs) if (l !== '*' && !LANGS.has(l)) problems.push(`${id}: unknown language "${l}"`);
    if (!Array.isArray(r.bad) || !r.bad.length || !Array.isArray(r.good) || !r.good.length) { problems.push(`${id}: needs bad and good examples`); continue; }
    const badLangs = new Set();
    for (const [file, text] of r.bad) {
      badLangs.add(langOf(file));
      if (!appliesTo(r, langOf(file), file)) problems.push(`${id}: bad example ${file} is outside the rule's languages or path`);
      else if (!scanText(file, text).some((f) => f.rule === r)) problems.push(`${id}: not found in bad example ${file}: ${text.replace(/\n/g, '\\n').slice(0, 90)}`);
    }
    for (const [file, text] of r.good) {
      const hit = scanText(file, text).find((f) => f.rule === r);
      if (hit) problems.push(`${id}: false positive on good example ${file}:${hit.line}: ${text.split('\n')[hit.line - 1].slice(0, 90)}`);
    }
    if (r.re && !(r.re instanceof RegExp)) for (const l of Object.keys(r.re)) if (!badLangs.has(l)) problems.push(`${id}: no bad example for its ${l} pattern`);
  }
  return problems;
}

function main(argv) {
  const [cmd, ...args] = argv;
  if (cmd === 'selftest') {
    const p = selftest();
    if (p.length) { console.log(p.join('\n')); return 1; }
    console.log(`${RULES.length} rules: every bad example found, no good example flagged`);
    return 0;
  }
  if (cmd === 'rules') {
    for (const r of RULES) console.log(`${r.id.padEnd(38)} ${r.baseline}  ${owaspOf(r)}  ${r.secret ? 'refused before write  ' : ''}${ruleLangs(r).join(',')}`);
    return 0;
  }
  if (cmd !== 'scan') {
    console.log('usage: check-security.cjs scan [--all] [path..] | rules | selftest');
    return 1;
  }
  const docs = require('./check-docs.cjs');
  const root = docs.findRoot(process.cwd());
  if (!docs.isAireWorkspace(root)) return 0;
  const all = args.includes('--all');
  const paths = args.filter((a) => !a.startsWith('--'));
  const rels = paths.length ? paths.map((p) => docs.relToRoot(root, path.resolve(p))).filter(Boolean) : docs.changedFiles(root);
  const added = all ? null : addedSinceHead(root, docs.git);
  const ctx = docs.context(root, docs.worktreeSource(root), docs.branchStoryKey(root), null);
  const read = (rel) => ctx.src.read(rel);
  const files = rels.map((rel) => ({ rel, text: read(rel), isNew: isNewIn(added, rel) }));
  const out = review(files, read, { architecture: () => docs.approvedArchitecture(root, ctx) });
  if (out.length) { console.log(out.join('\n')); return 1; }
  return 0;
}

// Added lines per file since HEAD, staged and unstaged, from a single git diff. Returns null when the
// repository has no commit yet. git(root, args) runs git and returns its stdout.
function addedSinceHead(root, git) {
  try {
    return parseAddedLines(git(root, ['-c', 'core.quotepath=off', 'diff', 'HEAD', '--no-color', '--no-ext-diff', '-U0', '--relative', '--src-prefix=a/', '--dst-prefix=b/', '--', '.']));
  } catch (_) {
    return null;
  }
}

// isNew(lineNumber) for a file: true for the lines git reports as added, or for every line when the file
// is untracked or there is no HEAD.
const isNewIn = (added, rel) => { const set = added && added.get(rel); return set ? (n) => set.has(n) : () => true; };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {
  RULES, ARCHITECTURE, DECISIONS, LEAD, LEAD_SECRET, DECISIONS_LOCKED,
  langOf, isScanned, newLines, textBeforeEdit, parseAddedLines, addedSinceHead, isNewIn, codeOnly, scanText, decisionsSection, parseDecisions, review, selftest, main,
};
