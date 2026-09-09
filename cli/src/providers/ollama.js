const DEFAULT_MODEL = 'qwen2.5-coder:3b';
const DEFAULT_HOST = 'http://localhost:11434';

async function isRunning(host = DEFAULT_HOST) {
  try {
    const res = await fetch(`${host}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

async function generate({ prompt, model, host }) {
  const useModel = model || DEFAULT_MODEL;
  const useHost = host || DEFAULT_HOST;

  const running = await isRunning(useHost);
  if (!running) {
    throw new Error(
      `Can't reach Ollama at ${useHost}.\n` +
        `Make sure Ollama is installed and running ("ollama serve"), and that you've pulled a model:\n` +
        `  ollama pull ${useModel}`
    );
  }

  const res = await fetch(`${useHost}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: useModel,
      prompt,
      stream: false,
      options: { temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const text = (data.response || '').trim();
  if (!text) {
    throw new Error('Ollama returned an empty response.');
  }
  return text;
}

// Two-step pipeline for model families like tavernari/git-commit-message,
// which ship a small "change" model (summarizes one file's diff) and a
// separate "commit" model (synthesizes the final message from those
// summaries). Generally gives better results than one-shot on multi-file
// diffs, at the cost of one extra call per changed file.
async function generateTwoStep({ diff, changeModel, commitModel, host }) {
  const { splitDiffByFile, buildFileSummaryPrompt, buildCommitFromSummariesPrompt } = require('../prompt');

  const chunks = splitDiffByFile(diff).slice(0, 20); // cap runaway diffs
  if (chunks.length === 0) {
    throw new Error('No file-level diff chunks found to summarize.');
  }

  const summaries = [];
  for (const c of chunks) {
    try {
      const prompt = buildFileSummaryPrompt(c.file, c.chunk);
      const summary = await generate({ prompt, model: changeModel, host });
      summaries.push(`- ${c.file}: ${summary}`);
    } catch (err) {
      summaries.push(`- ${c.file}: (could not summarize: ${err.message})`);
    }
  }

  const finalPrompt = buildCommitFromSummariesPrompt(summaries.join('\n'));
  return generate({ prompt: finalPrompt, model: commitModel, host });
}

module.exports = { generate, generateTwoStep, isRunning, DEFAULT_MODEL, DEFAULT_HOST };
