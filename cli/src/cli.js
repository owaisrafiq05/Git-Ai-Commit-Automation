const { loadConfig } = require('./config');
const { runSetupWizard, DEFAULT_HOSTED } = require('./setup');
const { isGitRepo, getStagedDiff, getStagedFiles, hasStagedChanges, commit } = require('./git');
const { buildPrompt } = require('./prompt');
const { ask, color } = require('./ui');
const { printBanner } = require('./banner');
const hosted = require('./providers/hosted');

async function generateMessage(config) {
  const diff = getStagedDiff();
  const files = getStagedFiles().map((line) => line.split('\t').pop());
  const hc = (config && config.hosted) || {};
  return hosted.generate({
    prompt: buildPrompt(diff, files),
    host: hc.host || DEFAULT_HOSTED.host,
    clientSecret: hc.clientSecret || DEFAULT_HOSTED.clientSecret,
  });
}

async function main(argv) {
  const args = argv.slice(2);

  if (args[0] === 'config') {
    await runSetupWizard();
    return;
  }

  if (args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    printHelp();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v' || args[0] === 'version') {
    printBanner();
    console.log(color('  ai-commit  v0.1.0\n', 'bold'));
    return;
  }

  // Brand every commit run — logo, credits, star CTA.
  printBanner();

  if (!isGitRepo()) {
    console.log(color('  ✖  Not inside a git repository.\n', 'red'));
    process.exit(1);
  }

  if (!hasStagedChanges()) {
    console.log(color('  ✖  No staged changes found. Stage something first with "git add".\n', 'yellow'));
    process.exit(1);
  }

  let config = loadConfig();
  if (!config || config.provider !== 'hosted') {
    // First run (or old gemini/ollama config): auto-configure hosted, no prompts.
    config = await runSetupWizard({ skipBanner: true });
  }

  let message;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log(color('  ⚙  Generating commit message with Git AI Commit...\n', 'dim'));
      message = await generateMessage(config);
    } catch (err) {
      console.log(color(`  ✖  ${err.message}\n`, 'red'));
      process.exit(1);
    }

    console.log(color('  Suggested commit message:', 'bold'));
    console.log();
    console.log(color(`    ${message.split('\n').join('\n    ')}`, 'green'));
    console.log();

    const choice = await ask(
      color('  [Enter] use it   [r] regenerate   [e] edit   [c] cancel\n  > ', 'dim')
    );

    if (choice === '') {
      break;
    } else if (choice.toLowerCase() === 'r') {
      continue;
    } else if (choice.toLowerCase() === 'e') {
      const edited = await ask(color('  Edit message: ', 'cyan'));
      if (edited.trim()) message = edited.trim();
      break;
    } else if (choice.toLowerCase() === 'c') {
      console.log(color('\n  Cancelled.\n', 'yellow'));
      process.exit(0);
    } else {
      console.log(color('  Unrecognized option, try again.', 'red'));
    }
  }

  const ok = commit(message);
  if (ok) {
    console.log(color('\n  ✅  Committed with Git AI Commit.\n', 'green'));
  } else {
    console.log(color('\n  ✖  Commit failed.\n', 'red'));
    process.exit(1);
  }
}

function printHelp() {
  printBanner();
  console.log(`${color('  ai-commit', 'bold')} — AI-generated git commit messages from your staged diff

Usage:
  ai-commit           Generate a commit message for staged changes and commit
  ai-commit config    Reset config to the hosted server defaults
  ai-commit --help    Show this help
  ai-commit --version Show version and credits

Uses the hosted AI server by default. Config is stored at ~/.ai-commit/config.json
`);
}

module.exports = { main };
