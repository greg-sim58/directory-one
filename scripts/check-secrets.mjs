#!/usr/bin/env node
// Pre-commit secret scanner.
// Inspects staged content for tokens/keys that should not leave the machine.
// Exit 0 = clean. Exit 1 = at least one finding (blocks the commit).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'GitHub PAT (classic)', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: 'GitHub fine-grained PAT', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: 'GitHub OAuth token', re: /\bgho_[A-Za-z0-9]{20,}\b/g },
  { name: 'GitHub server token', re: /\bghs_[A-Za-z0-9]{20,}\b/g },
  { name: 'GitHub refresh token', re: /\bghr_[A-Za-z0-9]{20,}\b/g },
  { name: 'GitHub user token', re: /\bghu_[A-Za-z0-9]{20,}\b/g },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Stripe live secret', re: /\bsk_live_[A-Za-z0-9]{20,}\b/g },
  { name: 'Stripe restricted key', re: /\brk_live_[A-Za-z0-9]{20,}\b/g },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  {
    name: 'Generic Bearer header',
    re: /(?:authorization["'\s:]+)?Bearer\s+[A-Za-z0-9._\-]{24,}/gi,
  },
  {
    name: 'Generic high-entropy assignment',
    re: /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"]([A-Za-z0-9._\-+/=]{24,})['"]/gi,
  },
];

const IGNORE_PATH_PARTS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.agents/skills/vercel-react-best-practices/rules',
  'scripts/check-secrets.mjs',
]);

const BINARY_EXT = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'pdf',
  'zip',
  'tar',
  'gz',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp4',
  'mov',
  'mp3',
  'wav',
]);

function getStagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

function shouldScan(path) {
  if (!path) return false;
  for (const part of path.split(/[\\/]/)) {
    if (IGNORE_PATH_PARTS.has(part)) return false;
  }
  const ext = path.includes('.') ? path.split('.').pop().toLowerCase() : '';
  if (BINARY_EXT.has(ext)) return false;
  return true;
}

function redact(value) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

const findings = [];
for (const file of getStagedFiles()) {
  if (!shouldScan(file)) continue;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      const value = match[1] ?? match[0];
      findings.push({ file, line, pattern: name, value });
    }
  }
}

if (findings.length === 0) {
  process.exit(0);
}

console.error('\n[check-secrets] blocked: potential secrets in staged content\n');
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.pattern}  (${redact(f.value)})`);
}
console.error(
  `\n${findings.length} finding(s). Move the value to an env var or .gitignore the file, then re-stage.\n`,
);
process.exit(1);
