#!/usr/bin/env node

/**
 * verify-no-mock.mjs
 * Enforces Rule B.2 (R-M1, R-M2, R-M6):
 * - Production code contains zero mock, fake, dummy, sample, demo, or placeholder records.
 * - Production code never imports from tests/fixtures or tools/simulator.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const PRODUCTION_DIRS = ['packages', 'services', 'apps'];

// Banned placeholder and mock patterns in production code
const BANNED_PATTERNS = [
  { regex: /import\s+.*from\s+['"].*tests\/fixtures.*['"]/i, message: 'Forbidden import from tests/fixtures (Rule R-M2)' },
  { regex: /import\s+.*from\s+['"].*tools\/simulator.*['"]/i, message: 'Forbidden import from tools/simulator (Rule R-M2)' },
  { regex: /['"]lorem\s+ipsum/i, message: 'Forbidden lorem ipsum placeholder (Rule R-M1)' },
  { regex: /\b(dummy_token|sample_token|mock_token|fake_token)\b/i, message: 'Forbidden dummy token string (Rule R-M1)' },
  { regex: /\b(dummy_device|fake_device|sample_bus|mock_bus)\b/i, message: 'Forbidden fake entity name (Rule R-M1)' },
  { regex: /\btest@example\.com\b/i, message: 'Forbidden placeholder email (Rule R-M1)' },
  { regex: /\b555-01\d{2}\b/i, message: 'Forbidden dummy phone number (Rule R-M1)' },
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
      // Check code files (.ts, .tsx, .js, .mjs, .json) excluding test files
      if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name) && !entry.name.includes('.spec.') && !entry.name.includes('.test.')) {
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
        console.error(`[VERIFY:NO-MOCK ERROR] ${relPath}:${index + 1} - ${pattern.message}`);
        console.error(`  > ${line.trim()}`);
        violationCount++;
      }
    }
  });
}

console.log('[VERIFY:NO-MOCK] Scanning production code directories...');
for (const dir of PRODUCTION_DIRS) {
  walkDir(path.join(ROOT_DIR, dir));
}

if (violationCount > 0) {
  console.error(`\n[VERIFY:NO-MOCK FAILED] Found ${violationCount} mock or placeholder violations in production code.`);
  process.exit(1);
} else {
  console.log('[VERIFY:NO-MOCK PASSED] Zero mock, dummy, or synthetic violations found in production code.');
  process.exit(0);
}
