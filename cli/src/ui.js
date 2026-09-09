const readline = require('readline');

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function color(text, name) {
  const code = codes[name];
  if (!code || !process.stdout.isTTY) return text;
  return `${code}${text}${codes.reset}`;
}

// One shared readline interface for the whole process, with a manual
// line queue. Using rl.question() repeatedly breaks on piped (non-TTY)
// stdin: when multiple lines arrive in a single chunk, readline emits
// all of their 'line' events synchronously, but question() only
// listens for one at a time - later lines fire with nobody listening
// and are lost. Queuing every 'line' event ourselves avoids that race
// and works the same way for both piped input and an interactive TTY.
let rl = null;
let lineQueue = [];
let waiters = [];

function ensureRL() {
  if (rl) return;
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    if (waiters.length > 0) {
      waiters.shift()(line);
    } else {
      lineQueue.push(line);
    }
  });
}

function nextLine() {
  ensureRL();
  if (lineQueue.length > 0) {
    return Promise.resolve(lineQueue.shift());
  }
  return new Promise((resolve) => waiters.push(resolve));
}

async function ask(question) {
  process.stdout.write(question);
  const line = await nextLine();
  return line.trim();
}

function closeUI() {
  if (rl) {
    rl.close();
    rl = null;
  }
  lineQueue = [];
  waiters = [];
}

async function selectOption(title, options) {
  console.log('\n' + color(title, 'bold'));
  options.forEach((opt, i) => {
    console.log(`  ${color(`${i + 1})`, 'cyan')} ${opt.label}`);
  });

  while (true) {
    const answer = await ask(color('\n> Enter number: ', 'dim'));
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx].value;
    }
    console.log(color('Invalid choice, try again.', 'red'));
  }
}

module.exports = { color, ask, selectOption, closeUI };
