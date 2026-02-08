/**
 * Terminal UI — colors, spinner, prompts, banner.
 * Zero dependencies. Node 18+ built-ins only.
 */

const readline = require("node:readline");

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const WHITE = "\x1b[37m";

const BANNER = `
${BOLD}${CYAN}  ███████╗ ██████╗ ██████╗ ███████╗ ██████╗  ██████╗ ██████╗ ███████╗
  ██╔════╝██╔════╝ ██╔══██╗██╔════╝██╔════╝ ██╔═══██╗██╔══██╗██╔════╝
  █████╗  ██║  ███╗██████╔╝█████╗  ██║  ███╗██║   ██║██████╔╝█████╗
  ██╔══╝  ██║   ██║██╔══██╗██╔══╝  ██║   ██║██║   ██║██╔══██╗██╔══╝
  ███████╗╚██████╔╝██║  ██║███████╗╚██████╔╝╚██████╔╝██║  ██║███████╗
  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝${RESET}
`;

function banner() {
  console.log(BANNER);
}

function info(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}!${RESET} ${msg}`);
}

function error(msg) {
  console.error(`  ${RED}✗${RESET} ${msg}`);
}

function step(n, total, msg) {
  console.log(`\n  ${DIM}[${n}/${total}]${RESET} ${msg}`);
}

function dim(msg) {
  return `${DIM}${msg}${RESET}`;
}

function bold(msg) {
  return `${BOLD}${msg}${RESET}`;
}

function cyan(msg) {
  return `${CYAN}${msg}${RESET}`;
}

// Simple spinner
function spinner(msg) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${CYAN}${frames[i++ % frames.length]}${RESET} ${msg}`);
  }, 80);
  return {
    stop(result) {
      clearInterval(interval);
      process.stdout.write(`\r  ${GREEN}✓${RESET} ${result || msg}\n`);
    },
    fail(result) {
      clearInterval(interval);
      process.stdout.write(`\r  ${RED}✗${RESET} ${result || msg}\n`);
    },
  };
}

// Prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`  ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Prompt with numbered choices
async function choose(question, options) {
  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const { label, description } = options[i];
    console.log(`  ${BOLD}${i + 1}.${RESET} ${label}${description ? ` ${DIM}— ${description}${RESET}` : ""}`);
  }
  console.log();

  while (true) {
    const answer = await prompt(`Pick [1-${options.length}]:`);
    const n = parseInt(answer, 10);
    if (n >= 1 && n <= options.length) {
      return options[n - 1];
    }
    warn(`Enter a number between 1 and ${options.length}`);
  }
}

module.exports = {
  banner, info, success, warn, error, step, dim, bold, cyan,
  spinner, prompt, choose,
};
