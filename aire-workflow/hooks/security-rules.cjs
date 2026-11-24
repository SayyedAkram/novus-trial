'use strict';

// Rule definitions used by check-security.cjs. Each rule detects one unsafe construct that can be
// identified from a single line, a Terraform resource block or a Dockerfile, without data-flow analysis.
// Every match is reported as a blocking finding, so patterns are kept narrow; checks that would need
// broader context are not included.
//
// Rule fields:
//   id                     stable identifier, referenced by Security Decisions in architecture.md
//   baseline               SECURITY-NN rule enforced; `owasp` overrides its default OWASP category
//   title, fix             description of the problem and of the remedy, shown in the finding
//   re                     RegExp, or { <lang>: RegExp }; with an object, its keys are the rule's languages
//   langs                  languages for a single RegExp ('*' matches every scanned file)
//   path                   regex the workspace-relative path must match
//   code                   match against the line with string contents and trailing comments blanked
//   comments               also match comment lines (used by secret rules)
//   multiline              match against the whole file; a finding spans the matched lines
//   also, unless           regex the same line must / must not match (RegExp or per language)
//   alsoFile, unlessFile   regex the whole file must / must not match
//   unlessNear             { re, lines }: no finding when `re` matches within that many lines
//   when(m, at)            extra predicate per match; `at` is { lines, i, lang, target }
//   check(text, lines, lang)  custom check returning [{ line, end, detail }]
//   secret                 the write is denied in PreToolUse instead of reported after it
//   bad, good              [file, text] examples; selftest requires every bad one to match and no good one

const rx = (s, f = '') => new RegExp(s, f);

