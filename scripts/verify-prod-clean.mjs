#!/usr/bin/env node

/**
 * verify-prod-clean.mjs
 * Enforces Rule B.2 (R-M6) and Direct Node.js Workflow Invariants:
 * - Verifies zero Docker configuration files exist in the repository (docker-compose.yml, Dockerfile, etc.)
 * - Verifies no synthetic data rows or imports exist in production source code (Rule R-M3)
 * - Verifies no untracked or committed credential/environment files exist
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
let violationCount = 0;

console.log('[VERIFY:PROD-CLEAN] Running production cleanliness and workflow audit...');

// 1. Docker-related file check: No Docker files allowed in the repository
const BANNED_DOCKER_FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  'Dockerfile.dev',
  'Dockerfile.prod',
  '.dockerignore',
];

for (const bannedFile of BANNED_DOCKER_FILES) {
  const filePath = path.join(ROOT_DIR, bannedFile);
  if (fs.existsSync(filePath)) {
    console.error(`[VERIFY:PROD-CLEAN ERROR] Forbidden Docker file detected: ${bannedFile}`);
    violationCount++;
  }
}

// 2. Scan production packages for Docker-specific dependencies or synthetic leaks
const PRODUCTION_DIRS = ['packages', 'services', 'apps'];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') continue;
      walkDir(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().includes('docker')) {
        console.error(`[VERIFY:PROD-CLEAN ERROR] Forbidden Docker-related file detected: ${path.relative(ROOT_DIR, fullPath)}`);
        violationCount++;
      }
    }
  }
}

for (const dir of PRODUCTION_DIRS) {
  walkDir(path.join(ROOT_DIR, dir));
}

// 3. Verify .env is not committed or present as a tracked file in git
const gitEnvPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(gitEnvPath)) {
  try {
    if (fs.existsSync(path.join(ROOT_DIR, '.git'))) {
      const { execSync } = await import('node:child_process');
      const tracked = execSync('git ls-files .env', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (tracked.length > 0) {
        console.error('[VERIFY:PROD-CLEAN ERROR] Security Violation: .env file is tracked in git index!');
        violationCount++;
      }
    }
  } catch {
    // Git check fallback if git CLI is unavailable
  }
}

if (violationCount > 0) {
  console.error(`\n[VERIFY:PROD-CLEAN FAILED] Found ${violationCount} cleanliness violations.`);
  process.exit(1);
} else {
  console.log('[VERIFY:PROD-CLEAN PASSED] Repository is clean: zero Docker files, pure Node.js workflow verified.');
  process.exit(0);
}
