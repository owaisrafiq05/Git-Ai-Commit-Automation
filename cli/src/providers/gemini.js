const DEFAULT_MODEL = 'gemini-2.5-flash';

async function generate({ prompt, apiKey, model }) {
  const useModel = model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Gemini API error (${res.status}): ${errText || res.statusText}. ` +
        `Check your API key with "ai-commit config".`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response. Try again or run "ai-commit config" to change models.');
  }
  return text.trim();
}

module.exports = { generate, DEFAULT_MODEL };
