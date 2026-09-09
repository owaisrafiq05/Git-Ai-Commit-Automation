const { execSync, spawnSync } = require('child_process');

function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getStagedDiff() {
  try {
    return execSync('git diff --cached', { maxBuffer: 1024 * 1024 * 20 }).toString();
  } catch {
    return '';
  }
}

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-status')
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasStagedChanges() {
  return getStagedFiles().length > 0;
}

// Uses spawnSync with an argument array (not a shell string) so the
// commit message never needs manual quote-escaping and can't break
// on special characters.
function commit(message) {
  const result = spawnSync('git', ['commit', '-m', message], { stdio: 'inherit' });
  return result.status === 0;
}

module.exports = { isGitRepo, getStagedDiff, getStagedFiles, hasStagedChanges, commit };
