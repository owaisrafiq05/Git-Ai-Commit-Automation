const { color } = require('./ui');

// Block / "3D" style banner for the terminal (FIGlet-like).
const BANNER = `
   ██████╗ ██╗████████╗     █████╗ ██╗
  ██╔════╝ ██║╚══██╔══╝    ██╔══██╗██║
  ██║  ███╗██║   ██║       ███████║██║
  ██║   ██║██║   ██║       ██╔══██║██║
  ╚██████╔╝██║   ██║       ██║  ██║██║
   ╚═════╝ ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝

   ██████╗ ██████╗ ███╗   ███╗███╗   ███╗██╗████████╗
  ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██║╚══██╔══╝
  ██║     ██║   ██║██╔████╔██║██╔████╔██║██║   ██║
  ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║
  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║   ██║
   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝
`.trimEnd();

const CREDITS = [
  'Developed by Owais Rafiq (owaisrafiq05) and Aliza Khan (AlizaKhan3)',
];

const REPO_URL = 'https://github.com/owaisrafiq05/Git-Ai-Commit-Automation';

function printBanner() {
  const lines = BANNER.split('\n');
  for (const line of lines) {
    console.log(color(line, 'cyan'));
  }
  console.log();
  for (const line of CREDITS) {
    console.log(color(`  ${line}`, 'dim'));
  }
  console.log();
  console.log(color('  ★  Star the repo if you like it and found it helpful:', 'yellow'));
  console.log(color(`     ${REPO_URL}`, 'cyan'));
  console.log();
}

module.exports = { printBanner, BANNER, CREDITS };
