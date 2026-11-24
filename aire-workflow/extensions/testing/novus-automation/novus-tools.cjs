#!/usr/bin/env node
'use strict';
// novus-tools.cjs — deterministic helpers for the opt-in /novus-automate skill
// (extensions/testing/novus-automation/novus-automation.md). No dependencies. Every command prints JSON.
//
//   probe <url>                      HTTP GET, 15 s timeout, redirects followed, TLS errors reported.
//                                    Exit 0 when the final status is below 500.
//   hash-case <plan-file> <TC-ID>    SHA-256 of the normalised case text (NA-09).
//   hash-body <java-file> <method>   SHA-256 of the normalised method body (NA-09).
//   scan <dir>                       do-not-use patterns + missing @Test annotations (*.java)
//                                    + URL literals (*.java, *.properties). Exit 1 on findings.
//   url-scan <dir>                   URL literals only. Exit 1 on findings.
//
// Hashes and scans are computed here, never by the model.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REFERENCE = path.join(__dirname, 'novus-syntax-reference.md');
const SKIP_DIRS = new Set(['.git', 'target', 'node_modules', 'reports', 'screenshots']);
const TLDS = new Set(['com', 'net', 'org', 'io', 'dev', 'app', 'cloud', 'ai', 'co', 'local', 'internal', 'test']);
const REQUIRED_ANNOTATIONS = ['MetaData', 'Description', 'Outcome'];

// ---------------------------------------------------------------------------------------------------
// Normalisation and hashing

