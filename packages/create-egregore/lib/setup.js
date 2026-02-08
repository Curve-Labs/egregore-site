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
  const { fork_url, memory_url, github_token, org_name, github_org, slug, api_key } = data;
  const base = targetDir || process.cwd();

  const dirSlug = (github_org || slug || "egregore").toLowerCase();
  const egregoreDir = path.join(base, `egregore-${dirSlug}`);
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

  // 5. Register instance + shell function
  ui.step(5, totalSteps, "Registering instance...");
  registerInstance(dirSlug, org_name, egregoreDir);
  installShellFunction(ui);

  // Done
  console.log("");
  ui.success(`Egregore is ready for ${ui.bold(org_name)}`);
  console.log("");
  ui.info(`Your workspace:`);
  ui.info(`  ${ui.cyan(`./egregore-${dirSlug}/`)}  — Your Egregore instance`);
  ui.info(`  ${ui.cyan(`./${memoryDirName}/`)}     — Shared knowledge`);
  console.log("");
  ui.info(`Next: type ${ui.bold("egregore")} in any terminal to start.`);
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
  const idx = instances.findIndex((i) => i.slug === slug);
  if (idx >= 0) {
    instances[idx] = entry;
  } else {
    instances.push(entry);
  }

  fs.writeFileSync(registryFile, JSON.stringify(instances, null, 2) + "\n");
}

const SHELL_FUNCTION = [
  "",
  "# Egregore",
  "egregore() {",
  '  local registry="$HOME/.egregore/instances.json"',
  '  if [ ! -f "$registry" ] || [ ! -s "$registry" ]; then',
  '    echo "No Egregore instances found. Run: npx create-egregore"',
  "    return 1",
  "  fi",
  "  local -a names paths",
  "  local i=0",
  "  while IFS=$'\\t' read -r slug name epath; do",
  '    if [ -d "$epath" ]; then',
  '      names[$i]="$name"',
  '      paths[$i]="$epath"',
  "      i=$((i + 1))",
  "    fi",
  "  done < <(jq -r '.[] | [.slug, .name, .path] | @tsv' \"$registry\" 2>/dev/null)",
  "  local count=$i",
  '  if [ "$count" -eq 0 ]; then',
  '    echo "No Egregore instances found. Run: npx create-egregore"',
  "    return 1",
  "  fi",
  '  if [ "$count" -eq 1 ]; then',
  '    cd "${paths[0]}" && claude start',
  "    return",
  "  fi",
  '  echo ""',
  '  echo "  Which Egregore?"',
  '  echo ""',
  "  for ((j=0; j<count; j++)); do",
  '    echo "  $((j + 1)). ${names[$j]}"',
  "  done",
  '  echo ""',
  "  local choice",
  '  printf "  Pick [1-%d]: " "$count"',
  "  read -r choice",
  '  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$count" ]; then',
  '    echo "  Invalid choice."',
  "    return 1",
  "  fi",
  '  cd "${paths[$((choice - 1))]}" && claude start',
  "}",
  "",
].join("\n");

function installShellFunction(ui) {
  const profiles = [
    path.join(os.homedir(), ".zshrc"),
    path.join(os.homedir(), ".bashrc"),
    path.join(os.homedir(), ".bash_profile"),
  ];

  const profile = profiles.find((p) => fs.existsSync(p));
  if (!profile) {
    ui.warn("No shell profile found — add the egregore function manually.");
    return;
  }

  const existing = fs.readFileSync(profile, "utf-8");

  // Already installed
  if (existing.includes("egregore()")) {
    ui.success(`${ui.dim("egregore")} command already installed`);
    return;
  }

  // Append the shell function (never rewrite the file — avoids profile corruption)
  fs.appendFileSync(profile, SHELL_FUNCTION);
  ui.success(`Installed ${ui.dim("egregore")} command in ${path.basename(profile)}`);

  // If old alias exists, warn but don't remove — let the function take precedence
  if (existing.includes("alias egregore=")) {
    ui.warn("Old egregore alias found — the new function takes precedence. You can remove the alias manually.");
  }
}

module.exports = { install };
