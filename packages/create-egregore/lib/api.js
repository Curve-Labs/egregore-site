/**
 * Egregore API client.
 * Zero dependencies — uses node:https built-in.
 */

const https = require("node:https");
const { URL } = require("node:url");

const DEFAULT_API = "https://egregore-production-55f2.up.railway.app";

function request(method, url, { body, headers = {}, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      timeout,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(json.detail || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

class EgregoreAPI {
  constructor(baseUrl) {
    this.base = (baseUrl || DEFAULT_API).replace(/\/$/, "");
  }

  async claimToken(token) {
    return request("GET", `${this.base}/api/org/claim/${token}`);
  }

  async getOrgs(githubToken) {
    return request("GET", `${this.base}/api/org/setup/orgs`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
  }

  async getOrgRepos(githubToken, org) {
    return request("GET", `${this.base}/api/org/setup/repos?org=${encodeURIComponent(org)}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
  }

  async setupOrg(githubToken, { github_org, org_name, is_personal = false, repos = [], instance_name }) {
    const body = { github_org, org_name, is_personal, repos };
    if (instance_name) body.instance_name = instance_name;
    return request("POST", `${this.base}/api/org/setup`, {
      headers: { Authorization: `Bearer ${githubToken}` },
      body,
    });
  }

  async joinOrg(githubToken, { github_org, repo_name = "egregore-core" }) {
    return request("POST", `${this.base}/api/org/join`, {
      headers: { Authorization: `Bearer ${githubToken}` },
      body: { github_org, repo_name },
    });
  }

  async exchangeCode(code) {
    return request("POST", `${this.base}/api/auth/github/callback`, {
      body: { code },
    });
  }

  async getClientId() {
    return request("GET", `${this.base}/api/auth/github/client-id`);
  }
}

module.exports = { EgregoreAPI, request };
