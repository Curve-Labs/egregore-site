/**
 * Local setup — clone, symlink, alias, .env.
 * Zero dependencies — uses node:child_process, node:fs, node:path, node:os.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf-8", timeout: 60000, ...opts }).trim();
}

/**
 * Full local setup from claimed token data.
 *
 * @param {object} data - from /api/org/claim/{token}
 * @param {object} ui - UI module for output
 * @param {string} targetDir - where to install (default: cwd)
 */
async function install(data, ui, targetDir) {
  const { fork_url, memory_url, github_token, org_name, github_org, slug } = data;
  const base = targetDir || process.cwd();

  const egregoreDir = path.join(base, "egregore");
  const memoryDirName = memory_url
    .split("/")
    .pop()
    .replace(/\.git$/, "");
  const memoryDir = path.join(base, memoryDirName);

  const totalSteps = 5;

  // Configure git credential helper for HTTPS cloning
  configureGitCredentials(github_token);

  // 1. Clone fork
  ui.step(1, totalSteps, "Cloning egregore...");
  if (fs.existsSync(egregoreDir)) {
    ui.warn("egregore/ already exists — pulling latest");
    run("git pull", { cwd: egregoreDir });
  } else {
    run(`git clone "${fork_url}" "${egregoreDir}"`);
  }
  ui.success("Cloned egregore");

  // 2. Clone memory
  ui.step(2, totalSteps, "Cloning shared memory...");
  if (fs.existsSync(memoryDir)) {
    ui.warn(`${memoryDirName}/ already exists — pulling latest`);
    run("git pull", { cwd: memoryDir });
  } else {
    run(`git clone "${memory_url}" "${memoryDir}"`);
  }
  ui.success("Cloned memory");

  // 3. Symlink
  ui.step(3, totalSteps, "Linking memory...");
  const symlinkTarget = path.join(egregoreDir, "memory");
  if (fs.existsSync(symlinkTarget)) {
    ui.warn("memory/ symlink already exists");
  } else {
    const relPath = path.relative(egregoreDir, memoryDir);
    fs.symlinkSync(relPath, symlinkTarget);
  }
  ui.success("Linked");

  // 4. Write .env
  ui.step(4, totalSteps, "Writing credentials...");
  const envPath = path.join(egregoreDir, ".env");
  const envContent = `GITHUB_TOKEN=${github_token}\n`;
  fs.writeFileSync(envPath, envContent, { mode: 0o600 });
  ui.success("Credentials saved");

  // 5. Shell alias
  ui.step(5, totalSteps, "Setting up launch command...");
  setupAlias(egregoreDir, ui);

  // Done
  console.log("");
  ui.success(`Egregore is ready for ${ui.bold(org_name)}`);
  console.log("");
  ui.info(`Your workspace:`);
  ui.info(`  ${ui.cyan("./egregore/")}         — Your Egregore instance`);
  ui.info(`  ${ui.cyan(`./${memoryDirName}/`)}  — Shared knowledge`);
  console.log("");
  ui.info(`Next: type ${ui.bold("egregore")} in any terminal to start.`);
  console.log("");
}

function configureGitCredentials(token) {
  try {
    run("git config --global credential.helper store");
    const credentialInput = `protocol=https\nhost=github.com\nusername=x-access-token\npassword=${token}\n`;
    execSync("git credential-store store", {
      input: credentialInput,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });
  } catch {
    // Non-fatal — user may have their own credential setup
  }
}

function setupAlias(egregoreDir, ui) {
  const profiles = [
    path.join(os.homedir(), ".zshrc"),
    path.join(os.homedir(), ".bashrc"),
    path.join(os.homedir(), ".bash_profile"),
  ];

  const profile = profiles.find((p) => fs.existsSync(p));
  if (!profile) {
    ui.warn("No shell profile found — add this to your shell config:");
    ui.info(`  alias egregore='cd "${egregoreDir}" && claude start'`);
    return;
  }

  const existing = fs.readFileSync(profile, "utf-8");
  // Remove old alias
  const cleaned = existing
    .split("\n")
    .filter((line) => !line.includes("alias egregore=") && !line.match(/^# Egregore$/))
    .join("\n");

  const aliasBlock = `\n# Egregore\nalias egregore='cd "${egregoreDir}" && claude start'\n`;
  fs.writeFileSync(profile, cleaned + aliasBlock);

  ui.success(`Added ${ui.dim("egregore")} alias to ${path.basename(profile)}`);
}

module.exports = { install };
