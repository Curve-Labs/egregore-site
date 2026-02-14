/**
 * GitHub Device Flow authentication.
 * Zero dependencies — uses node:https built-in.
 */

const https = require("node:https");

const CLIENT_ID = "Ov23lizB4nYEeIRsHTdb";
const SCOPE = "repo,admin:org";

function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = new URLSearchParams(body).toString();
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch {
            reject(new Error(buf));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openBrowser(url) {
  const { execFile } = require("node:child_process");
  if (process.platform === "darwin") {
    execFile("open", [url], () => {});
  } else if (process.platform === "win32") {
    execFile("cmd", ["/c", "start", "", url], () => {});
  } else {
    execFile("xdg-open", [url], () => {});
  }
}

function copyToClipboard(text) {
  const { execSync } = require("node:child_process");
  try {
    if (process.platform === "darwin") {
      execSync("pbcopy", { input: text, stdio: ["pipe", "ignore", "ignore"] });
      return true;
    }
    execSync("xclip -selection clipboard", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run GitHub Device Flow.
 * Returns the access token string, or throws on failure.
 */
async function deviceFlow(ui) {
  // 1. Request device code
  const codeResp = await post("https://github.com/login/device/code", {
    client_id: CLIENT_ID,
    scope: SCOPE,
  });

  if (!codeResp.device_code) {
    throw new Error("Failed to start GitHub device flow");
  }

  const { device_code, user_code, verification_uri, interval: pollInterval } = codeResp;
  const verifyUrl = codeResp.verification_uri_complete || verification_uri;

  // 2. Show code + open browser
  const copied = copyToClipboard(user_code);
  ui.info("");
  if (copied) {
    ui.info(`Code copied to clipboard: ${ui.bold(user_code)}`);
  } else {
    ui.info(`Your code: ${ui.bold(user_code)}`);
  }
  ui.info("Opening browser — paste the code and authorize.");
  ui.info("");
  openBrowser(verifyUrl);

  // 3. Poll for token
  let interval = (pollInterval || 5) * 1000;
  const timeout = 300000; // 5 minutes
  const start = Date.now();

  while (Date.now() - start < timeout) {
    await sleep(interval);

    const tokenResp = await post("https://github.com/login/oauth/access_token", {
      client_id: CLIENT_ID,
      device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    if (tokenResp.access_token) {
      return tokenResp.access_token;
    }

    if (tokenResp.error === "authorization_pending") {
      continue;
    }
    if (tokenResp.error === "slow_down") {
      interval += 5000;
      continue;
    }

    throw new Error(tokenResp.error_description || tokenResp.error || "Auth failed");
  }

  throw new Error("Timed out waiting for authorization (5 minutes)");
}

module.exports = { deviceFlow };
