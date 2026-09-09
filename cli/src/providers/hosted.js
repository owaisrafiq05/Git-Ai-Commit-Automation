async function generate({ prompt, host, clientSecret }) {
  if (!host) {
    throw new Error('No hosted server URL configured. Run "ai-commit config".');
  }

  const url = `${host.replace(/\/$/, '')}/generate-commit-message`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(clientSecret ? { 'X-Client-Secret': clientSecret } : {}),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Hosted server error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  if (!data.message) {
    throw new Error('Hosted server returned no message.');
  }
  return data.message.trim();
}

module.exports = { generate };