function normalise(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  const out = [];
  for (const line of lines) {
    if (line === '' && out.length && out[out.length - 1] === '') continue;
    out.push(line);
  }
  while (out.length && out[0] === '') out.shift();
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function escapeRx(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function caseText(planText, tcId) {
  const lines = String(planText).replace(/\r\n?/g, '\n').split('\n');
  const start = new RegExp('^### ' + escapeRx(tcId) + '(?=\\s|$)');
  const i = lines.findIndex((l) => start.test(l));
  if (i < 0) return null;
  let j = i + 1;
  while (j < lines.length && !/^(### |## )/.test(lines[j])) j++;
  return lines.slice(i, j).join('\n');
}

function hashCase(planFile, tcId) {
  const text = caseText(fs.readFileSync(planFile, 'utf8'), tcId);
  if (text === null) return { ok: false, error: `case ${tcId} not found in ${planFile}` };
  return { ok: true, tc: tcId, hash: sha256(normalise(text)) };
}

// ---------------------------------------------------------------------------------------------------
// Java-aware scanning: classify every character as code, comment or literal.

// Returns an array of segments {kind: 'code'|'comment'|'string'|'char', start, end} covering src.
function lexJava(src) {
  const segs = [];
  let i = 0;
  let segStart = 0;
  let kind = 'code';
  const n = src.length;
  const push = (k, s, e) => { if (e > s) segs.push({ kind: k, start: s, end: e }); };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      push(kind, segStart, i);
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      push('comment', i, j);
      i = j; segStart = i; continue;
    }
    if (c === '/' && d === '*') {
      push(kind, segStart, i);
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      push('comment', i, j);
      i = j; segStart = i; continue;
    }
    if (c === '"' && src.startsWith('"""', i)) {
      push(kind, segStart, i);
      let j = i + 3;
      while (j < n && !(src.startsWith('"""', j) && src[j - 1] !== '\\')) j++;
      j = Math.min(n, j + 3);
      push('string', i, j);
      i = j; segStart = i; continue;
    }
    if (c === '"' || c === '\'') {
      push(kind, segStart, i);
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      j = Math.min(n, j + 1);
      push(c === '"' ? 'string' : 'char', i, j);
      i = j; segStart = i; continue;
    }
    i++;
  }
  push(kind, segStart, n);
  return segs;
}

// The source with comments blanked (newlines kept), for pattern scans.
function stripComments(src) {
  let out = '';
  for (const s of lexJava(src)) {
    const t = src.slice(s.start, s.end);
    out += s.kind === 'comment' ? t.replace(/[^\n]/g, ' ') : t;
  }
  return out;
}

// The source with comments AND literal contents blanked, so braces and parentheses are structural.
function codeOnly(src) {
  let out = '';
  for (const s of lexJava(src)) {
    const t = src.slice(s.start, s.end);
    out += s.kind === 'code' ? t : t.replace(/[^\n]/g, ' ');
  }
  return out;
}

function methodBody(src, method) {
  const code = codeOnly(src);
  const decl = new RegExp('\\b' + escapeRx(method) + '\\s*\\(', 'g');
  let m;
  while ((m = decl.exec(code))) {
    // Skip calls: a declaration's '(' ... ')' is followed (after optional throws) by '{'.
    let k = m.index + m[0].length;
    let depth = 1;
    while (k < code.length && depth) { if (code[k] === '(') depth++; else if (code[k] === ')') depth--; k++; }
    const after = code.slice(k).match(/^\s*(throws\s+[\w.,\s]+)?\{/);
    if (!after) continue;
    const open = k + after[0].length - 1;
    let j = open + 1;
    depth = 1;
    while (j < code.length && depth) { if (code[j] === '{') depth++; else if (code[j] === '}') depth--; j++; }
    if (depth) return null;
    return src.slice(open + 1, j - 1);
  }
  return null;
}

function hashBody(javaFile, method) {
  const body = methodBody(fs.readFileSync(javaFile, 'utf8'), method);
  if (body === null) return { ok: false, error: `method ${method} not found in ${javaFile}` };
  return { ok: true, method, hash: sha256(normalise(body)) };
}

// ---------------------------------------------------------------------------------------------------
// Do-not-use patterns, parsed from the reference's section 6 table.

function doNotUsePatterns(referenceText) {
  const text = referenceText === undefined ? fs.readFileSync(REFERENCE, 'utf8') : referenceText;
  const start = text.search(/^## 6\. Do-not-use list/m);
  if (start < 0) throw new Error('novus-syntax-reference.md has no "## 6. Do-not-use list" section');
  const rest = text.slice(start);
  const end = rest.slice(3).search(/^## /m);
  const section = end < 0 ? rest : rest.slice(0, end + 3);
  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (m) out.push(m[1]);
  }
  if (!out.length) throw new Error('no do-not-use patterns found in section 6');
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Checks

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function checkDoNotUse(src, patterns) {
  const code = stripComments(src);
  const findings = [];
  for (const p of patterns) {
    const rx = new RegExp(p, 'g');
    let m;
    while ((m = rx.exec(code))) {
      findings.push({ check: 'do-not-use', pattern: p, line: lineOf(code, m.index) });
      if (m[0] === '') rx.lastIndex++;
    }
  }
  return findings;
}

function checkAnnotations(src) {
  const code = codeOnly(src);
  const lines = code.split('\n');
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/(^|\s)@Test\b(?!\w)/.test(lines[i])) continue;
    // The annotation block: contiguous lines of annotations (and blanks) around @Test, up to the signature.
    const found = new Set();
    for (let j = i; j >= 0; j--) {
      const t = lines[j].trim();
      if (t === '' && j !== i) continue;
      if (!t.startsWith('@') && j !== i) break;
      for (const a of t.matchAll(/@(\w+)/g)) found.add(a[1]);
    }
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t === '') continue;
      if (!t.startsWith('@')) break;
      for (const a of t.matchAll(/@(\w+)/g)) found.add(a[1]);
    }
    const missing = REQUIRED_ANNOTATIONS.filter((a) => !found.has(a));
    if (missing.length) findings.push({ check: 'annotations', line: i + 1, missing });
  }
  return findings;
}

function looksLikeHost(value) {
  const v = value.trim();
  if (v.includes('@')) return false;
  const m = v.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(:\d+)?(\/.*)?$/i);
  if (!m) return false;
  const last = m[1].split('.').pop().toLowerCase();
  return TLDS.has(last) || /^[a-z]{2}$/.test(last);
}

function urlProblem(value) {
  if (value.includes('@')) return null;
  if (/https?:\/\//i.test(value)) return 'url';
  if (/(^|[^\d.])(\d{1,3}\.){3}\d{1,3}(?![\d.])/.test(value)) return 'ipv4';
  if (looksLikeHost(value)) return 'host';
  return null;
}

function checkUrlsJava(src) {
  const findings = [];
  const lineStarts = [];
  for (const s of lexJava(src)) {
    if (s.kind !== 'string') continue;
    const lineNo = lineOf(src, s.start);
    if (!lineStarts[lineNo]) {
      const lineText = src.split('\n')[lineNo - 1] || '';
      lineStarts[lineNo] = /^\s*(package|import)\b/.test(lineText) ? 'skip' : 'scan';
    }
    if (lineStarts[lineNo] === 'skip') continue;
    const raw = src.slice(s.start, s.end).replace(/^"""|"""$|^"|"$/g, '');
    const problem = urlProblem(raw);
    if (problem) findings.push({ check: 'url-literal', kind: problem, line: lineNo, literal: raw });
  }
  return findings;
}

function checkUrlsProperties(src) {
  const findings = [];
  src.split(/\r?\n/).forEach((line, idx) => {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) return;
    const eq = t.search(/[=:]/);
    if (eq < 0) return;
    const key = t.slice(0, eq).trim();
    if (key === 'aut.allowedHosts') return;
    const value = t.slice(eq + 1).trim();
    const problem = urlProblem(value.replace(/\$\{[^}]*\}/g, ''));
    if (problem) findings.push({ check: 'url-literal', kind: problem, line: idx + 1, literal: value });
  });
  return findings;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else out.push(path.join(dir, e.name));
  }
  return out;
}

