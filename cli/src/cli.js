const { loadConfig } = require('./config');
const { runSetupWizard } = require('./setup');
const { isGitRepo, getStagedDiff, getStagedFiles, hasStagedChanges, commit } = require('./git');
const { buildPrompt } = require('./prompt');
const { ask, color } = require('./ui');

async function generateMessage(config) {
  const diff = getStagedDiff();
  const files = getStagedFiles().map((line) => line.split('\t').pop());

  if (config.provider === 'gemini') {
    const gemini = require('./providers/gemini');
    const gc = config.gemini || {};
    if (!gc.apiKey) {
      throw new Error('No Gemini API key configured. Run "ai-commit config" to set one up.');
    }
    return gemini.generate({ prompt: buildPrompt(diff, files), apiKey: gc.apiKey, model: gc.model });
  }

  if (config.provider === 'hosted') {
    const hosted = require('./providers/hosted');
    const hc = config.hosted || {};
    return hosted.generate({ prompt: buildPrompt(diff, files), host: hc.host, clientSecret: hc.clientSecret });
  }

  if (config.provider === 'ollama') {
    const ollama = require('./providers/ollama');
    const oc = config.ollama || {};
    if (oc.twoStep) {
      return ollama.generateTwoStep({
        diff,
        changeModel: oc.changeModel,
        commitModel: oc.commitModel,
        host: oc.host,
      });
    }
    return ollama.generate({ prompt: buildPrompt(diff, files), model: oc.model, host: oc.host });
  }

  throw new Error(`Unknown provider "${config.provider}". Run "ai-commit config" to reconfigure.`);
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
  if (!config) {
    // First run ever: the user is asked, right here, which provider to use.
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
  ai-commit config     (Re)run the setup wizard to choose/change your provider
  ai-commit --help     Show this help

Providers:
  gemini   Uses a free Gemini API key you provide (aistudio.google.com/apikey)
  ollama   Uses a local model via Ollama (ollama.com) - fully offline

Config is stored at ~/.ai-commit/config.json
`);
}

module.exports = { main };
