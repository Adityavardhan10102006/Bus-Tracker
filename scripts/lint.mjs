#!/usr/bin/env node

/**
 * lint.mjs
 * Enforces Rule B.7, Rule R-M2, and Core Security Invariants:
 * - No $queryRawUnsafe or $executeRawUnsafe (Prisma unsafe raw SQL banned - SQLi prevention).
 * - No console.log in production code (use structured pino logger).
 * - No hardcoded secrets, private keys, AWS tokens, or cleartext database URLs.
 * - No forbidden imports from tests/fixtures or tools/simulator into production code.
 * - No cross-package relative directory escapes (must use @vjit/* workspace packages).
 * - No async Promise executor anti-patterns (new Promise(async ...)).
 * - No debugger statements.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PRODUCTION_DIRS = ['packages', 'services', 'apps'];

/**
 * @typedef {{ id: string, regex: RegExp, message: string, remediation: string }} LintRule
 */

const BANNED_PATTERNS = [
  {
    id: 'SEC-SQL-01',
    regex: /\$queryRawUnsafe/i,
    message: 'Banned $queryRawUnsafe call (Rule B.7 - SQL injection prevention)',
    remediation: 'Use Prisma parameterised tagged-template $queryRaw`...` with bound parameters.',
  },
  {
    id: 'SEC-SQL-02',
    regex: /\$executeRawUnsafe/i,
    message: 'Banned $executeRawUnsafe call (Rule B.7 - SQL injection prevention)',
    remediation: 'Use Prisma parameterised tagged-template $executeRaw`...` with bound parameters.',
  },
  {
    id: 'LOG-CON-01',
    regex: /\bconsole\.log\(/,
    message: 'Banned console.log in production code (Rule B.7)',
    remediation: 'Use the structured JSON logger from @vjit/logger (logger.info, logger.warn, logger.error).',
  },
  {
    id: 'SEC-KEY-01',
    regex: /-----BEGIN\s+([A-Z\s]+)?PRIVATE\s+KEY-----/,
    message: 'Potential hardcoded private key detected',
    remediation: 'Load private cryptographic keys exclusively from environment variables or secure key vaults.',
  },
  {
    id: 'SEC-AWS-01',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    message: 'Potential AWS Access Key ID detected in source code',
    remediation: 'Move AWS credentials to environment variables or IAM instance profiles.',
  },
  {
    id: 'SEC-PWD-01',
    regex: /postgres(ql)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]{4,}@/,
    message: 'Hardcoded database credentials in connection URI detected',
    remediation: 'Use DATABASE_URL loaded via @vjit/config from environment variables.',
  },
  {
    id: 'ARCH-IMP-01',
    regex: /import\s+.*from\s+['"].*(tests\/fixtures|tools\/simulator).*['"]/,
    message: 'Forbidden import from test fixtures or simulator into production code (Rule R-M2)',
    remediation: 'Synthetic test data must never be imported into production application code.',
  },
  {
    id: 'ARCH-PKG-01',
    regex: /import\s+.*from\s+['"]\.\.\/\.\.\/(packages|services|apps)\//,
    message: 'Illegal cross-package relative path import escaping monorepo boundary',
    remediation: 'Import sibling packages using their published workspace package names (@vjit/*).',
  },
  {
    id: 'ASYNC-PRM-01',
    regex: /new\s+Promise\s*\(\s*async\s*\(/,
    message: 'Async function passed as Promise executor anti-pattern',
    remediation: 'Avoid passing async functions to new Promise(); handle asynchronous operations directly.',
  },
  {
    id: 'DEBUG-STMT-01',
    regex: /\bdebugger;/,
    message: 'debugger statement detected in production code',
    remediation: 'Remove debugger breakpoint before committing.',
  },
];

let violationCount = 0;
let scannedFiles = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.turbo' ||
        entry.name === 'build' ||
        entry.name === '.next'
      ) {
        continue;
      }
      walkDir(fullPath);
    } else if (entry.isFile()) {
      if (
        /\.(ts|tsx|js|mjs)$/.test(entry.name) &&
        !entry.name.includes('.spec.') &&
        !entry.name.includes('.test.')
      ) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  scannedFiles++;
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Ignore lines that are comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    for (const pattern of BANNED_PATTERNS) {
      if (pattern.regex.test(line)) {
        console.error(`\n[LINT ERROR: ${pattern.id}] ${relPath}:${index + 1}`);
        console.error(`  Reason: ${pattern.message}`);
        console.error(`  Snippet: ${trimmed}`);
        console.error(`  Fix: ${pattern.remediation}`);
        violationCount++;
      }
    }
  });
}

console.log('[LINT] Scanning production packages for security, anti-patterns, and architectural boundaries...');
for (const dir of PRODUCTION_DIRS) {
  walkDir(path.join(ROOT_DIR, dir));
}

console.log(`[LINT] Scanned ${scannedFiles} source files across packages/, services/, and apps/.`);

if (violationCount > 0) {
  console.error(`\n[LINT FAILED] Found ${violationCount} code standard or security violations.`);
  process.exit(1);
} else {
  console.log('[LINT PASSED] Zero unsafe SQL, secret leaks, banned imports, or console.log patterns found.');
  process.exit(0);
}
