const { loadConfig } = require('./config');
const { runSetupWizard, DEFAULT_HOSTED } = require('./setup');
const { isGitRepo, getStagedDiff, getStagedFiles, hasStagedChanges, commit } = require('./git');
const { buildPrompt } = require('./prompt');
const { ask, color } = require('./ui');
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

  if (args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  if (!isGitRepo()) {
    console.log(color('Not inside a git repository.', 'red'));
    process.exit(1);
  }

  if (!hasStagedChanges()) {
    console.log(color('No staged changes found. Stage something first with "git add".', 'yellow'));
    process.exit(1);
  }

  let config = loadConfig();
  if (!config || config.provider !== 'hosted') {
    // First run (or old gemini/ollama config): auto-configure hosted, no prompts.
    config = await runSetupWizard();
  }

  let message;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log(color('\n🤖 Generating commit message...', 'dim'));
      message = await generateMessage(config);
    } catch (err) {
      console.log(color(`\n✖ ${err.message}`, 'red'));
      process.exit(1);
    }

    console.log(color('\nSuggested commit message:\n', 'bold'));
    console.log(color(`  ${message.split('\n').join('\n  ')}`, 'green'));

    const choice = await ask(
      color('\n[Enter] use it   [r] regenerate   [e] edit   [c] cancel\n> ', 'dim')
    );

    if (choice === '') {
      break;
    } else if (choice.toLowerCase() === 'r') {
      continue;
    } else if (choice.toLowerCase() === 'e') {
      const edited = await ask(color('Edit message: ', 'cyan'));
      if (edited.trim()) message = edited.trim();
      break;
    } else if (choice.toLowerCase() === 'c') {
      console.log(color('Cancelled.', 'yellow'));
      process.exit(0);
    } else {
      console.log(color('Unrecognized option, try again.', 'red'));
    }
  }

  const ok = commit(message);
  if (ok) {
    console.log(color('\n✅ Committed!\n', 'green'));
  } else {
    console.log(color('\n✖ Commit failed.\n', 'red'));
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
${color('ai-commit', 'bold')} — AI-generated git commit messages from your staged diff

Usage:
  ai-commit           Generate a commit message for staged changes and commit
  ai-commit config    Reset config to the hosted server defaults
  ai-commit --help    Show this help

Uses the hosted AI server by default. Config is stored at ~/.ai-commit/config.json
`);
}

module.exports = { main };
