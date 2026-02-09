/**
 * Local setup — clone, symlink, alias, .env.
 * Zero dependencies — uses node:child_process, node:fs, node:path, node:os.
 */

const { execSync, execFileSync } = require("node:child_process");
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
  const { fork_url, memory_url, github_token, org_name, github_org, slug, api_key, repos = [] } = data;
  const base = targetDir || process.cwd();

  const dirSlug = (github_org || slug || "egregore").toLowerCase();
  const egregoreDir = path.join(base, `egregore-${dirSlug}`);
  const memoryDirName = memory_url
    .split("/")
    .pop()
    .replace(/\.git$/, "");
  const memoryDir = path.join(base, memoryDirName);

  const totalSteps = 5 + repos.length;

  // Configure git credential helper for HTTPS cloning
  configureGitCredentials(github_token);

  // 1. Clone fork
  ui.step(1, totalSteps, "Cloning egregore...");
  if (fs.existsSync(egregoreDir)) {
    ui.warn("egregore/ already exists — pulling latest");
    run("git pull", { cwd: egregoreDir });
  } else {
    execFileSync("git", ["clone", fork_url, egregoreDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
  }
  ui.success("Cloned egregore");

  // 2. Clone memory
  ui.step(2, totalSteps, "Cloning shared memory...");
  if (fs.existsSync(memoryDir)) {
    ui.warn(`${memoryDirName}/ already exists — pulling latest`);
    run("git pull", { cwd: memoryDir });
  } else {
    execFileSync("git", ["clone", memory_url, memoryDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
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

  // 4. Write .env (secrets only — never committed to git)
  ui.step(4, totalSteps, "Writing credentials...");
  const envPath = path.join(egregoreDir, ".env");
  const envLines = [`GITHUB_TOKEN=${github_token}`];
  if (api_key) envLines.push(`EGREGORE_API_KEY=${api_key}`);
  fs.writeFileSync(envPath, envLines.join("\n") + "\n", { mode: 0o600 });
  ui.success("Credentials saved");

  // 5. Register instance + shell alias
  ui.step(5, totalSteps, "Registering instance...");
  registerInstance(dirSlug, org_name, egregoreDir);
  const aliasName = await installShellAlias(egregoreDir, ui);

  // 6+. Clone managed repos (if any)
  const clonedRepos = [];
  for (let i = 0; i < repos.length; i++) {
    const repoName = repos[i];
    ui.step(6 + i, totalSteps, `Cloning ${repoName}...`);
    const repoDir = path.join(base, repoName);
    if (fs.existsSync(repoDir)) {
      ui.warn(`${repoName}/ already exists — pulling latest`);
      run("git pull", { cwd: repoDir });
    } else {
      const repoUrl = `https://github.com/${github_org}/${repoName}.git`;
      execFileSync("git", ["clone", repoUrl, repoDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
    }
    clonedRepos.push(repoName);
    ui.success(`Cloned ${repoName}`);
  }

  // Done
  console.log("");
  ui.success(`Egregore is ready for ${ui.bold(org_name)}`);
  console.log("");
  ui.info(`Your workspace:`);
  ui.info(`  ${ui.cyan(`./egregore-${dirSlug}/`)}  — Your Egregore instance`);
  ui.info(`  ${ui.cyan(`./${memoryDirName}/`)}     — Shared knowledge`);
  for (const repoName of clonedRepos) {
    ui.info(`  ${ui.cyan(`./${repoName}/`)}        — Managed repo`);
  }
  console.log("");
  ui.info(`Next: type ${ui.bold(aliasName)} in any terminal to start.`);
  console.log("");
}

function configureGitCredentials(token) {
  try {
    run("git config credential.helper store");
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

function registerInstance(slug, name, egregoreDir) {
  const registryDir = path.join(os.homedir(), ".egregore");
  const registryFile = path.join(registryDir, "instances.json");

  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }

  let instances = [];
  if (fs.existsSync(registryFile)) {
    try {
      instances = JSON.parse(fs.readFileSync(registryFile, "utf-8"));
    } catch {
      instances = [];
    }
  }

  const entry = { slug, name, path: egregoreDir };
  // Dedup by path (not slug) so multiple instances from the same org can coexist
  const idx = instances.findIndex((i) => i.path === egregoreDir);
  if (idx >= 0) {
    instances[idx] = entry;
  } else {
    instances.push(entry);
  }

  fs.writeFileSync(registryFile, JSON.stringify(instances, null, 2) + "\n");
}

async function installShellAlias(egregoreDir, ui) {
  const script = path.join(egregoreDir, "bin", "ensure-shell-function.sh");
  if (!fs.existsSync(script)) {
    ui.warn("Shell alias script not found — add alias manually.");
    return "egregore";
  }
  try {
    // Get recommended name
    const suggested = execSync(`bash "${script}" suggest`, { stdio: "pipe", encoding: "utf-8", timeout: 10000 }).trim();
    const defaultName = suggested || "egregore";

    // Ask user what they want to call it
    const answer = await ui.prompt(`Shell command name [${defaultName}]:`);
    const chosenName = answer || defaultName;

    // Install with chosen name
    const output = execSync(`bash "${script}" install "${chosenName}"`, { stdio: "pipe", encoding: "utf-8", timeout: 10000 }).trim();
    const aliasName = output || chosenName;
    ui.success(`Installed ${ui.dim(aliasName)} command`);
    return aliasName;
  } catch {
    ui.warn("Could not install shell alias — add it manually.");
    return "egregore";
  }
}

module.exports = { install };
