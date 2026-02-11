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
  const { fork_url, memory_url, github_token, org_name, github_org, slug, api_key, repos = [], telegram_group_link } = data;
  const base = targetDir || process.cwd();

  // Directory name from fork URL (what git clone would use), e.g. "egregore-core"
  const forkDirName = fork_url.split("/").pop().replace(/\.git$/, "");
  const egregoreDir = path.join(base, forkDirName);
  const memoryDirName = memory_url
    .split("/")
    .pop()
    .replace(/\.git$/, "");
  const memoryDir = path.join(base, memoryDirName);

  const totalSteps = 5 + repos.length;

  // Configure git credential helper for HTTPS cloning
  configureGitCredentials(github_token);

  // Embed token in URLs as fallback for private repos (credential helper may not work)
  const authedForkUrl = embedToken(fork_url, github_token);
  const authedMemoryUrl = embedToken(memory_url, github_token);

  // 1. Clone fork
  ui.step(1, totalSteps, "Cloning egregore...");
  if (fs.existsSync(egregoreDir)) {
    ui.warn("egregore/ already exists — pulling latest");
    run("git pull", { cwd: egregoreDir });
  } else {
    execFileSync("git", ["clone", authedForkUrl, egregoreDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
    try { run(`git remote set-url origin ${fork_url}`, { cwd: egregoreDir }); } catch {}
  }
  ui.success("Cloned egregore");

  // 2. Clone memory
  ui.step(2, totalSteps, "Cloning shared memory...");
  if (fs.existsSync(memoryDir)) {
    ui.warn(`${memoryDirName}/ already exists — pulling latest`);
    run("git pull", { cwd: memoryDir });
  } else {
    execFileSync("git", ["clone", authedMemoryUrl, memoryDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
    try { run(`git remote set-url origin ${memory_url}`, { cwd: memoryDir }); } catch {}
  }
  ui.success("Cloned memory");

  // 3. Symlink (use junction on Windows — no admin required)
  ui.step(3, totalSteps, "Linking memory...");
  const symlinkTarget = path.join(egregoreDir, "memory");
  if (fs.existsSync(symlinkTarget)) {
    ui.warn("memory/ symlink already exists");
  } else {
    if (process.platform === "win32") {
      // Junctions require absolute paths on Windows
      fs.symlinkSync(path.resolve(memoryDir), symlinkTarget, "junction");
    } else {
      const relPath = path.relative(egregoreDir, memoryDir);
      fs.symlinkSync(relPath, symlinkTarget);
    }
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
  registerInstance(forkDirName, org_name, egregoreDir);
  const alias = await installShellAlias(egregoreDir, ui);

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
      execFileSync("git", ["clone", embedToken(repoUrl, github_token), repoDir], { stdio: "pipe", encoding: "utf-8", timeout: 60000 });
      try { run(`git remote set-url origin ${repoUrl}`, { cwd: repoDir }); } catch {}
    }
    clonedRepos.push(repoName);
    ui.success(`Cloned ${repoName}`);
  }

  // Done
  console.log("");
  ui.success(`Egregore is ready for ${ui.bold(org_name)}`);
  console.log("");
  ui.info(`Your workspace:`);
  ui.info(`  ${ui.cyan(`./${forkDirName}/`)}  — Your Egregore instance`);
  ui.info(`  ${ui.cyan(`./${memoryDirName}/`)}     — Shared knowledge`);
  for (const repoName of clonedRepos) {
    ui.info(`  ${ui.cyan(`./${repoName}/`)}        — Managed repo`);
  }
  if (telegram_group_link) {
    console.log("");
    ui.info(`Join the Telegram group for notifications:`);
    ui.info(`  ${ui.cyan(telegram_group_link)}`);
  }
  console.log("");
  ui.info(`Next: open a ${ui.bold("new terminal")} and type ${ui.bold(alias.aliasName)} to start.`);
  console.log("");
}

function embedToken(url, token) {
  try {
    return url.replace("https://github.com/", `https://x-access-token:${token}@github.com/`);
  } catch {
    return url;
  }
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
  try {
    // Detect shell profile
    const shell = path.basename(process.env.SHELL || "");
    let profile;
    if (shell === "zsh" && fs.existsSync(path.join(os.homedir(), ".zshrc"))) {
      profile = path.join(os.homedir(), ".zshrc");
    } else if (shell === "fish") {
      profile = path.join(os.homedir(), ".config", "fish", "config.fish");
    } else {
      for (const f of [".bash_profile", ".bashrc", ".profile"]) {
        const p = path.join(os.homedir(), f);
        if (fs.existsSync(p)) { profile = p; break; }
      }
    }
    if (!profile) {
      profile = path.join(os.homedir(), `.${shell || "bash"}rc`);
    }

    const profileFile = path.basename(profile);
    const aliasCmd = `cd "${egregoreDir}" && claude start`;
    const profileContent = fs.existsSync(profile) ? fs.readFileSync(profile, "utf-8") : "";

    // Check if this directory already has an alias
    let existing = "";
    if (profileContent.includes(egregoreDir)) {
      const match = profileContent.match(new RegExp(`^alias ([^=]+)='[^']*${egregoreDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "m"));
      if (match) existing = match[1];
    }

    // Recommend a name
    let defaultName;
    if (existing) {
      defaultName = existing;
    } else if (!profileContent.match(/^alias egregore=/m)) {
      defaultName = "egregore";
    } else {
      // Read slug from egregore.json in the cloned repo
      const configPath = path.join(egregoreDir, "egregore.json");
      let slug = "";
      if (fs.existsSync(configPath)) {
        try { slug = JSON.parse(fs.readFileSync(configPath, "utf-8")).slug || ""; } catch {}
      }
      defaultName = slug ? `egregore-${slug}` : "egregore-2";
    }

    // Ask user
    console.log("");
    ui.info(`This instance will be launched with a shell command.`);
    const answer = await ui.prompt(`Command name (Enter for ${ui.bold(defaultName)}):`);
    const aliasName = answer || defaultName;

    // Remove old alias for this directory
    let lines = profileContent.split("\n");
    lines = lines.filter((l) => !l.includes(egregoreDir));
    // Remove old alias with same name
    const isFish = profileFile.includes("fish");
    const aliasPattern = isFish ? `alias ${aliasName} ` : `alias ${aliasName}=`;
    lines = lines.filter((l) => !l.startsWith(aliasPattern));

    // Write new alias
    const aliasLine = isFish
      ? `alias ${aliasName} '${aliasCmd}'`
      : `alias ${aliasName}='${aliasCmd}'`;
    lines.push("", aliasLine);
    fs.writeFileSync(profile, lines.join("\n"));

    ui.success(`Added ${ui.dim(aliasName)} to ${profileFile}`);
    return { aliasName, profileFile };
  } catch {
    ui.warn("Could not install shell alias — add it manually.");
    return { aliasName: "egregore", profileFile: ".zshrc" };
  }
}

module.exports = { install };
