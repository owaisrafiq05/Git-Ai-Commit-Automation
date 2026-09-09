#!/usr/bin/env node

const { main } = require('../src/cli');
const { closeUI } = require('../src/ui');

main(process.argv)
  .catch((err) => {
    console.error('\nUnexpected error:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => closeUI());