---
title: Setup
description: Install and configure Egregore for your team
---

There are two paths to set up Egregore: **Founder** (creating a new organization) and **Joiner** (joining an existing one).

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- GitHub account
- Terminal access (macOS, Linux, or Windows with WSL)

## Founder Path

If you're setting up Egregore for your team for the first time:

### 1. Install Egregore

```bash
npx create-egregore
```

This will:
- Download the Egregore CLI
- Authenticate with GitHub
- Create a memory repository for your organization
- Configure the shared graph connection

### 2. Organization Setup

You'll be prompted to:
- Choose your GitHub organization (or personal account)
- Name your Egregore instance
- Set up the initial configuration

### 3. Invite Your Team

Once set up, team members can join using the same install command. They'll automatically connect to your shared memory.

## Joiner Path

If someone on your team has already set up Egregore:

### 1. Get the Invite

Ask your team for the organization's Egregore repository URL.

### 2. Install

```bash
npx create-egregore
```

The installer will detect you're joining an existing organization and:
- Clone the shared configuration
- Authenticate with GitHub
- Connect to the team's memory and graph

### 3. Start Working

Run `egregore` to start your first session. You'll see recent team activity and can begin contributing immediately.

## Configuration Files

Egregore uses two configuration files:

| File | Purpose | Committed? |
|------|---------|------------|
| `egregore.json` | Org config (name, repos, API URL) | Yes |
| `.env` | Personal tokens (GitHub, API key) | No (gitignored) |

## Troubleshooting

### GitHub Authentication Failed

Re-run authentication:
```bash
bash bin/github-auth.sh
```

### Can't Access Memory Repository

Ask your team admin to add you as a collaborator on the memory repo.

### Graph Connection Failed

Check your API key in `.env` and verify network connectivity.