// True when an image reference is pinned: a digest, or a tag other than "latest". References containing
// variables are treated as pinned because their value is unknown.
function pinnedImage(ref) {
  if (/[${]/.test(ref)) return true;
  if (ref.includes('@sha256:')) return true;
  const last = ref.split('/').pop();
  const i = last.indexOf(':');
  return i !== -1 && i < last.length - 1 && last.slice(i + 1) !== 'latest';
}

// Key names that denote a credential, matched on the end of the key (dbPassword, DB_PASSWORD, SMTP_PASS,
// client_secret, apiKey). Keys such as passwordResetUrl, tokenType or bypass do not match.
const PASS_KEY = /(?:pass(?:word|wd)|(?:^|[_.-])pass|pwd)$/i;
const CRED_KEY = /(?:pass(?:word|wd)|(?:^|[_.-])pass|pwd|secret|api[_-]?key|apikey|access[_-]?key|token|credentials?|private[_-]?key)$/i;
const PLACEHOLDER = /(?:^|[-_])(?:your|my)[-_]|^the[-_]|[-_]here$|example|placeholder|changeme|change[-_]me|replace|dummy|fake|mock|sample|redacted|xxxx|\*\*\*|^<.*>$|^\[.*\]$|^\.\.\.$/i;

// True when a literal looks like a real credential rather than a reference, placeholder or label. With
// `slugIsName`, short lowercase hyphenated values ("mock-jwt-access-token", "tok-abc-1") are treated as
// names; random keys and hex strings have no separators and still match.
function credentialValue(v, { slugIsName = false } = {}) {
  if (v.length < 8) return false;
  if (!/^[\x21-\x7e]+$/.test(v)) return false; // secrets are printable ASCII; prose in any language is not
  if (/^[A-Z][A-Z0-9_]*$/.test(v)) return false; // an environment variable name
  if (/^\$|\$\{|\$\(|\{\{|%\(|%s|^[-./~]|:\/\//.test(v)) return false; // a reference, interpolation, CSS variable, path or URL
  if (PLACEHOLDER.test(v)) return false;
  if (/^(?:true|false|null|none|undefined|required|optional|string|password|secret|token)$/i.test(v)) return false;
  if (/^(?:token|secret|key|api[-_]?key)[-_][A-Z0-9]{1,6}$/i.test(v)) return false; // "TOKEN-123", "secret-xyz"
  if (slugIsName && /^[a-z]+(?:[-_.][a-z]+)*$|^[a-z0-9]{1,10}(?:[-_.][a-z0-9]{1,10})+$/.test(v)) return false;
  // A single word is a label; a credential contains digits or symbols, or is at least 16 characters.
  return /[^A-Za-z]/.test(v) || v.length >= 16;
}

const DEFAULT_PASSWORDS = new Set(['admin', 'administrator', 'password', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'changeme', 'change_me',
  'root', 'toor', 'guest', 'default', 'secret', 'letmein', '123456', '1234567', '12345678', '123456789', '1234', 'qwerty',
  'postgres', 'mysql', 'sa', 'test', 'pass', 'admin123', 'password1', 'password123']);

// True when every value interpolated or concatenated into a string on the line is an UPPER_CASE
// constant (or matches `alsoSafe`). False when no interpolation is found.
function splicesOnlyConstants(line, alsoSafe = null) {
  const names = [];
  for (const m of line.matchAll(/\$\{([^}]*)\}|#\{([^}]*)\}|(?<![{$#])\{([A-Za-z_][\w.]*)\}/g)) names.push((m[1] ?? m[2] ?? m[3]).trim());
  for (const m of line.matchAll(/["'`]\s*\+\s*([A-Za-z_$][\w.$]*)|([A-Za-z_$][\w.$]*)\s*\+\s*["'`]/g)) names.push(m[1] || m[2]);
  return names.length > 0 && names.every((n) => /^(?:[A-Za-z_$][\w$]*\.)*[A-Z][A-Z0-9_]*$/.test(n) || (alsoSafe && alsoSafe.test(n)));
}

// Variable names used for generated placeholder lists ("?, ?, ?") in parameterised IN clauses.
const PLACEHOLDER_LIST = /^(?:\w+_)?(?:placeholders?|m?ph|q?marks|binds?|params?_?(?:list|str))$/i;

// SQL injection patterns match a value interpolated where a bound parameter belongs: after =, <, >, LIKE,
// IN (, VALUES (, LIMIT, OFFSET or BETWEEN. Interpolated structure (column lists, assembled WHERE
// clauses, table names) is not matched.
const SQL_KW = String.raw`\b(?:SELECT|INSERT|UPDATE|DELETE|WHERE)\b`;
const SQL_VAL = String.raw`(?:[=<>]|\b(?:LIKE|ILIKE|LIMIT|OFFSET|BETWEEN)\b|\bIN\s*\(|\bVALUES\s*\()\s*['"%(]*\s*`;
// Regex source for a string quoted by `q` containing an SQL keyword, then a value position, then `tail`.
const sqlIn = (q, tail) => `${q}[^${q}\\n]*?${SQL_KW}[^${q}\\n]*?${SQL_VAL}${tail}`;
const sqlRx = (...alts) => new RegExp(alts.join('|'), 'i');
// A value position followed by an interpolation (${x}, #{x}, {x}, $x, or a closing quote and + or .);
// group 1 captures the interpolated identifier.
const SQL_SPLICE = new RegExp(`${SQL_VAL}(?:\\$\\{|#\\{|\\{(?!\\{)|\\$(?=[A-Za-z_])|["'\\x60]\\s*[+.]\\s*)\\s*\\(?\\s*([A-Za-z_$][\\w.$]*)`, 'gi');

// Index of the brace closing the block opened at `open`. Skips strings, comments and heredocs, whose
// embedded JSON can contain unbalanced braces.
function closeBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { i++; while (i < text.length && text[i] !== '"') { if (text[i] === '\\') i++; i++; } continue; }
    if (c === '#' || (c === '/' && text[i + 1] === '/')) { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e === -1 ? text.length : e + 1; continue; }
    if (c === '<' && text[i + 1] === '<') {
      const m = /^<<-?\s*([A-Za-z_]\w*)[^\n]*\n/.exec(text.slice(i, i + 200));
      if (m) { const e = text.slice(i + m[0].length).search(new RegExp(`^\\s*${m[1]}\\s*$`, 'm')); i = e === -1 ? text.length : i + m[0].length + e + m[1].length; continue; }
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return text.length - 1;
}

const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;

// Top-level Terraform resource blocks: [{ type, name, body, line, end, offset }].
function hclResources(text) {
  const out = [];
  const head = /^[ \t]*resource\s+"([\w-]+)"\s+"([\w-]+)"\s*\{/gm;
  let m;
  while ((m = head.exec(text))) {
    const open = m.index + m[0].length - 1;
    const close = closeBrace(text, open);
    out.push({ type: m[1], name: m[2], body: text.slice(open + 1, close), offset: open + 1, line: lineAt(text, m.index), end: lineAt(text, close) });
    head.lastIndex = close;
  }
  return out;
}

// Nested `<name> { ... }` blocks inside a resource body, with line numbers in the file.
function hclSubBlocks(text, res, name) {
  const out = [];
  const head = new RegExp(`(^|\\n)[ \\t]*${name}\\s*\\{`, 'g');
  let m;
  while ((m = head.exec(res.body))) {
    const open = m.index + m[0].length - 1;
    const close = closeBrace(res.body, open);
    out.push({ body: res.body.slice(open + 1, close), line: lineAt(text, res.offset + m.index + m[1].length), end: lineAt(text, res.offset + close) });
    head.lastIndex = close;
  }
  return out;
}

const attr = (body, key) => { const m = new RegExp(`^\\s*${key}\\s*=\\s*("?)([^"\\n]*)\\1\\s*$`, 'm').exec(body); return m ? m[2].trim() : null; };
const OPEN_CIDR = /"(?:0\.0\.0\.0\/0|::\/0)"/;
const WEB_PORTS = new Set(['80', '443']);

// True when a security-group rule body allows all protocols or a port range other than a single 80 or
// 443. Returns null when the ports are not numeric literals.
function portsOpenBeyondWeb(body, fromKey = 'from_port', toKey = 'to_port', protoKey = 'protocol') {
  const proto = attr(body, protoKey);
  if (proto === '-1' || proto === 'all') return true;
  const from = attr(body, fromKey); const to = attr(body, toKey);
  if (!/^\d+$/.test(from || '') || !/^\d+$/.test(to || '')) return null;
  return !(from === to && WEB_PORTS.has(from));
}

function terraformOpenNetwork(text, direction) {
  const out = [];
  for (const r of hclResources(text)) {
    const id = `${r.type}.${r.name}`;
    if (r.type === 'aws_security_group') {
      for (const b of hclSubBlocks(text, r, direction)) {
        if (!OPEN_CIDR.test(b.body)) continue;
        const open = direction === 'ingress' ? portsOpenBeyondWeb(b.body) : attr(b.body, 'protocol') === '-1' || (attr(b.body, 'from_port') === '0' && attr(b.body, 'to_port') === '65535');
        if (open) out.push({ line: b.line, end: b.end, detail: `${id} ${direction} from 0.0.0.0/0` });
      }
    } else if (r.type === 'aws_security_group_rule' && attr(r.body, 'type') === direction && OPEN_CIDR.test(r.body)) {
      const open = direction === 'ingress' ? portsOpenBeyondWeb(r.body) : attr(r.body, 'protocol') === '-1' || (attr(r.body, 'from_port') === '0' && attr(r.body, 'to_port') === '65535');
      if (open) out.push({ line: r.line, end: r.end, detail: `${id} ${direction} from 0.0.0.0/0` });
    } else if (r.type === `aws_vpc_security_group_${direction}_rule` && /cidr_ipv[46]\s*=\s*"(?:0\.0\.0\.0\/0|::\/0)"/.test(r.body)) {
      const open = direction === 'ingress' ? portsOpenBeyondWeb(r.body, 'from_port', 'to_port', 'ip_protocol') : attr(r.body, 'ip_protocol') === '-1';
      if (open) out.push({ line: r.line, end: r.end, detail: `${id} ${direction} from 0.0.0.0/0` });
    } else if (direction === 'ingress' && r.type === 'google_compute_firewall' && !/direction\s*=\s*"EGRESS"/.test(r.body) && /source_ranges\s*=\s*\[[^\]]*"0\.0\.0\.0\/0"/.test(r.body)) {
      for (const b of hclSubBlocks(text, r, 'allow')) {
        const ports = /ports\s*=\s*\[([^\]]*)\]/.exec(b.body);
        const list = ports ? (ports[1].match(/"([^"]+)"/g) || []).map((p) => p.slice(1, -1)) : [];
        if (!ports || list.some((p) => !WEB_PORTS.has(p))) out.push({ line: b.line, end: b.end, detail: `${id} allows ${ports ? list.join(', ') : 'every port'} from 0.0.0.0/0` });
      }
    } else if (direction === 'ingress' && (r.type === 'azurerm_network_security_rule' || r.type === 'azurerm_network_security_group')) {
      const rules = r.type === 'azurerm_network_security_rule' ? [{ body: r.body, line: r.line, end: r.end }] : hclSubBlocks(text, r, 'security_rule');
      for (const b of rules) {
        if (!/direction\s*=\s*"Inbound"/i.test(b.body) || !/access\s*=\s*"Allow"/i.test(b.body)) continue;
        if (!/source_address_prefix\s*=\s*"(?:\*|0\.0\.0\.0\/0|Internet|Any)"/i.test(b.body)) continue;
        const single = attr(b.body, 'destination_port_range');
        const many = /destination_port_ranges\s*=\s*\[([^\]]*)\]/.exec(b.body);
        const list = many ? (many[1].match(/"([^"]+)"/g) || []).map((p) => p.slice(1, -1)) : single !== null ? [single] : [];
        if (list.some((p) => !WEB_PORTS.has(p)) || !list.length) out.push({ line: b.line, end: b.end, detail: `${id} allows inbound ${list.join(', ') || 'every port'} from the internet` });
      }
    }
  }
  return out;
}

// CloudFormation (YAML or JSON) rules with CidrIp 0.0.0.0/0 under SecurityGroupIngress or
// SecurityGroupEgress. Ports and protocol are read from the surrounding lines.
function cfnOpenNetwork(lines, direction) {
  const out = [];
  const want = direction === 'ingress' ? /SecurityGroupIngress/ : /SecurityGroupEgress/;
  const other = direction === 'ingress' ? /SecurityGroupEgress/ : /SecurityGroupIngress/;
  lines.forEach((l, i) => {
    if (!/CidrIp(?:v6)?["']?\s*:\s*["']?(?:0\.0\.0\.0\/0|::\/0)/.test(l)) return;
    let j = i; while (j >= 0 && !want.test(lines[j]) && !other.test(lines[j])) j--;
    if (j < 0 || !want.test(lines[j])) return;
    const near = lines.slice(Math.max(0, i - 6), i + 7).join('\n');
    const num = (k) => (new RegExp(`${k}["']?\\s*:\\s*["']?(-?\\d+)`).exec(near) || [])[1];
    const proto = (/IpProtocol["']?\s*:\s*["']?(-1|\w+)/.exec(near) || [])[1];
    const from = num('FromPort'); const to = num('ToPort');
    const open = proto === '-1' || (direction === 'ingress' ? !(from && from === to && WEB_PORTS.has(from)) : (from === '0' && to === '65535'));
    if (open) out.push({ line: i + 1, detail: `${direction} from 0.0.0.0/0${from ? ` on ${from}${to && to !== from ? `-${to}` : ''}` : ''}` });
  });
  return out;
}

// Key that a YAML line belongs to: the line's own key, or the nearest less-indented key above it.
function yamlOwner(lines, i) {
  const own = /^\s*-?\s*([\w.-]+)\s*:/.exec(lines[i]);
  if (own) return own[1];
  const indent = lines[i].search(/\S/);
  for (let j = i - 1; j >= 0; j--) {
    const l = lines[j];
    if (!l.trim() || l.search(/\S/) >= indent) continue;
    const k = /^\s*-?\s*([\w.-]+)\s*:/.exec(l);
    if (k) return k[1];
  }
  return null;
}

// Credential assignments: quoted values in code (KEY = "value"); bare values in configuration
// (KEY=value, key: value).
const CRED_QUOTED = /(?<![\w.-])([A-Za-z_][\w.-]*?)["']?\s*(?::|=(?!=)|:=|=>)\s*(["'`])([^"'`\s]{8,})\2/g;
const CRED_BARE = /(?<![\w.-])([A-Za-z_][\w.-]*?)["']?\s*(?::|=(?!=))\s*["']?([^\s"',;{}]{8,})["']?,?\s*(?:\s#.*)?$/g;
const credWhen = (key, value, opts) => CRED_KEY.test(key) && credentialValue(value, opts);


module.exports = [
  // Secrets (denied before the write)
  {
    id: 'secret/private-key', baseline: 'SECURITY-16', secret: true, comments: true, langs: ['*'],
    title: 'A private key is written into the repository',
    fix: 'Remove it; load the key at runtime from a secrets manager, KMS/HSM or vault (tests generate a throwaway key).',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/,
    bad: [['src/keys.js', 'const key = `-----BEGIN ' + 'RSA PRIVATE KEY-----`;'], ['tests/fixtures/tls.md', '-----BEGIN ' + 'PRIVATE KEY-----']],
    good: [['src/keys.js', 'const pub = `-----BEGIN PUBLIC KEY-----`;']],
  },
  {
    id: 'secret/cloud-or-service-token', baseline: 'SECURITY-12', secret: true, comments: true, langs: ['*'],
    title: 'A cloud or service access token is written into the repository',
    fix: 'Remove it and rotate it if it was ever real; read it at runtime from a secrets manager or the environment.',
    re: rx([
      String.raw`\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b`,
      String.raw`\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}`,
      String.raw`\bglpat-[A-Za-z0-9_-]{20}\b`,
      String.raw`\bxox[abposr]-[A-Za-z0-9-]{10,}|https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+`,
      String.raw`\b[sr]k_live_[A-Za-z0-9]{20,}`,
      String.raw`\bAIza[0-9A-Za-z_-]{35}\b`,
      String.raw`\bsk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{80,}|\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}|\bsk-[A-Za-z0-9]{48}\b`,
      String.raw`\bnpm_[A-Za-z0-9]{36}\b`,
      String.raw`\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b`,
      String.raw`AccountKey=[A-Za-z0-9+/]{86}==`,
      String.raw`aws_?secret_?access_?key\W{0,4}[:=]\s*['"]?[A-Za-z0-9/+]{40}\b`,
    ].join('|'), 'i'),
    unless: /EXAMPLE/,
    bad: [
      ['src/aws.py', `KEY_ID = "${'AKIA' + 'Z7Q2M4N8P1R5T3V6'}"`],
      ['.github/workflows/ci.yml', `      token: ${'ghp_' + 'a'.repeat(36)}`],
      ['src/pay.ts', `const stripe = new Stripe('${'sk_live_' + '4eC39HqLyjWDarjtT1zdp7dc'}');`],
      ['src/llm.py', `client = Anthropic(api_key="${'sk-ant-api03-' + 'x'.repeat(90)}")`],
      ['config/app.env', `AWS_SECRET_ACCESS_KEY=${'wJalrXUtnFEMI/K7MDENG/bPxRfiCY' + 'zz12345678'}`],
    ],
    good: [['src/aws.py', 'KEY_ID = "AKIAIOSFODNN7EXAMPLE"'], ['src/llm.py', 'client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])'], ['src/a.js', "const skid = 'sk-short';"]],
  },
  {
    id: 'secret/jwt-literal', baseline: 'SECURITY-12', secret: true, comments: true, langs: ['*'],
    title: 'A signed JWT is written as a literal',
    fix: 'Do not commit bearer tokens; tests mint a token at runtime with a test-only key.',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    bad: [['tests/unit/auth.test.ts', `const token = '${'eyJhbGciOiJIUzI1NiJ9' + '.eyJzdWIiOiIxMjM0NTY3ODkwIn0' + '.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'}';`]],
    good: [['tests/unit/auth.test.ts', "const token = jwt.sign({ sub: '1' }, TEST_KEY, { algorithm: 'HS256' });"]],
  },
  {
    id: 'secret/url-credentials', baseline: 'SECURITY-12', secret: true, comments: true, langs: ['*'],
    title: 'A URL carries a literal user:password',
    fix: 'Build the URL at runtime from a secret (environment variable or secrets manager); never write the password into it.',
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"`]+:([^\s@/'"`]+)@[^\s'"`]/gi,
    // In Markdown and text files, placeholder passwords such as user:pass are ignored.
    when: (m, at) => !/^(?:\$|\{|<|%|\*+$|\[)/.test(m[1])
      && !(at.lang === 'text' && (/^(?:pass(?:word|wd)?|pwd|pw|secret)$/i.test(m[1]) || PLACEHOLDER.test(m[1]))),
    bad: [['src/db.py', 'DATABASE_URL = "postgresql://app:S3cr3t!x@db.internal:5432/app"'], ['docker-compose.yml', '      - MONGO_URL=mongodb://root:hunter22@mongo:27017'], ['src/config.py', 'DB = "mysql://root:password@localhost/app"']],
    good: [
      ['src/db.py', 'DATABASE_URL = f"postgresql://app:{password}@db.internal:5432/app"'],
      ['docker-compose.yml', '      - MONGO_URL=mongodb://root:${MONGO_PASSWORD}@mongo:27017'],
      ['src/a.js', "const u = 'https://example.com/a@b';"],
      ['docs/setup.md', 'Set `DATABASE_URL` to e.g. `postgresql://user:pass@host/db`.'],
    ],
  },
  {
    id: 'secret/hardcoded-credential', baseline: 'SECURITY-12',
    title: 'A password, secret, API key or token is written as a literal',
    fix: 'Read it at runtime from a secrets manager or the environment; in tests, generate it or name the value fake/dummy so it is plainly not a credential.',
    re: CRED_QUOTED,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb'],
    when: (m) => credWhen(m[1], m[3], { slugIsName: true }),
    bad: [
      ['src/config.ts', 'const dbPassword = "Pr0d-p4ss!2024";'],
      ['src/settings.py', 'STRIPE_WEBHOOK_SECRET = "whsec_9fQ2xLm8RtZ1vB"'],
      ['src/App.java', 'private static final String API_KEY = "a8f5f167f44f4964e6c998dee827110c";'],
      ['src/a.go', 'const clientSecret = "Zx9!pQ2#mN7$"'],
      ['src/A.cs', 'var conn = new Client { ApiKey = "9f8e7d6c5b4a39281706" };'],
      ['src/a.php', "$config = ['password' => 'Winter2024!'];"],
      ['src/a.rb', "SMTP_PASSWORD = 'Mail#Pass2024'"],
    ],
    good: [
      ['src/config.ts', 'const dbPassword = process.env.DB_PASSWORD; const passwordResetUrl = "/account/reset-password";'],
      ['src/tokens.stories.tsx', "{ token: '--background', label: 'background' }, { accessToken: 'mock-jwt-access-token' }"],
      ['tests/unit/download.test.ts', "const TOKEN = 'tok-abc-1'; const SKIP_TOKEN = 'i18n-skip'; render({ token: 'TOKEN-123' });"],
      ['src/i18n/zh.ts', 'invalidCredentials: "邮箱或密码错误。",'],
      ['src/settings.py', 'STRIPE_SECRET = os.environ["STRIPE_SECRET"]; password_field = "password"'],
      ['src/App.java', 'private static final String API_KEY_ENV = "PAYMENTS_API_KEY";'],
      ['src/a.go', 'const clientSecretEnv = "CLIENT_SECRET"'],
      ['src/A.cs', 'var conn = new Client { ApiKey = config["Payments:ApiKey"] };'],
      ['src/a.php', "$labels = ['password' => 'Contraseña'];"],
      ['tests/unit/a.rb', "SMTP_PASSWORD = 'fake-password-for-tests'"],
    ],
  },
  {
    id: 'secret/hardcoded-credential-config', baseline: 'SECURITY-12',
    title: 'A password, secret, API key or token is written as a literal in configuration',
    fix: 'Reference a secret instead (${VAR}, a secrets-manager reference, a Kubernetes secretKeyRef); never the value itself.',
    re: CRED_BARE,
    langs: ['config', 'yaml', 'docker', 'shell', 'ps', 'tf', 'json'],
    // Excludes Terraform references (var.x, local.y, module.z.out) and dotted identifiers.
    when: (m) => credWhen(m[1], m[2]) && !/^(?:var|local|module|data)\.|^[a-z_]+\.[a-z_.]+$/i.test(m[2]),
    bad: [
      ['.env', 'DB_PASSWORD=Pr0d-p4ss!2024'],
      ['k8s/secret.yaml', '  api_key: 9f8e7d6c5b4a39281706aa'],
      ['Dockerfile', 'ENV JWT_SECRET=Zx9!pQ2#mN7$kL'],
      ['infra/main.tf', '  password = "Pr0d-p4ss!2024"'],
      ['src/appsettings.json', '    "ClientSecret": "Zx9!pQ2#mN7$kL",'],
    ],
    good: [
      ['.env.example', 'DB_PASSWORD=<set-in-vault>'],
      ['k8s/secret.yaml', '  api_key: ${API_KEY}'],
      ['Dockerfile', 'ARG JWT_SECRET'],
      ['infra/main.tf', '  password = var.db_password'],
      ['src/appsettings.json', '    "ClientSecret": "",'],
      ['design/overrides.json', '    "token": "--primary",'],
      ['.env.example', 'OPENAI_API_KEY=sk-your-openai-api-key-here'],
    ],
  },
  {
    id: 'config/default-credential', baseline: 'SECURITY-09',
    title: 'A default or well-known password is configured',
    fix: 'Remove it; require the credential from a secret at deploy time and fail to start without it.',
    re: /(?<![\w.-])([A-Za-z_][\w.-]*?)["']?\s*(?::|=(?!=)|:=|=>)\s*["'`]?([^"'`\s,;)}]+)["'`]?/g,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb', 'config', 'yaml', 'docker', 'shell', 'ps', 'tf', 'json'],
    // Excludes capitalised words, which are UI labels ("password": "Password").
    when: (m) => PASS_KEY.test(m[1]) && DEFAULT_PASSWORDS.has(m[2].toLowerCase()) && !/^[A-Z][a-z]+$/.test(m[2]),
    bad: [['docker-compose.yml', '      POSTGRES_PASSWORD: postgres'], ['src/config.py', 'ADMIN_PASSWORD = "admin"'], ['.env', 'SMTP_PASS=pass']],
    good: [
      ['docker-compose.yml', '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}'],
      ['src/config.py', 'ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]'],
      ['src/a.ts', "if (password === 'admin') return; const labels = { gatePerBoardPass: 'Pass' };"],
      ['src/locales/en.json', '  "password": "Password",'],
    ],
  },

  // SECURITY-16: cryptography
  {
    id: 'crypto/weak-hash', baseline: 'SECURITY-16',
    title: 'A broken hash (MD5, MD4, MD2 or SHA-1) is used',
    fix: 'Use SHA-256 or stronger (for passwords: Argon2id, scrypt or bcrypt). In Python, a non-security use is declared with usedforsecurity=False.',
    re: {
      js: /\bcreateHash\(\s*['"`](?:md5|md4|md2|sha1|sha-1)['"`]|\bCryptoJS\.(?:MD5|SHA1)\b/i,
      py: /\bhashlib\.(?:md5|sha1)\s*\(|\bhashlib\.new\(\s*['"](?:md5|md4|sha1)['"]|\bhashes\.(?:MD5|SHA1)\s*\(|\bfrom\s+Crypto\.Hash\s+import\s+[^#\n]*\b(?:MD5|MD4|SHA1)\b/,
      jvm: /MessageDigest\.getInstance\(\s*"(?:MD5|MD4|MD2|SHA-?1|SHA)"|\bDigestUtils\.(?:md5|sha1|sha|md2)(?:Hex)?\s*\(|\bHashing\.(?:md5|sha1)\s*\(/i,
      go: /\b(?:md5|sha1)\.(?:New|Sum)\s*\(/,
      cs: /\b(?:MD5|SHA1)\.(?:Create|HashData)\s*\(|\b(?:MD5|SHA1)(?:CryptoServiceProvider|Managed|Cng)\b|HashAlgorithmName\.(?:MD5|SHA1)\b/,
      php: /(?<![\w>$])(?:md5|sha1)\s*\(|\bhash\(\s*['"](?:md5|sha1|md4)['"]/,
      rb: /\bDigest::(?:MD5|SHA1)\b/,
    },
    unless: { py: /usedforsecurity\s*=\s*False/ },
    bad: [
      ['src/a.js', "const h = crypto.createHash('md5').update(body).digest('hex');"],
      ['src/a.py', 'digest = hashlib.sha1(data).hexdigest()'],
      ['src/A.java', 'MessageDigest md = MessageDigest.getInstance("SHA-1");'],
      ['src/a.go', 'sum := md5.Sum(data)'],
      ['src/A.cs', 'using var h = MD5.Create();'],
      ['src/a.php', '$h = md5($body);'],
      ['src/a.rb', 'h = Digest::MD5.hexdigest(body)'],
    ],
    good: [
      ['src/a.js', "const h = crypto.createHash('sha256').update(body).digest('hex');"],
      ['src/a.py', 'etag = hashlib.md5(body, usedforsecurity=False).hexdigest()'],
      ['src/A.java', 'MessageDigest md = MessageDigest.getInstance("SHA-256");'],
      ['src/a.go', 'sum := sha256.Sum256(data)'],
      ['src/A.cs', 'using var h = SHA256.Create();'],
      ['src/a.php', '$h = hash("sha256", $body);'],
      ['src/a.rb', 'h = Digest::SHA256.hexdigest(body)'],
    ],
  },
  {
    id: 'crypto/weak-cipher', baseline: 'SECURITY-16',
    title: 'A broken cipher or mode (DES, 3DES, RC2, RC4, Blowfish, ECB) is used',
    fix: 'Use authenticated encryption: AES-GCM or ChaCha20-Poly1305 with a random nonce per message.',
    re: {
      js: /\bcreateCipher\s*\(|\bcreateCipheriv\(\s*['"`](?:des|rc2|rc4|bf|blowfish|cast|aes-?\d+-ecb|id-aes\d+-ecb)|\bCryptoJS\.(?:DES|TripleDES|RC4|Rabbit)\b|CryptoJS\.mode\.ECB\b/i,
      py: /\b(?:DES|DES3|ARC4|ARC2|Blowfish|CAST)\.new\s*\(|\bMODE_ECB\b|\bmodes\.ECB\s*\(|\balgorithms\.(?:TripleDES|ARC4|Blowfish|CAST5|IDEA|SEED)\s*\(/,
      jvm: /Cipher\.getInstance\(\s*"(?:DES|DESede|TripleDES|RC2|RC4|ARCFOUR|Blowfish|AES"|(?:AES|DES\w*|Blowfish)\/ECB)/i,
      go: /\bdes\.(?:NewCipher|NewTripleDESCipher)\s*\(|\brc4\.NewCipher\s*\(/,
      cs: /\b(?:DES|TripleDES|RC2)\.Create\s*\(|\b(?:DES|TripleDES|RC2)CryptoServiceProvider\b|\bCipherMode\.ECB\b/,
      php: /openssl_(?:en|de)crypt\([^)]*['"](?:des|rc4|rc2|bf|blowfish|aes-\d+-ecb)/i,
      rb: /OpenSSL::Cipher\.new\(\s*['"](?:des|rc4|rc2|bf|blowfish|aes-\d+-ecb)/i,
    },
    bad: [
      ['src/a.ts', "const c = crypto.createCipheriv('aes-256-ecb', key, null);"],
      ['src/a.py', 'cipher = AES.new(key, AES.MODE_ECB)'],
      ['src/A.java', 'Cipher c = Cipher.getInstance("AES");'],
      ['src/a.go', 'block, err := des.NewTripleDESCipher(key)'],
      ['src/A.cs', 'aes.Mode = CipherMode.ECB;'],
      ['src/a.php', '$c = openssl_encrypt($d, "des-ede3-cbc", $k);'],
      ['src/a.rb', 'c = OpenSSL::Cipher.new("des-ede3-cbc")'],
    ],
    good: [
      ['src/a.ts', "const c = crypto.createCipheriv('aes-256-gcm', key, iv);"],
      ['src/a.py', 'cipher = AES.new(key, AES.MODE_GCM)'],
      ['src/A.java', 'Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); Cipher r = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");'],
      ['src/a.go', 'block, err := aes.NewCipher(key)'],
      ['src/A.cs', 'using var aes = new AesGcm(key, 16);'],
      ['src/a.php', '$c = openssl_encrypt($d, "aes-256-gcm", $k, 0, $iv, $tag);'],
      ['src/a.rb', 'c = OpenSSL::Cipher.new("aes-256-gcm")'],
    ],
  },
  {
    id: 'crypto/rsa-pkcs1-encryption', baseline: 'SECURITY-16',
    title: 'RSA encryption with PKCS#1 v1.5 padding',
    fix: 'Encrypt with RSA-OAEP (SHA-256); PKCS#1 v1.5 is allowed only for signatures.',
    re: {
      js: /\bRSA_PKCS1_PADDING\b/,
      py: /\bfrom\s+Crypto\.Cipher\s+import\s+[^#\n]*\bPKCS1_v1_5\b|\bCipher\.PKCS1_v1_5\b|\.encrypt\([^)]*padding\.PKCS1v15\s*\(/,
      jvm: /Cipher\.getInstance\(\s*"RSA(?:\/(?:ECB|NONE)\/PKCS1Padding)?"/,
      go: /\brsa\.EncryptPKCS1v15\s*\(/,
      cs: /\bRSAEncryptionPadding\.Pkcs1\b/,
      php: /\bOPENSSL_PKCS1_PADDING\b/,
    },
    bad: [
      ['src/a.js', 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buf);'],
      ['src/a.py', 'ct = pub.encrypt(msg, padding.PKCS1v15())'],
      ['src/A.java', 'Cipher c = Cipher.getInstance("RSA/ECB/PKCS1Padding");'],
      ['src/a.go', 'ct, err := rsa.EncryptPKCS1v15(rand.Reader, pub, msg)'],
      ['src/A.cs', 'var ct = rsa.Encrypt(data, RSAEncryptionPadding.Pkcs1);'],
      ['src/a.php', 'openssl_public_encrypt($d, $out, $key, OPENSSL_PKCS1_PADDING);'],
    ],
    good: [
      ['src/a.js', 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, buf);'],
      ['src/a.py', 'sig = key.sign(msg, padding.PKCS1v15(), hashes.SHA256())'],
      ['src/A.java', 'Cipher c = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");'],
      ['src/a.go', 'ct, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, pub, msg, nil)'],
      ['src/A.cs', 'var ct = rsa.Encrypt(data, RSAEncryptionPadding.OaepSHA256);'],
      ['src/a.php', 'openssl_public_encrypt($d, $out, $key, OPENSSL_PKCS1_OAEP_PADDING);'],
    ],
  },
  {
    id: 'crypto/short-rsa-key', baseline: 'SECURITY-16',
    title: 'An RSA key shorter than 2048 bits is generated',
    fix: 'Use RSA 2048 bits or more (3072 for keys that must outlive 2030), or Ed25519/X25519.',
    re: {
      js: /\bmodulusLength\s*:\s*(?:512|768|1024|1536)\b/,
      py: /\bkey_size\s*=\s*(?:512|768|1024|1536)\b|\bRSA\.generate\(\s*(?:512|768|1024|1536)\b/,
      jvm: /\.initialize\(\s*(?:512|768|1024|1536)\s*[,)]/,
      go: /\brsa\.GenerateKey\([^,]+,\s*(?:512|768|1024|1536)\s*\)/,
      cs: /\bnew\s+RSACryptoServiceProvider\(\s*(?:512|768|1024|1536)\s*\)|\bRSA\.Create\(\s*(?:512|768|1024|1536)\s*\)|\bKeySize\s*=\s*(?:512|768|1024|1536)\b/,
      shell: /\bopenssl\s+genrsa\b[^\n]*\s(?:512|768|1024|1536)\b|-newkey\s+rsa:(?:512|768|1024|1536)\b/,
    },
    bad: [
      ['src/a.js', "crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });"],
      ['src/a.py', 'key = rsa.generate_private_key(public_exponent=65537, key_size=1024)'],
      ['src/A.java', 'gen.initialize(1024);'],
      ['src/a.go', 'key, err := rsa.GenerateKey(rand.Reader, 1024)'],
      ['src/A.cs', 'using var rsa = RSA.Create(1024);'],
      ['scripts/certs.sh', 'openssl req -x509 -newkey rsa:1024 -keyout k.pem -out c.pem'],
    ],
    good: [
      ['src/a.js', "crypto.generateKeyPairSync('rsa', { modulusLength: 3072 });"],
      ['src/a.py', 'key = rsa.generate_private_key(public_exponent=65537, key_size=3072)'],
      ['src/A.java', 'gen.initialize(3072);'],
      ['src/a.go', 'key, err := rsa.GenerateKey(rand.Reader, 3072)'],
      ['src/A.cs', 'using var rsa = RSA.Create(3072);'],
      ['scripts/certs.sh', 'openssl req -x509 -newkey rsa:3072 -keyout k.pem -out c.pem'],
    ],
  },
  {
    id: 'crypto/insecure-random', baseline: 'SECURITY-16', code: true,
    title: 'A general-purpose RNG makes a token, secret, salt, nonce or session/reset code',
    fix: 'Use a CSPRNG: crypto.randomBytes / crypto.randomUUID (Node), secrets (Python), SecureRandom (JVM), crypto/rand (Go), RandomNumberGenerator (.NET), random_bytes (PHP), SecureRandom (Ruby).',
    re: {
      js: /\bMath\.random\s*\(/,
      py: /(?<![\w.])random\.(?:random|randint|randrange|choice|choices|getrandbits|sample|uniform)\s*\(/,
      jvm: /\bnew\s+Random\s*\(|\bMath\.random\s*\(|\bThreadLocalRandom\.current\s*\(|\bRandomStringUtils\.random(?:Alphanumeric|Alphabetic|Numeric|Ascii)?\s*\(/,
      go: /\brand\.(?:Intn|Int63n?|Int31n?|Uint32|Uint64|Float64|Perm|Shuffle)\s*\(/,
      cs: /\bnew\s+Random\s*\(|\bRandom\.Shared\b/,
      php: /(?<![\w>$])(?:rand|mt_rand|uniqid|lcg_value|str_shuffle)\s*\(/,
      rb: /(?<![\w.])rand\s*\(|\bRandom\.rand\b|\bRandom\.new\b/,
    },
    also: /(?:token|secret|passw(?:or)?d|salt|nonce|otp|csrf|session_?id|sessionid|api_?key|apikey|reset_?code|verification_?code|invite_?code)/i,
    unlessFile: { go: /"math\/rand"[\s\S]*"crypto\/rand"|"crypto\/rand"(?![\s\S]*"math\/rand")/ },
    bad: [
      ['src/a.js', 'const resetToken = Math.random().toString(36).slice(2);'],
      ['src/a.py', 'otp = "".join(random.choice(DIGITS) for _ in range(6))'],
      ['src/A.java', 'String sessionId = Long.toHexString(new Random().nextLong());'],
      ['src/a.go', 'import "math/rand"\nnonce := rand.Int63()'],
      ['src/A.cs', 'var salt = new Random().Next();'],
      ['src/a.php', '$token = md5(uniqid());'],
      ['src/a.rb', 'token = rand(36**8).to_s(36)'],
    ],
    good: [
      ['src/a.js', 'const jitter = Math.random() * 100;\nconst resetToken = crypto.randomBytes(32).toString("hex");'],
      ['src/a.py', 'otp = "".join(secrets.choice(DIGITS) for _ in range(6))'],
      ['src/A.java', 'int delay = new Random().nextInt(100);'],
      ['src/a.go', 'import "crypto/rand"\nnonce := make([]byte, 12); rand.Read(nonce)'],
      ['src/A.cs', 'var salt = RandomNumberGenerator.GetBytes(16);'],
      ['src/a.php', '$token = bin2hex(random_bytes(32));'],
      ['src/a.rb', 'token = SecureRandom.hex(32)'],
    ],
  },
  {
    id: 'crypto/hardcoded-key', baseline: 'SECURITY-16',
    title: 'An encryption key is written as a literal',
    fix: 'Fetch the key from a KMS/HSM or vault at runtime (envelope-encrypt data keys); never derive it from a constant.',
    re: {
      js: /\bcreate(?:Cipheriv|Decipheriv|Hmac)\(\s*['"`][\w-]+['"`]\s*,\s*['"`][^'"`]+['"`]|\bCryptoJS\.\w+\.encrypt\([^,]+,\s*['"`][^'"`]+['"`]/,
      py: /\bAES\.new\(\s*b?['"]|\bhmac\.new\(\s*b?['"]|\bFernet\(\s*b?['"]/,
      jvm: /\bnew\s+SecretKeySpec\(\s*"[^"]*"\.getBytes/,
      go: /\baes\.NewCipher\(\s*\[\]byte\(\s*"/,
      cs: /\.Key\s*=\s*Encoding\.\w+\.GetBytes\(\s*"/,
    },
    bad: [
      ['src/a.js', "const c = crypto.createCipheriv('aes-256-gcm', 'k3y-0123456789abcdef0123456789ab', iv);"],
      ['src/a.py', 'f = Fernet(b"ZmRzYWZkc2FmZHNhZmRzYWZkc2FmZHNhZmRzYWZkcw==")'],
      ['src/A.java', 'SecretKeySpec k = new SecretKeySpec("0123456789abcdef".getBytes(), "AES");'],
      ['src/a.go', 'block, _ := aes.NewCipher([]byte("0123456789abcdef"))'],
      ['src/A.cs', 'aes.Key = Encoding.UTF8.GetBytes("0123456789abcdef");'],
    ],
    good: [
      ['src/a.js', "const c = crypto.createCipheriv('aes-256-gcm', await kms.dataKey(), iv);"],
      ['src/a.py', 'f = Fernet(secrets_client.get("fernet-key"))'],
      ['src/A.java', 'SecretKeySpec k = new SecretKeySpec(kms.decrypt(wrapped), "AES");'],
      ['src/a.go', 'block, _ := aes.NewCipher(dataKey)'],
      ['src/A.cs', 'aes.Key = await keyVault.GetKeyBytesAsync("data");'],
    ],
  },
  {
    id: 'crypto/tls-verification-disabled', baseline: 'SECURITY-16',
    title: 'TLS certificate or hostname verification is turned off',
    fix: 'Keep verification on; for a private CA, pass that CA bundle (ca / verify="path" / a trust store) instead of disabling checks.',
    re: {
      js: /\brejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED['"]?\s*\]?\s*[:=]\s*['"]?0|\bstrictSSL\s*:\s*false|\bcheckServerIdentity\s*:\s*\(\s*\)\s*=>\s*(?:undefined|null|\{\s*\})/,
      py: /\bverify\s*=\s*False\b|\bssl\._create_unverified_context\b|\bssl\.CERT_NONE\b|\bcheck_hostname\s*=\s*False\b|_create_default_https_context\s*=/,
      jvm: /\bNoopHostnameVerifier\b|\bALLOW_ALL_HOSTNAME_VERIFIER\b|\bTrustAllStrategy\b|\bTrustSelfSignedStrategy\b|\bInsecureTrustManagerFactory\b|HostnameVerifier\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*->\s*true|\(\s*\w+\s*,\s*\w+\s*\)\s*->\s*true\s*\)/,
      go: /\bInsecureSkipVerify\s*:\s*true/,
      cs: /Certificate\w*ValidationCallback\s*\+?=\s*(?:\([^)]*\)|\w+)\s*=>\s*true|\bDangerousAcceptAnyServerCertificateValidator\b|RemoteCertificateValidationCallback[^;]*=>\s*true/,
      php: /CURLOPT_SSL_VERIFY(?:PEER|HOST)\s*,\s*(?:false|0)\b|['"]verify_peer(?:_name)?['"]\s*=>\s*false|['"]verify['"]\s*=>\s*false/i,
      rb: /\bVERIFY_NONE\b|\bverify_mode:\s*OpenSSL::SSL::VERIFY_NONE|\bssl_verify\s*[:=]\s*false/,
      shell: /\bcurl\b[^\n]*\s(?:-[a-zA-Z]*k[a-zA-Z]*|--insecure)\b|\bwget\b[^\n]*--no-check-certificate|\bhttp\.sslVerify\s+false\b|\bGIT_SSL_NO_VERIFY\b|\bstrict-ssl\s+false\b|\bPYTHONHTTPSVERIFY\s*=\s*0/,
      ps: /-SkipCertificateCheck\b|ServerCertificateValidationCallback\s*=\s*\{\s*\$true\s*\}/,
      docker: /\bcurl\b[^\n]*\s(?:-[a-zA-Z]*k[a-zA-Z]*|--insecure)\b|\bwget\b[^\n]*--no-check-certificate|\bhttp\.sslVerify\s+false\b|\bGIT_SSL_NO_VERIFY\b|\bstrict-ssl\s+false\b|--trusted-host\b/,
      yaml: /\bcurl\b[^\n]*\s(?:-[a-zA-Z]*k[a-zA-Z]*|--insecure)\b|\bwget\b[^\n]*--no-check-certificate|\bGIT_SSL_NO_VERIFY\b|\bstrict-ssl\s+false\b|\binsecure-skip-tls-verify\s*:\s*true\b|\bNODE_TLS_REJECT_UNAUTHORIZED\s*:\s*['"]?0/,
      config: /\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0\b|\bstrict-ssl\s*=\s*false\b|\bPYTHONHTTPSVERIFY\s*=\s*0\b|\bssl_verify\s*=\s*false\b/i,
    },
    unless: { py: /\bjwt\.decode\s*\(/ },
    bad: [
      ['src/a.ts', 'const agent = new https.Agent({ rejectUnauthorized: false });'],
      ['src/a.py', 'r = requests.get(url, verify=False)'],
      ['src/A.java', 'HttpClients.custom().setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE).build();'],
      ['src/a.go', 'tr := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}'],
      ['src/A.cs', 'handler.ServerCertificateCustomValidationCallback = (m, c, ch, e) => true;'],
      ['src/a.php', 'curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);'],
      ['src/a.rb', 'http.verify_mode = OpenSSL::SSL::VERIFY_NONE'],
      ['scripts/get.sh', 'curl -fsSLk https://internal/api'],
      ['scripts/get.ps1', 'Invoke-RestMethod $url -SkipCertificateCheck'],
      ['Dockerfile', 'RUN pip install --trusted-host pypi.internal -r requirements.txt'],
      ['.github/workflows/ci.yml', '        run: wget --no-check-certificate https://x/tool.tgz'],
      ['.env', 'NODE_TLS_REJECT_UNAUTHORIZED=0'],
    ],
    good: [
      ['src/a.ts', 'const agent = new https.Agent({ ca: fs.readFileSync(caPath) });'],
      ['src/a.py', 'r = requests.get(url, verify="/etc/ssl/internal-ca.pem", timeout=10)'],
      ['src/A.java', 'HttpClients.custom().setSSLContext(sslContextWithInternalCa).build();'],
      ['src/a.go', 'tr := &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}}'],
      ['src/A.cs', 'handler.SslOptions.RemoteCertificateValidationCallback = ValidateAgainstPinnedCa;'],
      ['src/a.php', 'curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);'],
      ['src/a.rb', 'http.verify_mode = OpenSSL::SSL::VERIFY_PEER'],
      ['scripts/get.sh', 'curl -fsSL --cacert internal-ca.pem https://internal/api -o keys.json'],
      ['scripts/get.ps1', 'Invoke-RestMethod $url'],
      ['Dockerfile', 'RUN pip install --require-hashes -r requirements.txt'],
      ['.github/workflows/ci.yml', '        run: wget https://x/tool.tgz'],
      ['.env', 'NODE_TLS_REJECT_UNAUTHORIZED=1'],
    ],
  },
  {
    id: 'crypto/trust-all-certificates', baseline: 'SECURITY-16', multiline: true,
    title: 'An X509TrustManager accepts every certificate (empty checkServerTrusted)',
    fix: 'Do not implement a TrustManager; load the CA you trust into a KeyStore and use TrustManagerFactory.',
    re: { jvm: /checkServerTrusted\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{\s*(?:\/\/[^\n]*\s*)*\}/ },
    bad: [['src/Tls.java', 'public void checkServerTrusted(X509Certificate[] chain, String authType) {\n}']],
    good: [['src/Tls.java', 'public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {\n  delegate.checkServerTrusted(chain, authType);\n}']],
  },

  // SECURITY-01: encryption in transit and at rest
  {
    id: 'transport/old-tls-version', baseline: 'SECURITY-01',
    title: 'TLS older than 1.2 (or SSL) is allowed',
    fix: 'Require TLS 1.2 or newer (TLS 1.3 where both ends support it).',
    re: {
      js: /\bminVersion\s*:\s*['"`]TLSv1(?:\.1)?['"`]|\bsecureProtocol\s*:\s*['"`](?:TLSv1_method|TLSv1_1_method|SSLv3_method|SSLv23_method)['"`]/,
      py: /\bssl\.PROTOCOL_(?:TLSv1|TLSv1_1|SSLv2|SSLv3)\b|\bTLSVersion\.(?:TLSv1|TLSv1_1|SSLv3)\b/,
      jvm: /SSLContext\.getInstance\(\s*"(?:SSL|SSLv3|TLSv1|TLSv1\.1)"\s*\)|setEnabledProtocols\([^)]*"(?:SSLv3|TLSv1|TLSv1\.1)"/,
      go: /\bMinVersion\s*:\s*tls\.Version(?:TLS10|TLS11|SSL30)\b/,
      cs: /\bSslProtocols\.(?:Ssl2|Ssl3|Tls|Tls11)\b|\bSecurityProtocolType\.(?:Ssl3|Tls|Tls11)\b/,
      tf: /\b(?:min_tls_version|minimum_tls_version|ssl_minimal_tls_version_enforced)\s*=\s*"(?:TLS1_0|TLS1_1|1\.0|1\.1|TLSEnforcementDisabled)"|\bminimum_protocol_version\s*=\s*"(?:SSLv3|TLSv1|TLSv1_2016|TLSv1\.1_2016)"/,
      config: /\bssl_protocols\b[^;\n]*\b(?:SSLv2|SSLv3|TLSv1(?!\.)|TLSv1\.1)\b|\bSSLProtocol\b[^\n]*(?<![-!])\b(?:SSLv3|TLSv1(?!\.)|TLSv1\.1)\b/,
      yaml: /\bMinimumProtocolVersion\s*:\s*['"]?(?:SSLv3|TLSv1(?![.\w])|TLSv1_2016|TLSv1\.1_2016)\b|\bssl-protocols\s*:\s*['"]?[^\n]*\b(?:SSLv3|TLSv1(?!\.)|TLSv1\.1)\b/,
    },
    bad: [
      ['src/a.js', "tls.createServer({ minVersion: 'TLSv1', key, cert });"],
      ['src/a.py', 'ctx = ssl.SSLContext(ssl.PROTOCOL_TLSv1)'],
      ['src/A.java', 'SSLContext ctx = SSLContext.getInstance("TLSv1.1");'],
      ['src/a.go', 'cfg := &tls.Config{MinVersion: tls.VersionTLS10}'],
      ['src/A.cs', 'o.SslProtocols = SslProtocols.Tls11;'],
      ['infra/main.tf', '  min_tls_version = "TLS1_0"'],
      ['deploy/nginx.conf', '    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;'],
      ['infra/cdn.yaml', '        MinimumProtocolVersion: TLSv1'],
    ],
    good: [
      ['src/a.js', "tls.createServer({ minVersion: 'TLSv1.2', key, cert });"],
      ['src/a.py', 'ctx = ssl.create_default_context(); ctx.minimum_version = ssl.TLSVersion.TLSv1_2'],
      ['src/A.java', 'SSLContext ctx = SSLContext.getInstance("TLSv1.3");'],
      ['src/a.go', 'cfg := &tls.Config{MinVersion: tls.VersionTLS12}'],
      ['src/A.cs', 'o.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;'],
      ['infra/main.tf', '  min_tls_version = "TLS1_2"'],
      ['deploy/nginx.conf', '    ssl_protocols TLSv1.2 TLSv1.3;'],
      ['infra/cdn.yaml', '        MinimumProtocolVersion: TLSv1.2_2021'],
    ],
  },
  {
    id: 'transport/unencrypted-connection', baseline: 'SECURITY-01',
    title: 'A database or service connection turns encryption off',
    fix: 'Require TLS on the connection (sslmode=verify-full, Encrypt=True with certificate validation, ssl/tls=true).',
    re: /\bsslmode\s*[=:]\s*['"]?(?:disable|allow|prefer)\b|\buseSSL\s*=\s*false\b|[?&;](?:ssl|tls)\s*=\s*false\b|\bEncrypt\s*=\s*(?:False|no|optional)\b|\bTrustServerCertificate\s*=\s*(?:True|yes)\b|\brequireSSL\s*=\s*false\b|(?<![\w-])ssl\s*:\s*false\b/i,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb', 'config', 'yaml', 'json', 'tf', 'docker', 'shell', 'ps'],
    bad: [
      ['src/db.py', 'DSN = "host=db dbname=app user=app sslmode=disable"'],
      ['src/appsettings.json', '    "Default": "Server=db;Database=app;Encrypt=False;"'],
      ['src/db.js', 'const pool = new Pool({ host, ssl: false });'],
      ['src/application.properties', 'spring.datasource.url=jdbc:mysql://db/app?useSSL=false'],
    ],
    good: [
      ['src/db.py', 'DSN = "host=db dbname=app user=app sslmode=verify-full"'],
      ['src/appsettings.json', '    "Default": "Server=db;Database=app;Encrypt=True;"'],
      ['src/db.js', 'const pool = new Pool({ host, ssl: { ca } });'],
      ['src/application.properties', 'spring.datasource.url=jdbc:mysql://db/app?sslMode=VERIFY_IDENTITY'],
    ],
  },
  {
    id: 'iac/encryption-disabled', baseline: 'SECURITY-01',
    title: 'Encryption at rest or in transit is switched off on a resource',
    fix: 'Enable it (managed or customer-managed KMS key for storage; HTTPS/TLS-only for transport).',
    re: {
      tf: /\b(?:storage_encrypted|encrypted|at_rest_encryption_enabled|transit_encryption_enabled|enable_https_traffic_only|https_traffic_only_enabled|ssl_enforcement_enabled|kms_encrypted|encryption_at_rest_enabled|infrastructure_encryption_enabled)\s*=\s*false\b/,
      yaml: /\b(?:StorageEncrypted|Encrypted|AtRestEncryptionEnabled|TransitEncryptionEnabled|KmsEncrypted)\s*:\s*['"]?false\b/i,
      json: /"(?:StorageEncrypted|Encrypted|AtRestEncryptionEnabled|TransitEncryptionEnabled|KmsEncrypted)"\s*:\s*['"]?false\b/i,
    },
    bad: [['infra/db.tf', '  storage_encrypted = false'], ['infra/stack.yaml', '      StorageEncrypted: false'], ['infra/stack.json', '        "Encrypted": false,']],
    good: [['infra/db.tf', '  storage_encrypted = true'], ['infra/stack.yaml', '      StorageEncrypted: true'], ['infra/stack.json', '        "Encrypted": true,']],
  },
  {
    id: 'iac/storage-without-encryption', baseline: 'SECURITY-01',
    title: 'A data store is defined without encryption at rest',
    fix: 'Turn encryption on in the resource (storage_encrypted / encrypted = true, with a kms_key_id for customer-managed keys).',
    langs: ['tf'],
    check(text, lines, lang) {
      if (lang !== 'tf') return [];
      const need = {
        aws_db_instance: [/\bstorage_encrypted\s*=\s*true\b/, 'storage_encrypted = true'],
        aws_rds_cluster: [/\bstorage_encrypted\s*=\s*true\b/, 'storage_encrypted = true'],
        aws_docdb_cluster: [/\bstorage_encrypted\s*=\s*true\b/, 'storage_encrypted = true'],
        aws_neptune_cluster: [/\bstorage_encrypted\s*=\s*true\b/, 'storage_encrypted = true'],
        aws_ebs_volume: [/\bencrypted\s*=\s*true\b/, 'encrypted = true'],
        aws_efs_file_system: [/\bencrypted\s*=\s*true\b/, 'encrypted = true'],
        aws_redshift_cluster: [/\bencrypted\s*=\s*true\b/, 'encrypted = true'],
      };
      const out = [];
      for (const r of hclResources(text)) {
        if (r.type === 'aws_elasticache_replication_group') {
          const miss = ['at_rest_encryption_enabled', 'transit_encryption_enabled'].filter((k) => !new RegExp(`\\b${k}\\s*=\\s*true\\b`).test(r.body));
          if (miss.length) out.push({ line: r.line, end: r.end, detail: `${r.type}.${r.name} has no ${miss.map((k) => `${k} = true`).join(' / ')}` });
          continue;
        }
        const n = need[r.type];
        if (n && !n[0].test(r.body)) out.push({ line: r.line, end: r.end, detail: `${r.type}.${r.name} has no ${n[1]}` });
      }
      return out;
    },
    bad: [['infra/db.tf', 'resource "aws_db_instance" "main" {\n  engine = "postgres"\n  instance_class = "db.t3.micro"\n}']],
    good: [['infra/db.tf', 'resource "aws_db_instance" "main" {\n  engine = "postgres"\n  storage_encrypted = true\n  kms_key_id = aws_kms_key.db.arn\n}']],
  },

  // SECURITY-02: access logging
  {
    id: 'iac/missing-access-logs', baseline: 'SECURITY-02',
    title: 'A load balancer, API gateway stage or CDN distribution has no access logging',
    fix: 'Add access logging to a persistent, centralised store (access_logs { enabled = true }, access_log_settings, logging_config).',
    langs: ['tf'],
    check(text, lines, lang) {
      if (lang !== 'tf') return [];
      const need = {
        aws_lb: [/\baccess_logs\s*\{[^}]*\benabled\s*=\s*true\b/, 'access_logs { enabled = true }'],
        aws_alb: [/\baccess_logs\s*\{[^}]*\benabled\s*=\s*true\b/, 'access_logs { enabled = true }'],
        aws_elb: [/\baccess_logs\s*\{/, 'access_logs { ... }'],
        aws_api_gateway_stage: [/\baccess_log_settings\s*\{/, 'access_log_settings { ... }'],
        aws_apigatewayv2_stage: [/\baccess_log_settings\s*\{/, 'access_log_settings { ... }'],
        aws_cloudfront_distribution: [/\blogging_config\s*\{/, 'logging_config { ... }'],
      };
      return hclResources(text).filter((r) => need[r.type] && !need[r.type][0].test(r.body))
        .map((r) => ({ line: r.line, end: r.end, detail: `${r.type}.${r.name} has no ${need[r.type][1]}` }));
    },
    bad: [['infra/lb.tf', 'resource "aws_lb" "web" {\n  load_balancer_type = "application"\n  subnets = var.public_subnets\n}']],
    good: [['infra/lb.tf', 'resource "aws_lb" "web" {\n  load_balancer_type = "application"\n  access_logs {\n    bucket  = aws_s3_bucket.logs.id\n    enabled = true\n  }\n}']],
  },

  // SECURITY-03, SECURITY-14: logging
  {
    id: 'logging/sensitive-value', baseline: 'SECURITY-03', code: true,
    title: 'A password, secret, token, key or card number is written to a log or console',
    fix: 'Log an identifier or a masked value instead (e.g. the last 4 characters), never the credential itself.',
    re: /(?:\bconsole\.(?:log|info|warn|error|debug|trace)|\b(?:logger|log|logging|LOG|LOGGER|_logger|_log|Log|Logger|slog|structlog|winston|pino|bunyan)\.\w+|\bprint|\bprintln|\bprintf|\bSystem\.(?:out|err)\.print(?:ln|f)?|\bConsole\.Write(?:Line)?|\bfmt\.(?:Print|Println|Printf|Fprintf|Fprintln)|\berror_log|\bputs|\bp)\s*\(/,
    // Matches only when the credential value itself is logged; length and null checks are removed first.
    when: (m, at) => /\b\w*(?:Password|PASSWORD|password|Passwd|passwd|PASSWD|Secret|SECRET|secret|Token|TOKEN|token|ApiKey|API_KEY|apiKey|api_key|PrivateKey|privateKey|private_key|Authorization|authorization|CardNumber|cardNumber|card_number|\bcvv|\bCVV|\bssn|\bSSN)\b/
      .test(at.target.replace(/\blen\(\s*[\w.[\]'"]+\s*\)|\b[\w.]+\.(?:length|size|Length|Count)\b|!!\s*[\w.]+|\b(?:Boolean|bool)\([^)]*\)|\b[\w.]+\s*(?:===?|!==?)\s*(?:null|undefined|None|nil)\b|\b[\w.]+\s+is\s+(?:not\s+)?None\b/g, '')),
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb'],
    bad: [
      ['src/a.js', 'console.log("login", user.email, password);'],
      ['src/a.py', 'logger.info(f"refreshing with {refresh_token}")'],
      ['src/A.java', 'log.debug("key=" + apiKey);'],
      ['src/a.go', 'log.Printf("token: %s", token)'],
    ],
    good: [
      ['src/a.js', 'console.log("Password reset requested", { userId });'],
      ['src/a.py', 'logger.info("token refreshed for %s", user.id)\nlogger.info(f"Token found in cookie (length: {len(token)})")'],
      ['src/A.java', 'log.debug("key rotated, tokenExpiry=" + tokenExpiry);'],
      ['src/a.go', 'log.Printf("password changed for %s", userID)'],
    ],
  },
  {
    id: 'logging/print-stack-trace', baseline: 'SECURITY-03',
    title: 'A stack trace is printed to stdout/stderr instead of going through the logger',
    fix: 'Log the exception through the configured structured logger (logger.error("...", e)), which routes to the central log service.',
    re: { jvm: /\.printStackTrace\s*\(\s*\)/, py: /\btraceback\.print_exc\s*\(/ },
    bad: [['src/A.java', '} catch (IOException e) { e.printStackTrace(); }'], ['src/a.py', '    traceback.print_exc()']],
    good: [['src/A.java', '} catch (IOException e) { log.error("upload failed", e); throw e; }'], ['src/a.py', '    logger.exception("upload failed")']],
  },
  {
    id: 'logging/short-retention', baseline: 'SECURITY-14',
    title: 'Log retention is shorter than 90 days',
    fix: 'Retain logs for at least 90 days (or longer if the project\'s compliance rules require it).',
    re: { tf: /\b(?:retention_in_days|retention_days)\s*=\s*(\d+)\b/, yaml: /\bRetentionInDays\s*:\s*['"]?(\d+)\b/, json: /"RetentionInDays"\s*:\s*['"]?(\d+)\b/ },
    when: (m) => +m[1] > 0 && +m[1] < 90,
    bad: [['infra/logs.tf', '  retention_in_days = 14'], ['infra/stack.yaml', '      RetentionInDays: 30'], ['infra/stack.json', '      "RetentionInDays": 7,']],
    good: [['infra/logs.tf', '  retention_in_days = 365'], ['infra/stack.yaml', '      RetentionInDays: 90'], ['infra/stack.json', '      "RetentionInDays": 400,']],
  },

  // SECURITY-04: HTTP security headers
  {
    id: 'headers/weak-csp', baseline: 'SECURITY-04',
    title: "The Content-Security-Policy allows 'unsafe-inline', 'unsafe-eval' or any script source",
    fix: "Use nonces or hashes for inline code and drop 'unsafe-inline'/'unsafe-eval'/*; a need the design documents is a Security Decision in architecture.md, not a code change.",
    re: /'unsafe-(?:inline|eval|hashes)'|\b(?:script-src|default-src)\s+(?:[^;'"\n]*\s)?\*(?=[\s;'"]|$)/,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb', 'html', 'config', 'yaml', 'json', 'tf'],
    bad: [['src/a.js', "      scriptSrc: [\"'self'\", \"'unsafe-inline'\"],"], ['deploy/nginx.conf', '    add_header Content-Security-Policy "default-src *";']],
    good: [['src/a.js', "      scriptSrc: [\"'self'\", (req, res) => `'nonce-${res.locals.nonce}'`],"], ['deploy/nginx.conf', "    add_header Content-Security-Policy \"default-src 'self'\";"]],
  },
  {
    id: 'headers/short-hsts', baseline: 'SECURITY-04',
    title: 'HSTS max-age is below one year',
    fix: 'Set Strict-Transport-Security: max-age=31536000; includeSubDomains.',
    re: /Strict-Transport-Security[^\n]*max-age=(\d+)|\bhsts\b[^\n]*\bmaxAge\s*:\s*(\d+)|\bSECURE_HSTS_SECONDS\s*=\s*(\d+)|\bmaxAgeInSeconds\(\s*(\d+)|\.MaxAge\s*=\s*TimeSpan\.FromDays\(\s*(\d+)/i,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb', 'config', 'yaml'],
    when: (m) => (m[5] !== undefined ? +m[5] < 365 : +(m[1] || m[2] || m[3] || m[4]) < 31536000),
    bad: [['src/a.js', 'app.use(helmet.hsts({ maxAge: 86400 }));'], ['src/settings.py', 'SECURE_HSTS_SECONDS = 3600'], ['src/Startup.cs', 'o.MaxAge = TimeSpan.FromDays(30);']],
    good: [['src/a.js', 'app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));'], ['src/settings.py', 'SECURE_HSTS_SECONDS = 31536000'], ['src/Startup.cs', 'o.MaxAge = TimeSpan.FromDays(365);']],
  },
  {
    id: 'headers/header-disabled', baseline: 'SECURITY-04',
    title: 'A required security header is switched off or weakened',
    fix: 'Keep CSP, HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY/SAMEORIGIN and Referrer-Policy on for every HTML response.',
    re: /\b(?:contentSecurityPolicy|hsts|strictTransportSecurity|frameguard|xFrameOptions|noSniff|xContentTypeOptions|referrerPolicy)\s*:\s*false\b|X-Frame-Options['"]?\s*[,:=]\s*['"]?ALLOW|\bSECURE_CONTENT_TYPE_NOSNIFF\s*=\s*False\b|\bX_FRAME_OPTIONS\s*=\s*['"]ALLOW|\.frameOptions\(\s*\)\s*\.disable\(\)|frameOptions\(\s*\w+\s*->\s*\w+\.disable\(\)\)|\.contentTypeOptions\(\s*\)\s*\.disable\(\)|\.httpStrictTransportSecurity\(\s*\)\s*\.disable\(\)/,
    langs: ['js', 'py', 'jvm', 'cs', 'php', 'rb', 'config', 'yaml'],
    bad: [['src/app.ts', 'app.use(helmet({ contentSecurityPolicy: false }));'], ['src/Sec.java', 'http.headers(h -> h.frameOptions(f -> f.disable()));'], ['src/settings.py', 'X_FRAME_OPTIONS = "ALLOWALL"']],
    good: [['src/app.ts', 'app.use(helmet());'], ['src/Sec.java', 'http.headers(h -> h.frameOptions(f -> f.deny()));'], ['src/settings.py', 'X_FRAME_OPTIONS = "DENY"']],
  },

  // SECURITY-05: input handling and injection
  {
    id: 'injection/sql-string-building', baseline: 'SECURITY-05',
    title: 'A value is written into SQL text where a bound parameter belongs',
    fix: 'Pass the value as a bound parameter (placeholder + values, a prepared statement, an ORM query builder, or a tagged sql`` template).',
    re: {
      js: sqlRx(
        String.raw`(?<![\w$.)\]])` + sqlIn(String.raw`\x60`, String.raw`\$\{`),
        sqlIn('"', String.raw`"\s*\+`), sqlIn("'", String.raw`'\s*\+`),
        String.raw`\.(?:whereRaw|havingRaw|orderByRaw|joinRaw|raw|\$queryRawUnsafe|\$executeRawUnsafe)\s*\(\s*\x60[^\x60\n]*?${SQL_VAL}\$\{`,
      ),
      py: sqlRx(
        String.raw`\b[fF][rRbB]?` + sqlIn('"', String.raw`\{(?!\{)`), String.raw`\b[fF][rRbB]?` + sqlIn("'", String.raw`\{(?!\{)`),
        sqlIn('"', String.raw`(?:%[sdr]|\{\w*\})[^"\n]*"\s*(?:%|\.format\()`), sqlIn("'", String.raw`(?:%[sdr]|\{\w*\})[^'\n]*'\s*(?:%|\.format\()`),
        sqlIn('"', String.raw`"\s*\+`), sqlIn("'", String.raw`'\s*\+`),
      ),
      jvm: sqlRx(sqlIn('"', String.raw`"\s*\+`), String.raw`String\.format\(\s*` + sqlIn('"', '%s'), sqlIn('"', String.raw`\$(?:\{|[A-Za-z_])`)),
      go: sqlRx(String.raw`fmt\.Sprintf\(\s*` + sqlIn('"', '%[svq]'), String.raw`fmt\.Sprintf\(\s*` + sqlIn(String.raw`\x60`, '%[svq]'), sqlIn('"', String.raw`"\s*\+`)),
      cs: sqlRx(String.raw`\$@?` + sqlIn('"', String.raw`\{(?!\{)`), String.raw`@\$` + sqlIn('"', String.raw`\{(?!\{)`), sqlIn('"', String.raw`"\s*\+`), String.raw`string\.Format\(\s*@?` + sqlIn('"', String.raw`\{\d`)),
      php: sqlRx(sqlIn('"', String.raw`(?:\$[A-Za-z_]|\{\$)`), sqlIn('"', String.raw`"\s*\.\s*\$`), sqlIn("'", String.raw`'\s*\.\s*\$`)),
      rb: sqlRx(sqlIn('"', String.raw`#\{`), String.raw`\.(?:where|having|order|group|joins|find_by_sql|exec_query|execute|select_all|select_value|pluck|from)\s*\(\s*"[^"\n]*?${SQL_VAL}#\{`),
    },
    // Checks every value position on the line: UPPER_CASE constants and placeholder lists are allowed;
    // any other identifier, or a %s whose argument is not on the line, is a finding.
    when: (m, at) => {
      const ids = [...at.target.slice(m.index).matchAll(SQL_SPLICE)].map((s) => s[1]);
      return !ids.length || ids.some((id) => !(/^(?:[A-Za-z_$][\w$]*\.)*[A-Z][A-Z0-9_]*$/.test(id) || PLACEHOLDER_LIST.test(id)));
    },
    // EF Core FromSql, FromSqlInterpolated and ExecuteSql convert interpolated values into parameters.
    unless: { cs: /\b(?:FromSqlInterpolated|ExecuteSqlInterpolated(?:Async)?|FromSql|SqlQuery|ExecuteSql(?:Async)?)\s*\(\s*\$/ },
    bad: [
      ['src/a.ts', 'const rows = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);'],
      ['src/b.js', `const sql = "SELECT * FROM users WHERE name LIKE '%" + term + "%'";`],
      ['src/c.ts', 'const q = `SELECT * FROM t WHERE a = ${STATUS} AND b = ${req.query.b}`;'],
      ['src/a.py', 'cur.execute(f"SELECT * FROM users WHERE email = \'{email}\'")'],
      ['src/A.java', 'ResultSet rs = st.executeQuery("SELECT * FROM users WHERE id = " + id);'],
      ['src/a.go', 'rows, err := db.Query(fmt.Sprintf("SELECT * FROM users WHERE id = %s", id))'],
      ['src/A.cs', 'var u = ctx.Users.FromSqlRaw($"SELECT * FROM Users WHERE Id = {id}");'],
      ['src/a.php', '$r = $db->query("SELECT * FROM users WHERE id = $id");'],
      ['src/a.rb', 'User.where("name = \'#{params[:name]}\'")'],
    ],
    good: [
      ['src/a.ts', 'const rows = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]); const r = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;'],
      ['src/b.js', "db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);\nconst sql = `SELECT * FROM leads ${where} ORDER BY updated_at`;\nconst q = `SELECT * FROM jobs WHERE status = ${STATUS_DONE}`;"],
      ['src/a.py', 'cur.execute("SELECT * FROM users WHERE email = %s", (email,))\nconn.execute(text(f"ALTER TABLE events ADD COLUMN {name} {ddl}"))\nq = f"SELECT email FROM users WHERE email IN ({placeholders})"\nq = f"INSERT INTO log ({columns}) VALUES ({placeholders})"'],
      ['src/A.java', 'PreparedStatement ps = c.prepareStatement("SELECT * FROM users WHERE id = ?");'],
      ['src/a.go', 'rows, err := db.Query("SELECT * FROM users WHERE id = $1", id)'],
      ['src/A.cs', 'var u = ctx.Users.FromSqlInterpolated($"SELECT * FROM Users WHERE Id = {id}");'],
      ['src/a.php', '$st = $db->prepare("SELECT * FROM users WHERE id = ?"); $st->execute([$id]);'],
      ['src/a.rb', 'User.where(name: params[:name])'],
    ],
  },
  {
    id: 'injection/os-command', baseline: 'SECURITY-05',
    title: 'An OS command is built from a variable or run through a shell',
    fix: 'Run the program directly with an argument array (execFile/spawn without shell, subprocess.run([...]), ProcessBuilder(list), exec.Command(name, args...)) and validate each argument against an allowlist.',
    re: {
      js: /(?:^|[^.\w$]|child_process\.|\bcp\.)(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+|[A-Za-z_$][\w$.]*\s*\+)|\b(?:spawn|spawnSync|execFile|execFileSync)\s*\([^)]*\bshell\s*:\s*true/,
      py: /\bsubprocess\.\w+\(\s*(?!['"][^'"]*['"]\s*,)[^)]*\bshell\s*=\s*True|\bos\.(?:system|popen)\s*\(\s*(?!['"][^'"]*['"]\s*\))|\bcommands\.getoutput\s*\(/,
      jvm: /\bRuntime\.getRuntime\(\)\.exec\(\s*(?!"[^"]*"\s*\))|\bnew\s+ProcessBuilder\(\s*"(?:sh|bash|cmd|cmd\.exe|powershell|powershell\.exe|pwsh)"\s*,\s*"(?:-c|\/c|\/C|-Command)"/,
      go: /\bexec\.Command(?:Context)?\(\s*(?:ctx\s*,\s*)?"(?:sh|bash|cmd|cmd\.exe|powershell|pwsh)"\s*,\s*"(?:-c|\/c|\/C|-Command)"\s*,\s*(?!"[^"]*"\s*\))/,
      cs: /\bProcess\.Start\(\s*"(?:cmd|cmd\.exe|powershell|powershell\.exe|pwsh|bash|sh)"\s*,\s*(?:\$"|"[^"]*"\s*\+|[\w.]+\s*\+)|\bArguments\s*=\s*(?:\$"[^"]*\{|"[^"]*"\s*\+)/,
      php: /\b(?:exec|shell_exec|system|passthru|popen|proc_open)\s*\(\s*(?!['"][^'"$]*['"]\s*[,)])|`[^`]*\$\w/,
      rb: /\b(?:system|exec|spawn)\s*\(\s*"[^"]*#\{|`[^`]*#\{|%x\{|\bIO\.popen\(\s*"[^"]*#\{|\bOpen3\.\w+\(\s*"[^"]*#\{/,
    },
    when: (m, at) => !splicesOnlyConstants(at.lines[at.i]),
    bad: [
      ['src/a.js', 'exec(`convert ${req.query.file} out.png`, cb);'],
      ['src/a.py', 'subprocess.run(f"tar -xf {name}", shell=True)'],
      ['src/A.java', 'Runtime.getRuntime().exec("ping " + host);'],
      ['src/a.go', 'out, err := exec.Command("sh", "-c", "ping "+host).Output()'],
      ['src/A.cs', 'Process.Start("cmd.exe", "/c ping " + host);'],
      ['src/a.php', 'system("ping " . $host);'],
      ['src/a.rb', 'system("ping #{host}")'],
    ],
    good: [
      ['src/a.js', "execFile('convert', [file, 'out.png'], cb); const m = re.exec(`x${y}`);\nexecSync(`node ${SCRIPT_PATH}`, { stdio: 'pipe' });"],
      ['src/a.py', 'subprocess.run(["tar", "-xf", name], check=True)'],
      ['src/A.java', 'new ProcessBuilder("ping", "-c", "1", host).start();'],
      ['src/a.go', 'out, err := exec.Command("ping", "-c", "1", host).Output()'],
      ['src/A.cs', 'var p = Process.Start(new ProcessStartInfo("ping") { ArgumentList = { "-c", "1", host } });'],
      ['src/a.php', '$out = escapeshellarg($host);'],
      ['src/a.rb', 'system("ping", "-c", "1", host)'],
    ],
  },
  {
    id: 'injection/code-evaluation', baseline: 'SECURITY-05',
    title: 'Code is evaluated from a string at runtime',
    fix: 'Do not evaluate code; parse data with a real parser (JSON.parse, ast.literal_eval) or dispatch through an allowlisted map of functions.',
    re: {
      js: /(?<![.\w$])eval\s*\(|\bnew\s+Function\s*\(|\bset(?:Timeout|Interval)\s*\(\s*(?:['"`]|[A-Za-z_$][\w$]*\s*\+)|\bvm\.(?:runInNewContext|runInThisContext|runInContext|compileFunction)\s*\(|\bnew\s+vm\.Script\s*\(/,
      py: /(?<![.\w])(?:eval|exec)\s*\(|\bcompile\s*\([^)]*['"]exec['"]/,
      jvm: /\bparseExpression\(\s*(?!"[^"]*"\s*\))|\bScriptEngine\b[^;]*\.eval\s*\(|\bgetEngineByName\([^)]*\)\s*\.eval\s*\(/,
      cs: /\bCSharpScript\.(?:EvaluateAsync|RunAsync|Create)\s*\(/,
      php: /(?<![\w>$])(?:eval|assert|create_function)\s*\(|\bpreg_replace\s*\(\s*['"]([^\w\s])[^'"]*\1[a-z]*e[a-z]*['"]/,
      rb: /(?<![.\w])(?:eval|instance_eval|class_eval|module_eval)\s*[( ]|\.send\(\s*params\b|\bconstantize\b/,
    },
    bad: [
      ['src/a.js', 'const result = eval(req.body.expression);'],
      ['src/a.py', 'value = eval(request.args["expr"])'],
      ['src/A.java', 'Expression e = parser.parseExpression(userInput);'],
      ['src/A.cs', 'var r = await CSharpScript.EvaluateAsync(code);'],
      ['src/a.php', 'eval($_POST["code"]);'],
      ['src/a.rb', 'klass = params[:type].constantize'],
    ],
    good: [
      ['src/a.js', 'const result = JSON.parse(req.body.payload); const v = obj.eval;'],
      ['src/a.py', 'value = ast.literal_eval(request.args["expr"])'],
      ['src/A.java', 'Expression e = parser.parseExpression("amount * rate");'],
      ['src/A.cs', 'var handler = handlers[name];'],
      ['src/a.php', '$v = json_decode($_POST["data"], true);'],
      ['src/a.rb', 'klass = ALLOWED_TYPES.fetch(params[:type])'],
    ],
  },
  {
    id: 'injection/html-sink', baseline: 'SECURITY-05',
    title: 'Unsanitised HTML is written into the page (XSS sink)',
    fix: 'Render text with textContent / the framework\'s escaping; if HTML is truly needed, sanitise it first (DOMPurify.sanitize, bleach, OWASP Java HTML Sanitizer).',
    re: {
      js: /\.(?:innerHTML|outerHTML)\s*\+?=(?!=)|\bdocument\.write(?:ln)?\s*\(|\.insertAdjacentHTML\s*\(|\bdangerouslySetInnerHTML\b|\bv-html\s*=|\bbypassSecurityTrust(?:Html|Script|Style|Url|ResourceUrl)\s*\(|\$\([^)]*\)\.(?:html|append|prepend|after|before)\(\s*(?!\s*\))(?![`'"][^`'"$]*[`'"]\s*\))|\{@html\s/,
      html: /\bv-html\s*=|\{\{\{|<%-\s*(?!include\b)|\|\s*safe\b|\{%\s*autoescape\s+(?:false|off)|@Html\.Raw\s*\(|\bth:utext\s*=|\{!!/,
      py: /\bmark_safe\s*\(|\bMarkup\s*\(\s*(?!['"][^'"]*['"]\s*\))|\bautoescape\s*=\s*False\b|\brender_template_string\s*\(\s*(?!['"][^'"]*['"]\s*[,)])/,
      jvm: /\bth:utext\b|\.getWriter\(\)\.(?:print|println|write)\(\s*[^)]*request\.getParameter\(/,
      cs: /@Html\.Raw\s*\(|\bnew\s+HtmlString\s*\(|\(MarkupString\)/,
      php: /\b(?:echo|print)\s*\(?\s*\$_(?:GET|POST|REQUEST|COOKIE)\b/,
      go: /\btemplate\.(?:HTML|JS|URL|HTMLAttr)\(\s*(?!"[^"]*"\s*\))/,
    },
    unless: {
      js: /DOMPurify\.sanitize|\bsanitize(?:Html)?\s*\(|\.(?:innerHTML|outerHTML)\s*=\s*(?:(['"])(?:(?!\1).)*\1|`[^`$]*`)\s*;?\s*$/,
      py: /\bbleach\.clean\s*\(|\bnh3\.clean\s*\(/,
      go: /bluemonday/,
    },
    bad: [
      ['src/a.js', 'el.innerHTML = comment.body;'],
      ['src/Page.vue', '<div v-html="post.body"></div>'],
      ['src/templates/page.html', '<p>{{ bio | safe }}</p>'],
      ['src/a.py', 'html = mark_safe(user.bio)'],
      ['src/A.java', 'response.getWriter().println("Hello " + request.getParameter("name"));'],
      ['src/Page.cshtml', '@Html.Raw(Model.Bio)'],
      ['src/Bio.cs', 'var html = new HtmlString(model.Bio);'],
      ['src/a.php', 'echo $_GET["q"];'],
      ['src/a.go', 'data := template.HTML(r.FormValue("bio"))'],
    ],
    good: [
      ['src/a.js', `el.textContent = comment.body; el.innerHTML = DOMPurify.sanitize(html);\nlist.innerHTML = '<option value="">None</option>';`],
      ['src/Page.vue', '<div>{{ post.body }}</div>'],
      ['src/templates/page.html', '<p>{{ bio }}</p>'],
      ['src/a.py', 'html = bleach.clean(user.bio)'],
      ['src/A.java', 'response.getWriter().println(Encode.forHtml(name));'],
      ['src/Page.cshtml', '@Model.Bio'],
      ['src/a.php', 'echo htmlspecialchars($q, ENT_QUOTES);'],
      ['src/a.go', 'data := template.HTML("<b>static</b>")'],
    ],
  },
  {
    id: 'injection/nosql-operator', baseline: 'SECURITY-05',
    title: 'A NoSQL query takes the request object directly, or uses $where',
    fix: 'Build the filter from validated, typed fields ({ email: String(body.email) }); never pass req.body/req.query as the filter, never use $where.',
    re: { js: /['"]?\$where['"]?\s*:|\.(?:find|findOne|findOneAndUpdate|findOneAndDelete|updateOne|updateMany|deleteOne|deleteMany|countDocuments|exists)\(\s*req\.(?:body|query|params)\s*[,)]/, py: /['"]\$where['"]\s*:|\.(?:find|find_one|update_one|update_many|delete_one|delete_many|count_documents)\(\s*request\.(?:json|args|form|get_json\(\))\s*[,)]/ },
    bad: [['src/a.js', 'const user = await User.findOne(req.body);'], ['src/a.py', 'doc = coll.find_one(request.json)']],
    good: [['src/a.js', 'const user = await User.findOne({ email: String(req.body.email) });'], ['src/a.py', 'doc = coll.find_one({"email": str(payload.email)})']],
  },
  {
    id: 'request/ssrf-direct', baseline: 'SECURITY-05', owasp: 'A01:2025',
    title: 'A server-side request goes to a URL taken straight from the request (SSRF)',
    fix: 'Resolve the target from an allowlist (ID -> URL), or validate scheme and host against an allowlist and block private, loopback and metadata addresses; do not follow redirects to other hosts.',
    re: {
      js: /\b(?:fetch|axios(?:\.(?:get|post|put|delete|patch|head|request))?|got(?:\.(?:get|post|put|delete|patch|head))?|needle|superagent\.get|https?\.(?:get|request))\(\s*req\.(?:query|body|params)\.\w+/,
      py: /\b(?:requests\.(?:get|post|put|delete|head|patch|request)|urlopen|urllib\.request\.urlopen|httpx\.(?:get|post|put|delete|request|stream))\(\s*request\.(?:args|form|values|GET|POST|json|query_params|data)\b/,
      jvm: /\bnew\s+URL\(\s*request\.getParameter\(|\.(?:getForObject|getForEntity|exchange|postForObject|postForEntity)\(\s*request\.getParameter\(/,
      go: /\bhttp\.(?:Get|Post|Head)\(\s*r\.(?:URL\.Query\(\)\.Get|FormValue)\(/,
      cs: /\.(?:GetAsync|GetStringAsync|GetByteArrayAsync|GetStreamAsync|PostAsync|SendAsync)\(\s*Request\.Query\[/,
      php: /\b(?:file_get_contents|curl_init|fopen|get_headers)\(\s*\$_(?:GET|POST|REQUEST)\[/,
    },
    bad: [
      ['src/a.js', 'const r = await axios.get(req.query.url);'],
      ['src/a.py', 'r = requests.get(request.args["url"], timeout=5)'],
      ['src/A.java', 'String body = rest.getForObject(request.getParameter("url"), String.class);'],
      ['src/a.go', 'resp, err := http.Get(r.URL.Query().Get("url"))'],
      ['src/A.cs', 'var s = await http.GetStringAsync(Request.Query["url"]);'],
      ['src/a.php', '$x = file_get_contents($_GET["url"]);'],
    ],
    good: [
      ['src/a.js', 'const r = await axios.get(WEBHOOKS[req.query.id]);'],
      ['src/a.py', 'r = requests.get(ALLOWED[request.args["id"]], timeout=5)'],
      ['src/A.java', 'String body = rest.getForObject(partnerUrl(id), String.class);'],
      ['src/a.go', 'resp, err := http.Get(allowed[r.URL.Query().Get("id")])'],
      ['src/A.cs', 'var s = await http.GetStringAsync(partners[id]);'],
      ['src/a.php', '$x = file_get_contents(PARTNERS[$id]);'],
    ],
  },
  {
    id: 'request/path-traversal', baseline: 'SECURITY-05', owasp: 'A01:2025',
    title: 'A file path is taken straight from the request (path traversal)',
    fix: 'Map the request value to a known file (ID -> path) or normalise it and verify the resolved path stays inside the intended base directory.',
    re: {
      js: /\b(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync|unlink|unlinkSync|sendFile|download|res\.attachment)\(\s*(?:path\.(?:join|resolve)\([^)]*)?req\.(?:query|params|body)\.\w+/,
      py: /\b(?:open|send_file|FileResponse|os\.remove|os\.unlink|shutil\.\w+)\(\s*(?:os\.path\.join\([^)]*)?request\.(?:args|form|values|GET|POST|query_params)\b/,
      jvm: /\bnew\s+File(?:InputStream|Reader|OutputStream)?\(\s*(?:[^,()]+,\s*)?request\.getParameter\(|\bPaths\.get\(\s*(?:[^,()]+,\s*)?request\.getParameter\(/,
      go: /\bos\.(?:Open|ReadFile|Create|Remove|OpenFile)\(\s*(?:filepath\.Join\([^)]*)?r\.(?:URL\.Query\(\)\.Get|FormValue)\(/,
      cs: /\b(?:File\.(?:ReadAllText|ReadAllBytes|OpenRead|Open|Delete|WriteAllText)|PhysicalFile)\(\s*(?:Path\.Combine\([^)]*)?Request\.Query\[/,
      php: /\b(?:include|require|include_once|require_once|file_get_contents|fopen|readfile|unlink)\s*\(?\s*[^;]*\$_(?:GET|POST|REQUEST|COOKIE)\[/,
    },
    bad: [
      ['src/a.js', 'res.sendFile(path.join(__dirname, "files", req.params.name));'],
      ['src/a.py', 'return send_file(os.path.join(BASE, request.args["f"]))'],
      ['src/A.java', 'File f = new File(base, request.getParameter("file"));'],
      ['src/a.go', 'data, err := os.ReadFile(filepath.Join(base, r.URL.Query().Get("f")))'],
      ['src/A.cs', 'var t = File.ReadAllText(Path.Combine(root, Request.Query["f"]));'],
      ['src/a.php', 'include $_GET["page"] . ".php";'],
    ],
    good: [
      ['src/a.js', 'res.sendFile(safeFile(req.params.name), { root: FILES });'],
      ['src/a.py', 'return send_from_directory(BASE, request.args["f"])'],
      ['src/A.java', 'File f = storage.resolveInside(base, name);'],
      ['src/a.go', 'data, err := os.ReadFile(files[id])'],
      ['src/A.cs', 'var t = File.ReadAllText(SafeResolve(root, name));'],
      ['src/a.php', 'include PAGES[$page];'],
    ],
  },

  // SECURITY-06: least-privilege IAM
  {
    id: 'iam/wildcard-action', baseline: 'SECURITY-06',
    title: 'An allow policy grants every action ("*" or "<service>:*")',
    fix: 'List the specific actions the service calls; keep read and write in separate statements.',
    re: { tf: /["']?\bAction["']?\s*[:=]\s*\[?\s*["'](?:\*|[\w-]+:\*)["']|\bactions\s*=\s*\[[^\]]*"(?:\*|[\w-]+:\*)"/, json: /"Action"\s*:\s*\[?\s*"(?:\*|[\w-]+:\*)"/, yaml: /\bAction\s*:\s*(?:\[\s*)?['"]?(?:\*|[\w-]+:\*)['"]?\s*(?:[\],]|$)|^\s*-\s*['"]?[\w-]+:\*['"]?\s*$/ },
    unlessNear: { re: /\beffect\W+deny\b/i, lines: 10 },
    bad: [['infra/iam.tf', 'data "aws_iam_policy_document" "app" {\n  statement {\n    actions   = ["s3:*"]\n    resources = [aws_s3_bucket.app.arn]\n  }\n}'], ['infra/policy.json', '{ "Effect": "Allow",\n  "Action": "*",\n  "Resource": "arn:aws:s3:::b/*" }'], ['infra/stack.yaml', '            Effect: Allow\n            Action: "dynamodb:*"']],
    good: [['infra/iam.tf', 'data "aws_iam_policy_document" "app" {\n  statement {\n    actions   = ["s3:GetObject"]\n    resources = ["${aws_s3_bucket.app.arn}/*"]\n  }\n}'], ['infra/policy.json', '{ "Effect": "Deny",\n  "Principal": "*",\n  "Action": "s3:*",\n  "Condition": { "Bool": { "aws:SecureTransport": "false" } } }'], ['infra/stack.yaml', '            Effect: Allow\n            Action: dynamodb:GetItem']],
  },
  {
    id: 'iam/wildcard-resource', baseline: 'SECURITY-06',
    title: 'An allow policy applies to every resource ("*")',
    fix: 'Scope it to the specific ARNs; where the API has no resource-level permissions, the design records that as a Security Decision.',
    re: { tf: /["']?\bResource["']?\s*[:=]\s*\[?\s*["']\*["']|\bresources\s*=\s*\[\s*"\*"\s*\]/, json: /"Resource"\s*:\s*\[?\s*"\*"/, yaml: /\bResource\s*:\s*(?:\[\s*)?['"]?\*['"]?\s*(?:[\],]|$)/ },
    unlessNear: { re: /\beffect\W+deny\b/i, lines: 10 },
    bad: [['infra/iam.tf', '  statement {\n    actions   = ["sqs:SendMessage"]\n    resources = ["*"]\n  }'], ['infra/policy.json', '{ "Effect": "Allow", "Action": "sqs:SendMessage",\n  "Resource": "*" }'], ['infra/stack.yaml', '            Effect: Allow\n            Resource: "*"']],
    good: [['infra/iam.tf', '  statement {\n    actions   = ["sqs:SendMessage"]\n    resources = [aws_sqs_queue.jobs.arn]\n  }'], ['infra/policy.json', '{ "Effect": "Allow", "Action": "sqs:SendMessage",\n  "Resource": "arn:aws:sqs:eu-west-1:123456789012:jobs" }'], ['infra/stack.yaml', '            Effect: Allow\n            Resource: !GetAtt Jobs.Arn']],
  },
  {
    id: 'iam/wildcard-principal', baseline: 'SECURITY-06',
    title: 'An allow policy or trust policy admits any principal ("*")',
    fix: 'Name the specific account, role or service principal; scope the trust policy with conditions.',
    re: { tf: /\bidentifiers\s*=\s*\[\s*"\*"\s*\]|["']?\bPrincipal["']?\s*[:=]\s*["']\*["']|["']?AWS["']?\s*[:=]\s*["']\*["']/, json: /"Principal"\s*:\s*"\*"|"AWS"\s*:\s*\[?\s*"\*"/, yaml: /\bPrincipal\s*:\s*['"]?\*['"]?\s*$|^\s*AWS\s*:\s*['"]?\*['"]?\s*$/ },
    unlessNear: { re: /\beffect\W+deny\b/i, lines: 10 },
    bad: [
      ['infra/policy.json', '{ "Effect": "Allow",\n  "Principal": "*",\n  "Action": "s3:GetObject" }'],
      ['infra/trust.tf', '    principals {\n      type        = "AWS"\n      identifiers = ["*"]\n    }'],
      ['infra/stack.yaml', '          - Effect: Allow\n            Principal: "*"'],
    ],
    good: [
      ['infra/policy.json', '{ "Effect": "Allow",\n  "Principal": { "Service": "cloudfront.amazonaws.com" },\n  "Action": "s3:GetObject" }'],
      ['infra/trust.tf', '    principals {\n      type        = "Service"\n      identifiers = ["ecs-tasks.amazonaws.com"]\n    }'],
      ['infra/stack.yaml', '          - Effect: Deny\n            Principal: "*"\n            Condition:\n              Bool: { aws:SecureTransport: false }'],
    ],
  },
  {
    id: 'iam/broad-role', baseline: 'SECURITY-06',
    title: 'A primitive or cluster-wide role grants everything',
    fix: 'Grant a predefined or custom role with only the permissions used; in Kubernetes list the exact verbs, resources and API groups.',
    re: { tf: /\brole\s*=\s*"roles\/(?:owner|editor)"|\brole_definition_name\s*=\s*"(?:Owner|Contributor)"/, yaml: /^\s*-?\s*(?:verbs|resources|apiGroups)\s*:\s*\[\s*['"]\*['"]|^\s*name\s*:\s*cluster-admin\s*$/ },
    bad: [['infra/iam.tf', '  role   = "roles/editor"'], ['k8s/rbac.yaml', '    verbs: ["*"]']],
    good: [['infra/iam.tf', '  role   = "roles/storage.objectViewer"'], ['k8s/rbac.yaml', '    verbs: ["get", "list"]']],
  },

  // SECURITY-07: network exposure
  {
    id: 'iac/open-ingress', baseline: 'SECURITY-07',
    title: 'Inbound traffic from anywhere (0.0.0.0/0) is allowed on a port other than 80/443',
    fix: 'Restrict the source to specific CIDR blocks or security-group references; only a public load balancer may take 0.0.0.0/0, on 80/443.',
    check(text, lines, lang) { return lang === 'tf' ? terraformOpenNetwork(text, 'ingress') : cfnOpenNetwork(lines, 'ingress'); },
    langs: ['tf', 'yaml', 'json'],
    bad: [
      ['infra/sg.tf', 'resource "aws_security_group" "db" {\n  ingress {\n    from_port   = 5432\n    to_port     = 5432\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}'],
      ['infra/fw.tf', 'resource "google_compute_firewall" "ssh" {\n  source_ranges = ["0.0.0.0/0"]\n  allow {\n    protocol = "tcp"\n    ports    = ["22"]\n  }\n}'],
      ['infra/stack.yaml', '      SecurityGroupIngress:\n        - IpProtocol: tcp\n          FromPort: 22\n          ToPort: 22\n          CidrIp: 0.0.0.0/0'],
    ],
    good: [
      ['infra/sg.tf', 'resource "aws_security_group" "lb" {\n  ingress {\n    from_port   = 443\n    to_port     = 443\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n  ingress {\n    from_port       = 5432\n    to_port         = 5432\n    protocol        = "tcp"\n    security_groups = [aws_security_group.app.id]\n  }\n}'],
      ['infra/fw.tf', 'resource "google_compute_firewall" "web" {\n  source_ranges = ["0.0.0.0/0"]\n  allow {\n    protocol = "tcp"\n    ports    = ["443"]\n  }\n}'],
      ['infra/stack.yaml', '      SecurityGroupIngress:\n        - IpProtocol: tcp\n          FromPort: 443\n          ToPort: 443\n          CidrIp: 0.0.0.0/0'],
    ],
  },
  {
    id: 'iac/open-egress', baseline: 'SECURITY-07',
    title: 'Outbound traffic to anywhere is allowed on every port',
    fix: 'Allow only the destinations and ports the workload needs (e.g. 443 to the NAT/VPC endpoints); an all-egress rule the design justifies is a Security Decision in architecture.md.',
    check(text, lines, lang) { return lang === 'tf' ? terraformOpenNetwork(text, 'egress') : cfnOpenNetwork(lines, 'egress'); },
    langs: ['tf', 'yaml', 'json'],
    bad: [['infra/sg.tf', 'resource "aws_security_group" "app" {\n  egress {\n    from_port   = 0\n    to_port     = 0\n    protocol    = "-1"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}']],
    good: [['infra/sg.tf', 'resource "aws_security_group" "app" {\n  egress {\n    from_port   = 443\n    to_port     = 443\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}']],
  },

  // SECURITY-08: access control
  {
    id: 'access/cors-any-origin', baseline: 'SECURITY-08',
    title: 'CORS allows any origin',
    fix: 'List the allowed origins explicitly; reflecting or wildcarding the Origin is never allowed on authenticated endpoints (a public, cookie-less API the design calls for is a Security Decision in architecture.md).',
    re: {
      js: /Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]|(?<![\w.])cors\(\s*\)|\borigin\s*:\s*(?:['"]\*['"]|true)\b/,
      py: /\bCORS\(\s*\w+\s*\)|\bCORS\([^)]*\b(?:origins|resources)\s*=\s*['"]\*['"]|\bCORS_(?:ALLOW_ALL_ORIGINS|ORIGIN_ALLOW_ALL)\s*=\s*True\b|\ballow_origins\s*=\s*\[\s*['"]\*['"]\s*\]|['"]Access-Control-Allow-Origin['"]\s*\]?\s*[:=]\s*['"]\*['"]/,
      jvm: /@CrossOrigin\s*(?:\(\s*\))?\s*$|@CrossOrigin\s*\([^)]*\borigins\s*=\s*\{?\s*"\*"|\ballowedOrigins\(\s*"\*"\s*\)|\bsetAllowedOrigins\(\s*(?:List|Arrays|Collections)\.\w+\(\s*"\*"\s*\)\)|\baddAllowedOrigin\(\s*"\*"\s*\)|\ballowedOriginPatterns\(\s*"\*"\s*\)|\bsetAllowedOriginPatterns\([^)]*"\*"/,
      go: /\bAllowAllOrigins\s*:\s*true|\bAllow(?:ed)?Origins\s*:\s*\[\]string\{\s*"\*"|"Access-Control-Allow-Origin"\s*,\s*"\*"/,
      cs: /\.AllowAnyOrigin\s*\(\s*\)|\bSetIsOriginAllowed\(\s*_?\w*\s*=>\s*true\s*\)|\bWithOrigins\(\s*"\*"\s*\)/,
      php: /header\(\s*['"]Access-Control-Allow-Origin:\s*\*['"]/,
      rb: /\borigins\s+['"]\*['"]/,
      config: /\bAccess-Control-Allow-Origin\s+['"]?\*|\ballowed-origins\s*[:=]\s*['"]?\*/i,
      yaml: /\ballowed-origins\s*:\s*['"]?\*|\bAccess-Control-Allow-Origin\s*:\s*['"]?\*/,
    },
    bad: [
      ['src/app.js', 'app.use(cors());'],
      ['src/app.py', 'app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True)'],
      ['src/Web.java', '@CrossOrigin(origins = "*")'],
      ['src/main.go', 'r.Use(cors.New(cors.Config{AllowAllOrigins: true}))'],
      ['src/Program.cs', 'p.AllowAnyOrigin().AllowAnyHeader();'],
      ['src/a.php', 'header("Access-Control-Allow-Origin: *");'],
      ['src/cors.rb', "    origins '*'"],
      ['deploy/nginx.conf', '    add_header Access-Control-Allow-Origin *;'],
      ['src/main/resources/application.yml', '        allowed-origins: "*"'],
    ],
    good: [
      ['src/app.js', 'app.use(cors({ origin: ["https://app.example.com"], credentials: true }));'],
      ['src/app.py', 'app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins)'],
      ['src/Web.java', '@CrossOrigin(origins = "https://app.example.com")'],
      ['src/main.go', 'r.Use(cors.New(cors.Config{AllowOrigins: []string{"https://app.example.com"}}))'],
      ['src/Program.cs', 'p.WithOrigins("https://app.example.com").AllowAnyHeader();'],
      ['src/a.php', 'header("Access-Control-Allow-Origin: https://app.example.com");'],
      ['src/cors.rb', "    origins 'https://app.example.com'"],
      ['deploy/nginx.conf', '    add_header Access-Control-Allow-Origin https://app.example.com;'],
    ],
  },
  {
    id: 'access/jwt-not-verified', baseline: 'SECURITY-08', owasp: 'A07:2025',
    title: "A JWT is accepted without full verification (alg 'none', no signature, no expiry, no issuer/audience)",
    fix: 'Verify signature with a pinned algorithm list, and validate exp, iss and aud on every request.',
    re: {
      js: /\balgorithms\s*:\s*\[[^\]]*['"]none['"]|\balgorithm\s*:\s*['"]none['"]|\bignoreExpiration\s*:\s*true/i,
      py: /\balgorithms\s*=\s*\[[^\]]*['"]none['"]|['"]verify_(?:signature|exp|aud|iss)['"]\s*:\s*False|\bjwt\.decode\([^)]*\bverify\s*=\s*False/i,
      jvm: /\.parseUnsecuredClaims\s*\(|\.parseClaimsJwt\s*\(|\bSignatureAlgorithm\.NONE\b|\bAlgorithm\.none\s*\(/,
      go: /\bjwt\.UnsafeAllowNoneSignatureType\b|\bSigningMethodNone\b|\.ParseUnverified\s*\(/,
      cs: /\b(?:ValidateIssuerSigningKey|ValidateLifetime|RequireSignedTokens|ValidateIssuer|ValidateAudience|RequireExpirationTime)\s*=\s*false\b/,
    },
    bad: [
      ['src/a.js', "jwt.verify(token, key, { algorithms: ['HS256', 'none'] });"],
      ['src/a.py', 'claims = jwt.decode(token, options={"verify_signature": False})'],
      ['src/A.java', 'Claims c = Jwts.parser().parseClaimsJwt(token).getBody();'],
      ['src/a.go', 'tok, _, err := parser.ParseUnverified(raw, claims)'],
      ['src/Program.cs', '        ValidateLifetime = false,'],
    ],
    good: [
      ['src/a.js', "jwt.verify(token, key, { algorithms: ['RS256'], issuer, audience });"],
      ['src/a.py', 'claims = jwt.decode(token, key, algorithms=["RS256"], audience=AUD, issuer=ISS)'],
      ['src/A.java', 'Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();'],
      ['src/a.go', 'tok, err := jwt.Parse(raw, keyFunc, jwt.WithValidMethods([]string{"RS256"}))'],
      ['src/Program.cs', '        ValidateLifetime = true,'],
    ],
  },
  {
    id: 'access/csrf-disabled', baseline: 'SECURITY-08',
    title: 'CSRF protection is switched off',
    fix: 'Keep CSRF protection on for cookie-authenticated state-changing requests; only a stateless bearer-token API may disable it (declare SessionCreationPolicy.STATELESS).',
    re: {
      jvm: /\.csrf\(\s*\)\s*\.disable\(\s*\)|\.csrf\(\s*(?:\w+\s*->\s*\w+\.disable\(\s*\)|AbstractHttpConfigurer::disable|CsrfConfigurer::disable)\s*\)/,
      py: /@csrf_exempt\b|\bWTF_CSRF_ENABLED\s*=\s*False\b|\bWTF_CSRF_CHECK_DEFAULT\s*=\s*False\b|\bcsrf\.exempt\b/,
      rb: /\bskip_before_action\s+:verify_authenticity_token\b|\bskip_forgery_protection\b/,
      cs: /\[IgnoreAntiforgeryToken\]/,
    },
    unlessFile: { jvm: /SessionCreationPolicy\.STATELESS/ },
    bad: [['src/Sec.java', 'http.csrf(csrf -> csrf.disable());'], ['src/views.py', '@csrf_exempt'], ['src/app_controller.rb', '  skip_before_action :verify_authenticity_token'], ['src/C.cs', '[IgnoreAntiforgeryToken]']],
    good: [['src/Sec.java', 'http.csrf(Customizer.withDefaults());'], ['src/views.py', '@require_POST'], ['src/app_controller.rb', '  protect_from_forgery with: :exception'], ['src/C.cs', '[ValidateAntiForgeryToken]']],
  },
  {
    id: 'access/open-redirect', baseline: 'SECURITY-08',
    title: 'A redirect goes to a destination taken straight from the request',
    fix: 'Redirect to a server-side mapping (ID -> URL) or validate the target against a trusted-domain allowlist (LocalRedirect / url_has_allowed_host_and_scheme).',
    re: {
      js: /\b(?:res|reply|ctx)\.redirect\(\s*(?:\d{3}\s*,\s*)?(?:req|ctx|request)\.(?:query|body|params|headers)\b/,
      py: /\bredirect\(\s*request\.(?:args|form|values|GET|POST|query_params)\b|\bHttpResponseRedirect\(\s*request\.(?:GET|POST)\b|\bRedirectResponse\(\s*(?:url\s*=\s*)?request\.query_params\b/,
      jvm: /\bsendRedirect\(\s*request\.getParameter\(|"redirect:"\s*\+\s*request\.getParameter\(/,
      cs: /(?<!Local)\bRedirect\(\s*(?:Request\.Query\[|returnUrl\s*\))/,
      php: /header\(\s*['"]Location:\s*['"]\s*\.\s*\$_(?:GET|POST|REQUEST)/,
      go: /\bhttp\.Redirect\([^,]+,\s*[^,]+,\s*r\.(?:URL\.Query\(\)\.Get|FormValue)\(/,
    },
    bad: [
      ['src/a.js', 'res.redirect(req.query.next);'],
      ['src/a.py', 'return redirect(request.args.get("next"))'],
      ['src/A.java', 'response.sendRedirect(request.getParameter("next"));'],
      ['src/C.cs', 'return Redirect(returnUrl);'],
      ['src/a.php', 'header("Location: " . $_GET["next"]);'],
      ['src/a.go', 'http.Redirect(w, r, r.URL.Query().Get("next"), http.StatusFound)'],
    ],
    good: [
      ['src/a.js', 'res.redirect(safeNext(req.query.next));'],
      ['src/a.py', 'return redirect(url_for("home"))'],
      ['src/A.java', 'response.sendRedirect(routes.get(target));'],
      ['src/C.cs', 'return LocalRedirect(returnUrl);'],
      ['src/a.php', 'header("Location: /home");'],
      ['src/a.go', 'http.Redirect(w, r, "/home", http.StatusFound)'],
    ],
  },
  {
    id: 'access/mass-assignment', baseline: 'SECURITY-08',
    title: 'A request body is bound wholesale to a model',
    fix: 'Copy only the allowed fields (a DTO, explicit field list, strong parameters) so clients cannot set role, isAdmin, ownerId and the like.',
    re: {
      js: /\bnew\s+[A-Z]\w*\(\s*req\.body\s*\)|\.(?:create|insert|insertMany|update|updateOne|findByIdAndUpdate|findOneAndUpdate|upsert|build|save|merge|assign)\(\s*(?:[^,()]+,\s*)?req\.body\s*[,)]|\bObject\.assign\(\s*[\w.]+\s*,\s*req\.body\s*\)|\{\s*\.\.\.req\.body\s*[,}]/,
      py: /\bfields\s*=\s*['"]__all__['"]|\*\*request\.(?:data|json|form|POST|get_json\(\))/,
      rb: /\bparams\.permit!|\.(?:new|create|create!|update|update!|update_attributes|assign_attributes)\(\s*params\[:?\w+\]\s*\)/,
      php: /\$guarded\s*=\s*\[\s*\]|::create\(\s*\$request->all\(\)\s*\)|->(?:fill|update)\(\s*\$request->all\(\)\s*\)/,
    },
    bad: [['src/a.js', 'const user = await User.create(req.body);'], ['src/serializers.py', '        fields = "__all__"'], ['src/users_controller.rb', '    @user.update(params[:user])'], ['src/User.php', '    protected $guarded = [];']],
    good: [['src/a.js', 'const user = await User.create({ name: body.name, email: body.email });'], ['src/serializers.py', '        fields = ["id", "name", "email"]'], ['src/users_controller.rb', '    @user.update(params.require(:user).permit(:name, :email))'], ['src/User.php', "    protected $fillable = ['name', 'email'];"]],
  },

  // SECURITY-09: hardening and misconfiguration
  {
    id: 'config/debug-mode', baseline: 'SECURITY-09',
    title: 'Debug mode, developer error pages or detailed error output is switched on',
    fix: 'Turn it off for deployed code; enable it only from a development-only settings file or environment check.',
    re: {
      py: /^\s*DEBUG\s*=\s*True\b|\.run\([^)]*\bdebug\s*=\s*True\b|\bDEBUG_PROPAGATE_EXCEPTIONS\s*=\s*True\b/,
      cs: /\bUseDeveloperExceptionPage\s*\(\s*\)/,
      config: /\bserver\.error\.include-(?:stacktrace|exception|message)\s*[:=]\s*(?:always|true)\b|\bmanagement\.endpoints\.web\.exposure\.include\s*[:=]\s*\*|\bspring\.h2\.console\.enabled\s*[:=]\s*true\b|<customErrors\s+mode="Off"|<compilation\b[^>]*\bdebug="true"|^\s*display_errors\s*=\s*(?:On|1)\b/i,
      yaml: /\binclude-(?:stacktrace|exception)\s*:\s*['"]?(?:always|true)\b/,
      go: /\bgin\.SetMode\(\s*gin\.DebugMode\s*\)/,
      php: /\bini_set\(\s*['"]display_errors['"]\s*,\s*['"]?(?:1|On|true)/i,
    },
    path: /^(?!.*(?:^|[/_.-])(?:dev|development|local|test|tests|testing)(?:[/_.-]|$))/i,
    unlessFile: { cs: /IsDevelopment\s*\(\s*\)/ },
    bad: [
      ['src/app/settings.py', 'DEBUG = True'],
      ['src/Program.cs', 'app.UseDeveloperExceptionPage();'],
      ['src/main/resources/application.properties', 'server.error.include-stacktrace=always'],
      ['src/main/resources/application.yml', '    include-stacktrace: always'],
      ['src/main.go', 'gin.SetMode(gin.DebugMode)'],
      ['src/bootstrap.php', "ini_set('display_errors', '1');"],
    ],
    good: [['src/app/settings.py', 'DEBUG = env.bool("DEBUG", default=False)'], ['src/Program.cs', 'if (app.Environment.IsDevelopment()) app.UseDeveloperExceptionPage();'], ['src/main/resources/application.properties', 'server.error.include-stacktrace=never'], ['src/main.go', 'gin.SetMode(gin.ReleaseMode)'], ['src/app/settings/dev.py', 'DEBUG = True']],
  },
  {
    id: 'config/stack-trace-to-client', baseline: 'SECURITY-15', owasp: 'A10:2025',
    title: 'An exception\'s stack trace is sent to the client',
    fix: 'Log the exception server-side and return a generic message with a correlation ID.',
    re: {
      js: /\b(?:res|reply|ctx)\.(?:send|json|write|end|status\(\s*\d+\s*\)\.(?:send|json))\([^)]*\.stack\b|\bctx\.body\s*=\s*[^;]*\.stack\b/,
      py: /\breturn\b[^\n]*\btraceback\.format_exc\s*\(|\bjsonify\([^)]*\btraceback\b/,
      jvm: /\.printStackTrace\(\s*response\.getWriter\(\)\s*\)|\bExceptionUtils\.getStackTrace\([^)]*\)[^;]*ResponseEntity|ResponseEntity[^;]*\bgetStackTrace\(/,
      cs: /\b(?:Content|Ok|BadRequest|StatusCode|Problem|Json)\([^)]*\.StackTrace\b/,
      go: /\bw\.Write\(\s*debug\.Stack\(\)\s*\)|\bc\.(?:JSON|String)\([^)]*debug\.Stack\(\)/,
    },
    bad: [['src/a.js', '  res.status(500).json({ error: err.message, stack: err.stack });'], ['src/a.py', '    return {"error": traceback.format_exc()}, 500'], ['src/C.cs', '    return Problem(ex.StackTrace);'], ['src/a.go', '    w.Write(debug.Stack())'], ['src/A.java', '    e.printStackTrace(response.getWriter());']],
    good: [['src/a.js', '  res.status(500).json({ error: "Internal error", requestId });'], ['src/a.py', '    return {"error": "internal error", "requestId": rid}, 500'], ['src/C.cs', '    return Problem("Internal error");'], ['src/a.go', '    http.Error(w, "internal error", 500)'], ['src/A.java', '    log.error("failed", e);']],
  },
  {
    id: 'config/directory-listing', baseline: 'SECURITY-09',
    title: 'Directory listing is enabled',
    fix: 'Turn directory listing off; serve only explicit routes or files.',
    re: /\bautoindex\s+on\b|^\s*Options\s+(?:[^#\n]*\s)?\+?Indexes\b|\bserveIndex\s*\(|\bdirectoryBrowse\s+enabled="true"|\.UseDirectoryBrowser\s*\(|\.AddDirectoryBrowser\s*\(|\bshow_indexes\s*=\s*True\b/,
    langs: ['config', 'js', 'cs', 'py'],
    bad: [['deploy/nginx.conf', '        autoindex on;'], ['src/app.js', "app.use('/files', serveIndex('public/files'));"]],
    good: [['deploy/nginx.conf', '        autoindex off;'], ['deploy/site.conf', '    Options -Indexes +FollowSymLinks']],
  },
  {
    id: 'iac/public-storage', baseline: 'SECURITY-09',
    title: 'Cloud object storage is made public',
    fix: 'Keep public access blocked (all four S3 Block Public Access settings true, no public ACLs or allUsers bindings); serve public content through a CDN with origin access control.',
    re: {
      tf: /\bacl\s*=\s*"(?:public-read|public-read-write|authenticated-read)"|\b(?:block_public_acls|block_public_policy|ignore_public_acls|restrict_public_buckets)\s*=\s*false\b|\b(?:allow_nested_items_to_be_public|allow_blob_public_access)\s*=\s*true\b|"allUsers"|"allAuthenticatedUsers"|\bcontainer_access_type\s*=\s*"(?:blob|container)"/,
      yaml: /\bAccessControl\s*:\s*['"]?(?:PublicRead|PublicReadWrite|AuthenticatedRead)\b|\b(?:BlockPublicAcls|BlockPublicPolicy|IgnorePublicAcls|RestrictPublicBuckets)\s*:\s*['"]?false\b/,
      json: /"AccessControl"\s*:\s*"(?:PublicRead|PublicReadWrite|AuthenticatedRead)"|"(?:BlockPublicAcls|BlockPublicPolicy|IgnorePublicAcls|RestrictPublicBuckets)"\s*:\s*['"]?false\b/,
    },
    bad: [['infra/s3.tf', '  block_public_policy = false'], ['infra/stack.yaml', '      AccessControl: PublicRead'], ['infra/stack.json', '        "BlockPublicAcls": false,']],
    good: [['infra/s3.tf', '  block_public_policy = true'], ['infra/stack.yaml', '      AccessControl: Private'], ['infra/stack.json', '        "BlockPublicAcls": true,']],
  },
  {
    id: 'container/unpinned-image', baseline: 'SECURITY-10',
    title: 'A container image is unpinned (no tag, or :latest)',
    fix: 'Pin a specific version tag, ideally with its digest (image:1.2.3@sha256:...).',
    check(text, lines, lang) {
      const out = [];
      if (lang === 'docker') {
        const stages = new Set();
        lines.forEach((l, i) => {
          const m = /^\s*FROM\s+((?:--\S+\s+)*)(\S+)(?:\s+AS\s+(\S+))?/i.exec(l);
          if (!m) return;
          const ref = m[2];
          if (!/^scratch$/i.test(ref) && !stages.has(ref.toLowerCase()) && !pinnedImage(ref)) out.push({ line: i + 1, detail: ref });
          if (m[3]) stages.add(m[3].toLowerCase());
        });
      } else {
        lines.forEach((l, i) => {
          const m = /^\s*-?\s*(?:image|container)\s*:\s*['"]?([^\s'"#{}!]+)['"]?\s*(?:#.*)?$/i.exec(l);
          if (m && /^[\w.-]/.test(m[1]) && !/\s/.test(m[1]) && !pinnedImage(m[1])) out.push({ line: i + 1, detail: m[1] });
          const u = /^\s*-?\s*uses\s*:\s*['"]?docker:\/\/([^\s'"#]+)/.exec(l);
          if (u && !pinnedImage(u[1])) out.push({ line: i + 1, detail: u[1] });
        });
      }
      return out;
    },
    langs: ['docker', 'yaml'],
    bad: [['Dockerfile', 'FROM node\nRUN npm ci'], ['Dockerfile', 'FROM python:latest AS base'], ['docker-compose.yml', 'services:\n  db:\n    image: postgres'], ['.github/workflows/ci.yml', '    container: node:latest']],
    good: [['Dockerfile', 'FROM node:22.11.0-alpine AS build\nFROM build AS test\nFROM gcr.io/distroless/nodejs22-debian12@sha256:0123abcd\nFROM scratch\nUSER 65532'], ['docker-compose.yml', 'services:\n  db:\n    image: postgres:16.4'], ['k8s/app.yaml', '        image: ${REGISTRY}/app:${TAG}']],
  },
  {
    id: 'container/runs-as-root', baseline: 'SECURITY-09',
    title: 'The container runs as root (no USER in the final stage, or USER root/0)',
    fix: 'Create an unprivileged user and switch to it in the final stage (USER 10001 or USER app).',
    check(text, lines, lang) {
      if (lang !== 'docker') return [];
      let lastFrom = -1;
      lines.forEach((l, i) => { if (/^\s*FROM\s/i.test(l)) lastFrom = i; });
      if (lastFrom === -1) return [];
      let user = null; let userLine = -1;
      for (let i = lastFrom; i < lines.length; i++) { const m = /^\s*USER\s+(\S+)/i.exec(lines[i]); if (m) { user = m[1]; userLine = i; } }
      let last = lines.length - 1;
      while (last > lastFrom && !lines[last].trim()) last--;
      if (user === null) return [{ line: lastFrom + 1, end: last + 1, detail: 'no USER in the final stage' }];
      if (/^(?:root|0)(?::(?:root|0))?$/i.test(user)) return [{ line: userLine + 1, detail: `USER ${user}` }];
      return [];
    },
    langs: ['docker'],
    bad: [['Dockerfile', 'FROM node:22.11.0-alpine\nCOPY . .\nCMD ["node", "server.js"]'], ['Dockerfile', 'FROM python:3.12.7-slim\nUSER app\nUSER root\nCMD ["python", "app.py"]']],
    good: [['Dockerfile', 'FROM node:22.11.0-alpine AS build\nRUN npm ci\nFROM node:22.11.0-alpine\nCOPY --from=build /app /app\nUSER node\nCMD ["node", "server.js"]']],
  },
  {
    id: 'container/privileged', baseline: 'SECURITY-09',
    title: 'A container is privileged, runs as root, can escalate, shares the host namespaces or mounts the runtime socket',
    fix: 'Run unprivileged: runAsNonRoot: true, allowPrivilegeEscalation: false, capabilities drop [ALL] (add back only what is needed), readOnlyRootFilesystem, no host namespaces, never mount docker.sock.',
    re: /\bprivileged\s*[:=]\s*true\b|--privileged\b|\/var\/run\/docker\.sock|\ballowPrivilegeEscalation\s*:\s*true\b|\brunAsNonRoot\s*:\s*false\b|\brunAsUser\s*:\s*0\b|\bhost(?:PID|IPC|Network)\s*:\s*true\b|\bSYS_ADMIN\b|\bcap_add\s*:\s*\[?\s*['"]?ALL\b|--cap-add[= ](?:ALL|SYS_ADMIN)\b|^\s*user\s*:\s*['"]?(?:root|0)(?::0)?['"]?\s*$|"Privileged"\s*:\s*true/,
    langs: ['yaml', 'json', 'shell', 'ps', 'docker', 'tf'],
    bad: [['k8s/deploy.yaml', '          privileged: true'], ['docker-compose.yml', '      - /var/run/docker.sock:/var/run/docker.sock'], ['scripts/run.sh', 'docker run --privileged app:1.0.0'], ['k8s/deploy.yaml', '          runAsUser: 0']],
    good: [['k8s/deploy.yaml', '          privileged: false\n          allowPrivilegeEscalation: false\n          runAsNonRoot: true'], ['scripts/run.sh', 'docker run --read-only --cap-drop ALL app:1.0.0']],
  },

  // SECURITY-10: supply chain
  {
    id: 'supply/unpinned-ci-action', baseline: 'SECURITY-10',
    title: 'A CI action is not pinned to a version (branch ref or none)',
    fix: 'Pin the action to a release tag, or better a full commit SHA (uses: owner/action@<40-char sha> # vX.Y.Z).',
    path: /(?:^|\/)\.github\/(?:workflows|actions)\//,
    re: /^\s*-?\s*uses\s*:\s*['"]?((?!\.\/|docker:\/\/)[\w.-]+\/[\w./-]+?)(?:@([^\s'"#]+))?['"]?\s*(?:#.*)?$/,
    when: (m) => !m[2] || /^(?:main|master|latest|HEAD|dev|develop|trunk)$/i.test(m[2]),
    langs: ['yaml'],
    bad: [['.github/workflows/ci.yml', '      - uses: actions/checkout@main'], ['.github/workflows/ci.yml', '      - uses: someorg/deploy-action']],
    good: [['.github/workflows/ci.yml', '      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2\n      - uses: actions/setup-node@v4\n      - uses: ./.github/actions/build']],
  },
  {
    id: 'supply/unpinned-package-install', baseline: 'SECURITY-10',
    title: 'A build or CI step installs packages without pinned versions',
    fix: 'Install from the lock file (npm ci, pip install -r requirements.txt with == pins or --require-hashes) or pin each package (pkg==1.2.3, pkg@1.2.3).',
    // Matched on the line with string contents blanked, so "pip install" inside a message is ignored.
    code: true,
    re: /\b(?:pip3?|python3?\s+-m\s+pip)\s+install\b([^\n&|;{}()>#]*)|\b(?:npm|pnpm|yarn)\s+(?:i|install|add)\b[^\n&|;]*@latest\b|\bnpm\s+(?:i|install)\s+(?:-g|--global)\s+([^\n&|;{}()>#]*)|\bnpx\s+(?:-y\s+|--yes\s+)?[\w@][\w./-]*@latest\b|\bgo\s+install\s+\S+@latest\b/,
    when: (m) => {
      if (m[1] !== undefined) {
        const toks = m[1].trim().split(/\s+/).filter(Boolean);
        const pkgs = [];
        for (let i = 0; i < toks.length; i++) {
          const t = toks[i];
          if (/^-(?:r|c|e|t|i)$|^--(?:requirement|constraint|editable|target|index-url|extra-index-url|prefix|root|find-links|trusted-host|cache-dir|src|platform|python-version)$/.test(t)) { i++; continue; }
          if (t.startsWith('-') || /^[./~$]|[/\\]|\.(?:whl|tar\.gz|zip)$/.test(t)) continue;
          if (/^[A-Za-z0-9][\w.-]*(?:\[[^\]]*\])?(?:[=<>!~@].*)?$/.test(t)) pkgs.push(t);
        }
        return pkgs.some((p) => !/===?|@\s*\S/.test(p));
      }
      if (m[2] !== undefined) {
        const pkgs = m[2].trim().split(/\s+/).filter((t) => /^@?[A-Za-z0-9]/.test(t));
        return pkgs.some((p) => !/^@?[^@]+@(?:\d|\$)/.test(p));
      }
      return true;
    },
    langs: ['docker', 'shell', 'ps', 'yaml'],
    bad: [['Dockerfile', 'RUN pip install flask gunicorn'], ['scripts/setup.sh', 'npm install -g typescript'], ['.github/workflows/ci.yml', '        run: npx -y create-thing@latest'], ['Dockerfile', 'RUN pip install --upgrade pip']],
    good: [
      ['Dockerfile', 'RUN pip install --no-cache-dir -r requirements.txt\nRUN pip install flask==3.0.3 gunicorn==23.0.0\nRUN pip install -e .'],
      ['scripts/setup.sh', 'npm install -g typescript@5.6.3\nnpm ci'],
      ['.github/workflows/ci.yml', '        run: npx playwright test\n        run: npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}'],
      ['scripts/validate.sh', 'instep && /pip install/ { has_pip=1 }\ncheck_fail "a step runs pip install but never runs pip check"'],
    ],
  },
  {
    id: 'supply/insecure-registry', baseline: 'SECURITY-10',
    title: 'Packages are pulled from a registry over plain HTTP',
    fix: 'Use the registry over HTTPS.',
    re: /\bregistry\s*[=:]\s*['"]?http:\/\/|--(?:extra-)?index-url[= ]+http:\/\/|\b(?:extra-)?index-url\s*=\s*http:\/\/|^\s*source\s+['"]http:\/\/|<add\s+key="[^"]*"\s+value="http:\/\//,
    langs: ['config', 'docker', 'shell', 'ps', 'yaml', 'rb'],
    bad: [['.npmrc', 'registry=http://npm.internal/'], ['Dockerfile', 'RUN pip install --index-url http://pypi.internal/simple -r requirements.txt']],
    good: [['.npmrc', 'registry=https://npm.internal/'], ['Dockerfile', 'RUN pip install --index-url https://pypi.internal/simple -r requirements.txt']],
  },

  // SECURITY-12: authentication and sessions
  {
    id: 'auth/plain-password-hash', baseline: 'SECURITY-12', code: true,
    title: 'A password is hashed with a fast, non-adaptive hash',
    fix: 'Hash passwords with Argon2id, scrypt or bcrypt (or PBKDF2 with a high iteration count) and a per-user salt.',
    re: /\b(?:createHash|hashlib\.\w+|MessageDigest\.getInstance|DigestUtils\.\w+|Hashing\.\w+|SHA(?:1|256|384|512)\.(?:Create|HashData)|sha(?:1|256|512)\.Sum(?:256|512)?|md5\.Sum)\s*\(|(?<![.\w>$])hash\(\s*['"]/,
    also: /(?:\bpass(?:word|wd)?\b|\bpwd\b|[a-z_]Password\b|_password\b|Passwd\b|_passwd\b)/,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php'],
    bad: [['src/a.js', "const hash = crypto.createHash('sha256').update(password).digest('hex');"], ['src/a.py', 'user.pw_hash = hashlib.sha256(password.encode()).hexdigest()'], ['src/a.go', 'sum := sha256.Sum256([]byte(password))']],
    good: [['src/a.js', 'const hash = await argon2.hash(password);'], ['src/a.py', 'user.pw_hash = ph.hash(password)'], ['src/a.go', "tokenHash := sha256.Sum256([]byte(resetToken)) // passwordReset uses a token, not a password"]],
  },
  {
    id: 'auth/low-work-factor', baseline: 'SECURITY-12',
    title: 'Password hashing uses too low a work factor',
    fix: 'bcrypt cost >= 10; PBKDF2-HMAC-SHA256 >= 600,000 iterations (SHA-512: 210,000; SHA-1: 1,300,000) per the OWASP Password Storage Cheat Sheet; or switch to Argon2id.',
    re: /\bgenSalt(?:Sync)?\(\s*(\d+)\s*\)|\bbcrypt\.hash(?:Sync)?\([^,]+,\s*(\d+)\s*\)|\bgensalt\(\s*(?:rounds\s*=\s*)?(\d+)\s*\)|\bBCrypt\.(?:HashPassword|GenerateSalt)\([^)]*?(\d+)\s*\)|\bnew\s+BCryptPasswordEncoder\(\s*(\d+)|\bbcrypt\.GenerateFromPassword\([^,]+,\s*(\d+)\s*\)|\bpbkdf2(?:Sync)?\([^,]+,[^,]+,\s*([\d_]+)|\bpbkdf2_hmac\([^,]+,[^,]+,[^,]+,\s*([\d_]+)|\bPBEKeySpec\([^,]+,[^,]+,\s*([\d_]+)|\bRfc2898DeriveBytes(?:\.Pbkdf2)?\([^,]+,[^,]+,\s*([\d_]+)|\bpbkdf2\.Key\([^,]+,[^,]+,\s*([\d_]+)|\bPBKDF2HMAC\([^)]*\biterations\s*=\s*([\d_]+)/i,
    langs: ['js', 'py', 'jvm', 'go', 'cs', 'php', 'rb'],
    when: (m, at) => {
      const i = m.findIndex((v, k) => k > 0 && v !== undefined);
      const n = +String(m[i]).replace(/_/g, '');
      if (i <= 6) return n < 10;
      const line = at.lines[at.i];
      const min = /sha-?512/i.test(line) ? 210000 : /sha-?1\b|sha1/i.test(line) ? 1300000 : 600000;
      return n < min;
    },
    bad: [['src/a.js', 'const salt = await bcrypt.genSalt(8);'], ['src/a.py', "dk = hashlib.pbkdf2_hmac('sha256', pw, salt, 100_000)"], ['src/A.java', 'KeySpec spec = new PBEKeySpec(pw, salt, 10000, 256);']],
    good: [['src/a.js', 'const salt = await bcrypt.genSalt(12);'], ['src/a.py', "dk = hashlib.pbkdf2_hmac('sha256', pw, salt, 600_000)"], ['src/A.java', 'KeySpec spec = new PBEKeySpec(pw, salt, 600000, 256);']],
  },
  {
    id: 'session/insecure-cookie', baseline: 'SECURITY-12',
    title: 'A session or auth cookie drops Secure or HttpOnly',
    fix: 'Set Secure, HttpOnly and SameSite (Lax or Strict) on session and auth cookies.',
    re: /\b(?:httpOnly|httponly|http_only|HttpOnly)\s*[:=]\s*(?:false|False)\b|\b(?:SESSION_COOKIE_SECURE|SESSION_COOKIE_HTTPONLY|CSRF_COOKIE_SECURE|CSRF_COOKIE_HTTPONLY|REMEMBER_COOKIE_SECURE|REMEMBER_COOKIE_HTTPONLY)\s*=\s*False\b|\.(?:setHttpOnly|setSecure)\(\s*false\s*\)|\bCookieSecurePolicy\.None\b|\bserver\.servlet\.session\.cookie\.(?:secure|http-only)\s*[:=]\s*false\b|\bsession\.cookie_(?:secure|httponly)\s*=\s*(?:0|Off|false)\b|\bsecure\s*:\s*false\b/i,
    when: (m, at) => !/^secure/i.test(m[0]) || /cookie|session/i.test(at.lines.slice(Math.max(0, at.i - 4), at.i + 1).join('\n')),
    langs: ['js', 'py', 'jvm', 'cs', 'php', 'rb', 'config', 'yaml'],
    bad: [['src/app.js', 'app.use(session({\n  secret,\n  cookie: {\n    secure: false,\n  },\n}));'], ['src/settings.py', 'SESSION_COOKIE_SECURE = False'], ['src/A.java', 'cookie.setHttpOnly(false);']],
    good: [['src/app.js', 'app.use(session({ secret, cookie: { secure: true, httpOnly: true, sameSite: "lax" } }));'], ['src/mail.js', 'const t = nodemailer.createTransport({ host, port: 587, secure: false });'], ['src/settings.py', 'SESSION_COOKIE_SECURE = True']],
  },

  // SECURITY-13: software and data integrity
  {
    id: 'integrity/unsafe-deserialization', baseline: 'SECURITY-13',
    title: 'Data is deserialized with a format that can construct arbitrary objects',
    fix: 'Deserialize untrusted data only as plain data (JSON with a schema, yaml.safe_load, an allowlist of types); for ML weights use safetensors or torch.load(weights_only=True).',
    re: {
      py: /\b(?:pickle|cPickle|_pickle|dill|shelve|marshal|jsonpickle)\.(?:loads?|Unpickler|open|decode)\s*\(|\byaml\.load\s*\((?![^)]*Loader\s*=\s*(?:yaml\.)?C?SafeLoader)|\byaml\.(?:unsafe_load|unsafe_load_all|load_all)\s*\((?![^)]*Loader\s*=\s*(?:yaml\.)?C?SafeLoader)|\btorch\.load\s*\((?![^)]*weights_only\s*=\s*True)|\bjoblib\.load\s*\(|\ballow_pickle\s*=\s*True/,
      jvm: /\bnew\s+ObjectInputStream\s*\(|\bnew\s+XMLDecoder\s*\(|\.enableDefaultTyping\s*\(|\bactivateDefaultTyping\s*\(|\bJsonTypeInfo\.Id\.CLASS\b|\bSerializationUtils\.deserialize\s*\(/,
      cs: /\b(?:BinaryFormatter|NetDataContractSerializer|SoapFormatter|LosFormatter|ObjectStateFormatter)\b|\bTypeNameHandling\s*=\s*TypeNameHandling\.(?:All|Auto|Objects|Arrays)\b|\bnew\s+JavaScriptSerializer\(\s*new\s+SimpleTypeResolver/,
      js: /require\(\s*['"](?:node-serialize|serialize-to-js)['"]\s*\)|\bfrom\s+['"](?:node-serialize|serialize-to-js)['"]|(?<![\w.])unserialize\s*\(/,
      php: /(?<![\w>])unserialize\s*\((?![^)]*allowed_classes['"]?\s*=>\s*false)/,
      rb: /\bMarshal\.load\s*\(|\bYAML\.unsafe_load\s*\(|\bOj\.load\s*\((?![^)]*mode:\s*:strict)/,
    },
    bad: [
      ['src/a.py', 'obj = pickle.loads(request.data)'],
      ['src/A.java', 'Object o = new ObjectInputStream(in).readObject();'],
      ['src/A.cs', 'var o = new BinaryFormatter().Deserialize(stream);'],
      ['src/a.js', "const serialize = require('node-serialize');"],
      ['src/a.php', '$o = unserialize($_COOKIE["prefs"]);'],
      ['src/a.rb', 'obj = Marshal.load(data)'],
    ],
    good: [
      ['src/a.py', 'cfg = yaml.load(text, Loader=yaml.SafeLoader); model = torch.load(p, weights_only=True)'],
      ['src/A.java', 'Prefs p = mapper.readValue(in, Prefs.class);'],
      ['src/A.cs', 'var o = JsonSerializer.Deserialize<Prefs>(stream);'],
      ['src/a.js', 'const prefs = JSON.parse(body);'],
      ['src/a.php', '$o = unserialize($data, ["allowed_classes" => false]);'],
      ['src/a.rb', 'obj = JSON.parse(data)'],
    ],
  },
  {
    id: 'integrity/xml-external-entities', baseline: 'SECURITY-13', owasp: 'A02:2025',
    title: 'An XML parser is used without DTD / external-entity processing disabled (XXE)',
    fix: 'Disable DTDs and external entities (disallow-doctype-decl, XMLConstants.ACCESS_EXTERNAL_DTD = "", DtdProcessing.Prohibit), or use defusedxml in Python.',
    re: {
      py: /^\s*(?:from|import)\s+xml\.(?:etree|dom|sax|parsers\.expat)\b|\bXMLParser\((?![^)]*resolve_entities\s*=\s*False)|\bresolve_entities\s*=\s*True/,
      jvm: /\b(?:DocumentBuilderFactory|SAXParserFactory|XMLInputFactory|TransformerFactory|SchemaFactory|SAXTransformerFactory)\.new(?:Instance|Factory|DefaultInstance)\s*\(|\bXMLReaderFactory\.createXMLReader\s*\(|\bnew\s+(?:SAXReader|SAXBuilder)\s*\(/,
      cs: /\bDtdProcessing\s*=\s*DtdProcessing\.Parse\b|\bXmlResolver\s*=\s*new\s+XmlUrlResolver\b|\bProhibitDtd\s*=\s*false\b/,
      js: /\bnoent\s*:\s*true\b/,
      php: /\bLIBXML_NOENT\b|\bLIBXML_DTDLOAD\b|\blibxml_disable_entity_loader\(\s*false\s*\)/,
    },
    unlessFile: { py: /\bdefusedxml\b/, jvm: /disallow-doctype-decl|ACCESS_EXTERNAL_DTD|ACCESS_EXTERNAL_SCHEMA|SUPPORT_DTD|IS_SUPPORTING_EXTERNAL_ENTITIES|external-general-entities/ },
    bad: [['src/a.py', 'import xml.etree.ElementTree as ET'], ['src/X.java', 'DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();'], ['src/X.cs', 'settings.DtdProcessing = DtdProcessing.Parse;'], ['src/a.js', 'const doc = libxmljs.parseXml(xml, { noent: true });'], ['src/a.php', '$d->loadXML($xml, LIBXML_NOENT);']],
    good: [['src/a.py', 'import defusedxml.ElementTree as ET'], ['src/X.java', 'DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();\nf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);'], ['src/X.cs', 'settings.DtdProcessing = DtdProcessing.Prohibit;'], ['src/a.js', 'const doc = libxmljs.parseXml(xml, { noent: false });'], ['src/a.php', '$d->loadXML($xml, LIBXML_NONET);']],
  },
  {
    id: 'integrity/missing-sri', baseline: 'SECURITY-13',
    title: 'A script or stylesheet is loaded from another origin without Subresource Integrity',
    fix: 'Add integrity="sha384-..." and crossorigin="anonymous", or self-host the file.',
    re: /<script\b(?![^>]*\bintegrity\s*=)[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\/(?!localhost\b|127\.0\.0\.1\b)[^>]*>|<link\b(?=[^>]*\brel\s*=\s*["']?(?:stylesheet|preload|modulepreload)\b)(?![^>]*\bintegrity\s*=)(?![^>]*fonts\.googleapis\.com)[^>]*\bhref\s*=\s*["']?(?:https?:)?\/\/(?!localhost\b|127\.0\.0\.1\b)[^>]*>/i,
    langs: ['html', 'js', 'php'],
    bad: [['src/index.html', '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>']],
    good: [['src/index.html', '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js" integrity="sha384-abc" crossorigin="anonymous"></script>\n<script src="/js/app.js"></script>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">']],
  },
  {
    id: 'integrity/remote-script-execution', baseline: 'SECURITY-13',
    title: 'A script is downloaded and executed without verification (curl | sh)',
    fix: 'Download to a file, verify its checksum or signature, then run it; or install a pinned package instead.',
    re: /\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+(?:-\S+\s+)*)?(?:ba|z|da|k)?sh\b|\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+)?python3?\b(?!\s+-m\s+json\.tool)|\biex\b[^\n]*(?:Invoke-WebRequest|\biwr\b|Net\.WebClient|DownloadString)|(?:Invoke-WebRequest|\biwr\b|DownloadString)[^\n]*\|\s*(?:iex|Invoke-Expression)\b/i,
    langs: ['shell', 'ps', 'docker', 'yaml'],
    bad: [['Dockerfile', 'RUN curl -fsSL https://get.example.sh | sh'], ['scripts/install.ps1', "iex ((New-Object Net.WebClient).DownloadString('https://x/install.ps1'))"]],
    good: [['Dockerfile', 'RUN curl -fsSLo tool.tgz https://x/tool-1.2.3.tgz && echo "$SHA  tool.tgz" | sha256sum -c -'], ['scripts/check.sh', 'curl -s http://localhost:8000/health | python3 -m json.tool']],
  },
  {
    id: 'integrity/unverified-download', baseline: 'SECURITY-13',
    title: 'A Dockerfile ADDs a remote URL without a checksum',
    fix: 'Use ADD --checksum=sha256:<digest> <url>, or download with curl and verify the checksum in the same RUN.',
    re: /^\s*ADD\s+(?![^\n]*--checksum=)[^\n]*\bhttps?:\/\//i,
    langs: ['docker'],
    bad: [['Dockerfile', 'ADD https://github.com/x/y/releases/download/v1/y.tgz /opt/']],
    good: [['Dockerfile', 'ADD --checksum=sha256:24454f830cdb571e2c4ad15481119c43b3cafd48dd869a9b2945d1036d1dc68d https://github.com/x/y/releases/download/v1/y.tgz /opt/']],
  },
  {
    id: 'ci/untrusted-checkout', baseline: 'SECURITY-13',
    title: 'A pull_request_target workflow checks out the pull request\'s code',
    fix: 'Use the pull_request trigger for untrusted code, or keep pull_request_target to trusted base-branch code only (no head ref checkout, no secrets near PR code).',
    path: /(?:^|\/)\.github\/workflows\//,
    re: /\bref\s*:\s*\$\{\{\s*github\.event\.pull_request\.head\.(?:sha|ref)\s*\}\}|\bref\s*:\s*\$\{\{\s*github\.head_ref\s*\}\}|refs\/pull\/\$\{\{[^}]*\}\}\/(?:head|merge)/,
    alsoFile: /\bpull_request_target\b/,
    langs: ['yaml'],
    bad: [['.github/workflows/pr.yml', 'on: pull_request_target\njobs:\n  b:\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}']],
    good: [['.github/workflows/pr.yml', 'on: pull_request\njobs:\n  b:\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}']],
  },
  {
    id: 'ci/script-injection', baseline: 'SECURITY-05',
    title: 'Attacker-controlled event text is expanded inside a CI script',
    fix: 'Pass the value through an environment variable (env: TITLE: ${{ github.event.issue.title }}) and use "$TITLE" in the script.',
    path: /(?:^|\/)\.github\/(?:workflows|actions)\//,
    re: /\$\{\{\s*(?:github\.event\.(?:issue\.(?:title|body)|pull_request\.(?:title|body|head\.ref|head\.label|head\.repo\.default_branch)|comment\.body|review\.body|review_comment\.body|head_commit\.(?:message|author\.(?:name|email))|commits\[[^\]]*\]\.(?:message|author\.(?:name|email))|pages\[[^\]]*\]\.page_name|discussion\.(?:title|body)|workflow_run\.(?:head_branch|head_commit\.message))|github\.head_ref)\s*\}\}/,
    when: (m, at) => { const owner = yamlOwner(at.lines, at.i); return owner === 'run' || owner === 'script'; },
    langs: ['yaml'],
    bad: [['.github/workflows/triage.yml', '      - run: |\n          echo "Title: ${{ github.event.issue.title }}"']],
    good: [['.github/workflows/triage.yml', '      - env:\n          TITLE: ${{ github.event.issue.title }}\n        run: |\n          echo "Title: $TITLE"']],
  },

  // SECURITY-15: exception handling
  {
    id: 'errors/swallowed-exception', baseline: 'SECURITY-15', multiline: true,
    title: 'An exception is caught and silently discarded',
    fix: 'Handle it: log it through the structured logger and fail closed (rethrow, return an error, or deny); never leave the handler empty.',
    re: {
      js: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*\}|\.catch\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>\s*(?:\{\s*\}|null|undefined|void 0)\s*\)|\.catch\(\s*function\s*\(\s*\w*\s*\)\s*\{\s*\}\s*\)|\.catch\(\s*(?:noop|_\.noop)\s*\)/,
      jvm: /\bcatch\s*\([^)]*\)\s*\{\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*\}/,
      cs: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*\}/,
      php: /\bcatch\s*\([^)]*\)\s*\{\s*(?:(?:\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)\s*)*\}/,
      py: /^[ \t]*except\b[^:\n]*:[ \t]*(?:#[^\n]*)?\n(?:[ \t]*#[^\n]*\n)*[ \t]*(?:pass|\.\.\.)[ \t]*(?:#[^\n]*)?$|^[ \t]*except\b[^:\n]*:[ \t]*(?:pass|\.\.\.)\b/m,
      go: /\bif\s+err\s*!=\s*nil\s*\{\s*(?:\/\/[^\n]*\s*)*\}/,
      rb: /\brescue\s+nil\b|\brescue\b[^\n]*\n\s*end\b/,
    },
    bad: [
      ['src/a.ts', 'try {\n  await save(order);\n} catch (e) {\n}'],
      ['src/a.js', 'fetchUser(id).catch(() => {});'],
      ['src/A.java', 'try { close(); } catch (IOException e) { /* ignore */ }'],
      ['src/A.cs', 'try { Save(); } catch { }'],
      ['src/a.php', 'try { save(); } catch (Exception $e) {}'],
      ['src/a.py', 'try:\n    save()\nexcept Exception:\n    pass'],
      ['src/a.go', 'if err != nil {\n}'],
      ['src/a.rb', 'value = Integer(x) rescue nil'],
    ],
    good: [
      ['src/a.ts', 'try {\n  await save(order);\n} catch (e) {\n  logger.error("save failed", { err: e });\n  throw e;\n}'],
      ['src/a.js', 'fetchUser(id).catch((err) => logger.warn("lookup failed", { err }));'],
      ['src/A.java', 'try { close(); } catch (IOException e) { log.warn("close failed", e); }'],
      ['src/A.cs', 'try { Save(); } catch (DbException ex) { _log.LogError(ex, "save failed"); throw; }'],
      ['src/a.php', 'try { save(); } catch (Exception $e) { $log->error($e); throw $e; }'],
      ['src/a.py', 'try:\n    save()\nexcept DatabaseError:\n    logger.exception("save failed")\n    raise'],
      ['src/a.go', 'if err != nil {\n\treturn fmt.Errorf("save: %w", err)\n}'],
      ['src/a.rb', "begin\n  save\nrescue StandardError => e\n  logger.error(e)\n  raise\nend"],
    ],
  },
];

