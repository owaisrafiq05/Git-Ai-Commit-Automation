const { saveConfig } = require('./config');
const { ask, selectOption, color } = require('./ui');
const ollama = require('./providers/ollama');

async function runSetupWizard() {
  console.log(color('\n👋 First-time setup for ai-commit', 'bold'));
  console.log('You can change this anytime by running: ' + color('ai-commit config', 'cyan'));

  const provider = await selectOption('Choose your AI provider:', [
    {
      label: 'Gemini — free API key from Google, works instantly, nothing to install',
      value: 'gemini',
    },
    {
      label: 'Ollama — fully local & private, requires installing Ollama + a model',
      value: 'ollama',
    },
    {
      label: 'Hosted — use a team/shared server URL (e.g. your own Render deployment)',
      value: 'hosted',
    },
  ]);

  const config = { provider };

  if (provider === 'gemini') {
    config.gemini = await setupGemini();
  } else if (provider === 'ollama') {
    config.ollama = await setupOllama();
  } else {
    config.hosted = await setupHosted();
  }

  saveConfig(config);
  console.log(color('\n✅ Saved. Run "ai-commit" anytime inside a git repo with staged changes.\n', 'green'));
  return config;
}

async function setupGemini() {
  console.log(color('\nGet a free key here: https://aistudio.google.com/apikey', 'dim'));
  const apiKey = await ask(color('Paste your Gemini API key: ', 'cyan'));
  const modelInput = await ask(color('Model to use [gemini-2.5-flash]: ', 'cyan'));
  return {
    apiKey: apiKey.trim(),
    model: modelInput.trim() || 'gemini-2.5-flash',
  };
}

async function setupOllama() {
  const running = await ollama.isRunning();
  if (!running) {
    console.log(color("\n⚠️  Ollama doesn't seem to be running yet.", 'yellow'));
    console.log('Install it from https://ollama.com, then come back and run "ollama serve".');
  }

  const modelChoice = await selectOption('Which model setup?', [
    {
      label:
        'Recommended: tavernari/git-commit-message (mini, 2-step pipeline built specifically for commits, ~5GB total)',
      value: 'tavernari',
    },
    { label: 'Custom / general-purpose model (e.g. qwen2.5-coder:3b, single-step)', value: 'custom' },
  ]);

  if (modelChoice === 'tavernari') {
    console.log(color('\nPull both required models first (run these once):', 'dim'));
    console.log(color('  ollama pull tavernari/git-commit-message:sp_change_mini', 'cyan'));
    console.log(color('  ollama pull tavernari/git-commit-message:sp_commit_mini', 'cyan'));
    const hostInput = await ask(color(`\nOllama host [${ollama.DEFAULT_HOST}]: `, 'cyan'));
    return {
      twoStep: true,
      changeModel: 'tavernari/git-commit-message:sp_change_mini',
      commitModel: 'tavernari/git-commit-message:sp_commit_mini',
      host: hostInput.trim() || ollama.DEFAULT_HOST,
    };
  }

  const modelInput = await ask(color(`Model to use [${ollama.DEFAULT_MODEL}]: `, 'cyan'));
  const hostInput = await ask(color(`Ollama host [${ollama.DEFAULT_HOST}]: `, 'cyan'));
  return {
    twoStep: false,
    model: modelInput.trim() || ollama.DEFAULT_MODEL,
    host: hostInput.trim() || ollama.DEFAULT_HOST,
  };
}

async function setupHosted() {
  console.log(
    color(
      '\nThis points the CLI at your own proxy server (see /server in the repo) instead of calling Gemini directly.',
      'dim'
    )
  );
  const host = await ask(color('Server URL (e.g. https://your-app.onrender.com): ', 'cyan'));
  const secret = await ask(color('Client secret, if the server requires one (optional): ', 'cyan'));
  return {
    host: host.trim(),
    clientSecret: secret.trim() || undefined,
  };
}

module.exports = { runSetupWizard };
