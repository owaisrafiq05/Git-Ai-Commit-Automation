// Only the diff is sent to the model - never the full repo. This keeps
// the payload small enough for even a 1-3B local model, and keeps
// Gemini free-tier usage cheap.
const MAX_DIFF_CHARS = 12000;

function truncateDiff(diff) {
  if (diff.length <= MAX_DIFF_CHARS) return diff;
  return diff.slice(0, MAX_DIFF_CHARS) + '\n\n[...diff truncated for length...]';
}

function buildPrompt(diff, fileNames) {
  const fileList = fileNames.join('\n');
  const truncated = truncateDiff(diff);

  return `You are an expert software engineer writing a git commit message.

Generate ONE concise commit message in the Conventional Commits format:
type(scope?): short description

Allowed types: feat, fix, refactor, docs, test, chore, perf, style, build, ci

Rules:
- Return ONLY the commit message. No explanation, no quotes, no markdown fences.
- Keep the first line under 72 characters.
- Add a short body after a blank line only if genuinely necessary.
- Base the message ONLY on the diff below. Do not invent unrelated context.

Changed files:
${fileList}

Diff:
${truncated}
`;
}

// Splits a `git diff --cached` blob into one chunk per file, so a
// two-step pipeline (summarize each file, then synthesize) can process
// them separately - this is what tavernari/git-commit-message expects.
function splitDiffByFile(diff) {
  const parts = diff.split(/(?=^diff --git )/m).filter(Boolean);
  return parts.map((chunk) => {
    const match = chunk.match(/^diff --git a\/(.+?) b\/(.+?)\n/);
    const file = match ? match[2] : 'unknown file';
    return { file, chunk };
  });
}

function buildFileSummaryPrompt(file, diffChunk) {
  const truncated = truncateDiff(diffChunk);
  return `Summarize what changed in this single file in ONE short line (what + why, no fluff).

File: ${file}

Diff:
${truncated}
`;
}

function buildCommitFromSummariesPrompt(summariesText) {
  return `You are an expert software engineer writing a git commit message.

Below are short summaries of what changed in each file. Synthesize them into
ONE concise commit message in the Conventional Commits format:
type(scope?): short description

Allowed types: feat, fix, refactor, docs, test, chore, perf, style, build, ci

Rules:
- Return ONLY the commit message. No explanation, no quotes, no markdown fences.
- Keep the first line under 72 characters.
- Add a short body after a blank line only if genuinely necessary.

Per-file summaries:
${summariesText}
`;
}

module.exports = {
  buildPrompt,
  splitDiffByFile,
  buildFileSummaryPrompt,
  buildCommitFromSummariesPrompt,
};
