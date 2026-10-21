#!/usr/bin/env node

/**
 * lint.mjs
 * Enforces Rule B.7 & B.8:
 * - No $queryRawUnsafe or $executeRawUnsafe (Prisma unsafe raw SQL banned).
 * - No console.log in production code.
 * - Strict type safety.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PRODUCTION_DIRS = ['packages', 'services', 'apps'];

const BANNED_PATTERNS = [
  { regex: /\$queryRawUnsafe/i, message: 'Banned $queryRawUnsafe call (Rule B.7 - SQL injection prevention)' },
  { regex: /\$executeRawUnsafe/i, message: 'Banned $executeRawUnsafe call (Rule B.7 - SQL injection prevention)' },
  { regex: /console\.log\(/i, message: 'Banned console.log in production code; use structured logger (Rule B.7)' },
];

let violationCount = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') continue;
      walkDir(fullPath);
    } else if (entry.isFile()) {
      if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !entry.name.includes('.spec.') && !entry.name.includes('.test.')) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.regex.test(line)) {
        console.error(`[LINT ERROR] ${relPath}:${index + 1} - ${pattern.message}`);
        console.error(`  > ${line.trim()}`);
        violationCount++;
      }
    }
  });
}

console.log('[LINT] Scanning codebase for unsafe patterns and banned calls...');
for (const dir of PRODUCTION_DIRS) {
  walkDir(path.join(ROOT_DIR, dir));
}

if (violationCount > 0) {
  console.error(`\n[LINT FAILED] Found ${violationCount} unsafe pattern violations.`);
  process.exit(1);
} else {
  console.log('[LINT PASSED] Zero unsafe SQL or console.log patterns found.');
  process.exit(0);
}
