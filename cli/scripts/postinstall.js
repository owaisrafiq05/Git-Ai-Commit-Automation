#!/usr/bin/env node
// Shown after `npm install -g @owaisrafiq05/git-ai-commit` / `npm install`.
try {
  const { printBanner } = require('../src/banner');
  printBanner();
  console.log('  Run:  npx @owaisrafiq05/git-ai-commit --help\n');
  console.log('  Or:   npm install -g @owaisrafiq05/git-ai-commit && ai-commit --help\n');
} catch {
  // Never fail install because of a banner.
}

