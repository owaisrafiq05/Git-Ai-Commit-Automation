#!/usr/bin/env node
// Shown after `npm install -g ai-commit-cli` / `npm install`.
try {
  const { printBanner } = require('../src/banner');
  printBanner();
  console.log('  Run:  ai-commit --help\n');
} catch {
  // Never fail install because of a banner.
}