function scanDir(dir, { urlOnly = false, patterns } = {}) {
  const pats = urlOnly ? [] : (patterns || doNotUsePatterns());
  const findings = [];
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/');
    if (file.endsWith('.java')) {
      const src = fs.readFileSync(file, 'utf8');
      const found = [
        ...(urlOnly ? [] : checkDoNotUse(src, pats)),
        ...(urlOnly ? [] : checkAnnotations(src)),
        ...checkUrlsJava(src),
      ];
      for (const f of found) findings.push({ file: rel, ...f });
    } else if (file.endsWith('.properties')) {
      for (const f of checkUrlsProperties(fs.readFileSync(file, 'utf8'))) findings.push({ file: rel, ...f });
    }
  }
  return { ok: findings.length === 0, findings };
}

// ---------------------------------------------------------------------------------------------------
// Probe

function probe(url, { timeoutMs = 15000, maxRedirects = 5 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const go = (target, redirects) => {
      let u;
      try { u = new URL(target); } catch (e) { resolve({ ok: false, url, error: `invalid URL: ${target}` }); return; }
      const lib = u.protocol === 'https:' ? require('https') : u.protocol === 'http:' ? require('http') : null;
      if (!lib) { resolve({ ok: false, url, error: `unsupported protocol: ${u.protocol}` }); return; }
      const remaining = timeoutMs - (Date.now() - started);
      if (remaining <= 0) { resolve({ ok: false, url, error: 'timeout' }); return; }
      const req = lib.get(u, { timeout: remaining, headers: { 'User-Agent': 'aire-novus-probe' } }, (res) => {
        res.resume();
        const status = res.statusCode;
        if (status >= 300 && status < 400 && res.headers.location && redirects < maxRedirects) {
          go(new URL(res.headers.location, u).toString(), redirects + 1);
          return;
        }
        resolve({ ok: status < 500, url, finalUrl: u.toString(), status });
      });
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.on('error', (e) => resolve({ ok: false, url, error: e.code === 'ECONNRESET' && /timeout/.test(e.message) ? 'timeout' : (e.code || e.message) }));
    };
    go(url, 0);
  });
}

// ---------------------------------------------------------------------------------------------------
// CLI

function print(obj) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); }

async function main(argv) {
  const [cmd, a, b] = argv;
  const usage = () => { print({ ok: false, error: 'usage: probe <url> | hash-case <plan> <TC-ID> | hash-body <java> <method> | scan <dir> | url-scan <dir>' }); return 2; };
  switch (cmd) {
    case 'probe': {
      if (!a) return usage();
      const r = await probe(a);
      print(r);
      return r.ok ? 0 : 1;
    }
    case 'hash-case': { if (!a || !b) return usage(); const r = hashCase(a, b); print(r); return r.ok ? 0 : 2; }
    case 'hash-body': { if (!a || !b) return usage(); const r = hashBody(a, b); print(r); return r.ok ? 0 : 2; }
    case 'scan': { if (!a) return usage(); const r = scanDir(a); print(r); return r.ok ? 0 : 1; }
    case 'url-scan': { if (!a) return usage(); const r = scanDir(a, { urlOnly: true }); print(r); return r.ok ? 0 : 1; }
    default: return usage();
  }
}

module.exports = {
  normalise, sha256, caseText, hashCase, lexJava, stripComments, codeOnly, methodBody, hashBody,
  doNotUsePatterns, checkDoNotUse, checkAnnotations, urlProblem, checkUrlsJava, checkUrlsProperties,
  scanDir, probe, main,
};

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { print({ ok: false, error: e.message }); process.exitCode = 2; });
}
