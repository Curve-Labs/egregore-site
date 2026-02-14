#!/usr/bin/env node

/**
 * create-egregore — Set up Egregore in one command.
 *
 * Two modes:
 *   npx create-egregore --token st_xxxx   (from website — primary path)
 *   npx create-egregore                    (terminal-only fallback)
 */

const ui = require("../lib/ui");
const { EgregoreAPI } = require("../lib/api");
const { deviceFlow } = require("../lib/auth");
const { install } = require("../lib/setup");

const API_URL = process.env.EGREGORE_API_URL || "https://egregore-production-55f2.up.railway.app";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--token" && argv[i + 1]) {
      args.token = argv[++i];
    } else if (argv[i].startsWith("--token=")) {
      args.token = argv[i].split("=")[1];
    } else if (argv[i] === "--api" && argv[i + 1]) {
      args.api = argv[++i];
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      args.help = true;
    }
  }
  return args;
}

function showHelp() {
  ui.banner();
  ui.info("Usage:");
  ui.info("  npx create-egregore --token <setup-token>   Install from website");
  ui.info("  npx create-egregore                          Interactive setup");
  ui.info("");
  ui.info("Options:");
  ui.info("  --token <token>   Setup token from egregore-core.netlify.app");
  ui.info("  --api <url>       API URL override");
  ui.info("  -h, --help        Show this help");
  ui.info("");
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const api = new EgregoreAPI(args.api || API_URL);

  ui.banner();

  if (args.token) {
    // ===== Website flow: token provided =====
    await tokenFlow(api, args.token);
  } else {
    // ===== Terminal fallback: interactive =====
    await interactiveFlow(api);
  }
}

async function tokenFlow(api, token) {
  const s = ui.spinner("Claiming setup token...");
  let data;
  try {
    data = await api.claimToken(token);
    s.stop(`Claimed — setting up ${ui.bold(data.org_name)}`);
  } catch (err) {
    s.fail("Token claim failed");
    ui.error(err.message);
    ui.info("");
    ui.info("The token may have expired or already been used.");
    ui.info("Visit egregore-core.netlify.app to get a new one, or run without --token:");
    ui.info("  npx create-egregore");
    process.exit(1);
  }

  try {
    await install(data, ui);
  } catch (err) {
    ui.error(`Install failed: ${err.message}`);
    process.exit(1);
  }
}

async function interactiveFlow(api) {
  // 1. GitHub auth
  ui.info("Let's set up Egregore. First, sign in with GitHub.\n");
  let githubToken;
  try {
    githubToken = await deviceFlow(ui);
    ui.success("Authenticated with GitHub");
  } catch (err) {
    ui.error(`GitHub auth failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Detect orgs
  console.log("");
  const s = ui.spinner("Checking your organizations...");
  let orgsData;
  try {
    orgsData = await api.getOrgs(githubToken);
    s.stop("Found your organizations");
  } catch (err) {
    s.fail("Failed to check organizations");
    ui.error(err.message);
    process.exit(1);
  }

  // 3. Build choices
  const choices = [];

  // Orgs with egregore → show each instance to join + option to set up another
  for (const org of orgsData.orgs) {
    if (org.has_egregore) {
      for (const inst of org.instances || []) {
        choices.push({
          label: `${org.name || org.login} — ${inst.org_name || inst.repo_name}`,
          description: "Join existing",
          action: "join",
          login: org.login,
          repo_name: inst.repo_name,
        });
      }
      choices.push({
        label: `${org.name || org.login} — new instance`,
        description: "Set up another",
        action: "setup",
        login: org.login,
      });
    }
  }

  // Orgs without egregore → set up
  for (const org of orgsData.orgs) {
    if (!org.has_egregore) {
      choices.push({
        label: org.name || org.login,
        description: "Set up new",
        action: "setup",
        login: org.login,
      });
    }
  }

  // Personal account — show join for each existing instance + setup for new
  if (orgsData.personal.has_egregore) {
    for (const inst of orgsData.personal.instances || []) {
      choices.push({
        label: `${orgsData.user.login} (personal) — ${inst.org_name || inst.repo_name}`,
        description: "Join existing",
        action: "join",
        login: orgsData.user.login,
        repo_name: inst.repo_name,
      });
    }
    choices.push({
      label: `${orgsData.user.login} (personal) — new instance`,
      description: "Set up another",
      action: "setup",
      login: orgsData.user.login,
      is_personal: true,
    });
  } else {
    choices.push({
      label: `${orgsData.user.login} (personal)`,
      description: "Set up personal",
      action: "setup",
      login: orgsData.user.login,
      is_personal: true,
    });
  }

  if (choices.length === 0) {
    ui.error("No organizations found. Check your GitHub permissions.");
    process.exit(1);
  }

  // 4. User picks
  const choice = await ui.choose("Where do you want Egregore?", choices);

  // 5. Execute
  console.log("");
  if (choice.action === "join") {
    await joinFlow(api, githubToken, choice);
  } else {
    await setupFlow(api, githubToken, choice);
  }
}

async function setupFlow(api, githubToken, choice) {
  const orgName = await ui.prompt(`Organization display name [${choice.login}]:`);
  const name = orgName || choice.login;

  // Instance name — determines repo names (egregore-{instance}, {instance}-memory)
  const instanceInput = await ui.prompt(`Instance name (e.g. "ops", "research") [leave blank for default]:`);
  const instanceName = instanceInput || undefined;

  // Repo picker — show org repos for selection
  let selectedRepos = [];
  try {
    const repoData = await api.getOrgRepos(githubToken, choice.login);
    if (repoData.repos && repoData.repos.length > 0) {
      selectedRepos = await ui.multiSelect(
        "Which repos should Egregore manage?",
        repoData.repos,
      );
    }
  } catch {
    // Non-fatal — continue without repos
  }

  const s = ui.spinner(`Setting up Egregore for ${ui.bold(name)}...`);
  try {
    const result = await api.setupOrg(githubToken, {
      github_org: choice.login,
      org_name: name,
      is_personal: choice.is_personal || false,
      repos: selectedRepos,
      instance_name: instanceName,
    });
    s.stop("Setup complete on GitHub");

    // Claim the token immediately
    const data = await api.claimToken(result.setup_token);
    await install(data, ui);

    if (result.telegram_invite_link) {
      console.log("");
      ui.info(`Connect Telegram (optional): ${result.telegram_invite_link}`);
    }
  } catch (err) {
    s.fail("Setup failed");
    ui.error(err.message);
    process.exit(1);
  }
}

async function joinFlow(api, githubToken, choice) {
  const displayName = choice.repo_name ? `${choice.login} (${choice.repo_name})` : choice.login;
  const s = ui.spinner(`Joining ${ui.bold(displayName)}...`);
  try {
    const result = await api.joinOrg(githubToken, {
      github_org: choice.login,
      repo_name: choice.repo_name,
    });
    s.stop("Joined");

    const data = await api.claimToken(result.setup_token);
    await install(data, ui);
  } catch (err) {
    s.fail("Join failed");
    ui.error(err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  ui.error(err.message);
  process.exit(1);
});
