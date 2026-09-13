const { saveConfig } = require('./config');
const { color } = require('./ui');
const { printBanner } = require('./banner');

// Baked-in hosted defaults so npm users never need to pick a provider.
const DEFAULT_HOSTED = {
  host: 'http://13.51.188.128:3000',
  clientSecret: '4bfd789a1b3d19a83f888561947beaf510a04778ad8b2b8626d6f36e7940d728',
};

async function runSetupWizard({ skipBanner = false } = {}) {
  if (!skipBanner) printBanner();
  const config = {
    provider: 'hosted',
    hosted: { ...DEFAULT_HOSTED },
  };
  saveConfig(config);
  console.log(color('  ✅  Configured to use hosted AI. Run "ai-commit" with staged changes.\n', 'green'));
  return config;
}

module.exports = { runSetupWizard, DEFAULT_HOSTED };
