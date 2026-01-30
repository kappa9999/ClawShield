import os from "os";

function isLoopbackBind(bind) {
  if (!bind) return null;
  const value = String(bind).toLowerCase();
  if (value === "loopback" || value === "localhost") return true;
  if (value.startsWith("127.")) return true;
  if (value === "::1") return true;
  if (value === "0.0.0.0" || value === "::" || value === "*") return false;
  if (value === "lan" || value === "tailnet" || value === "public") return false;
  return null;
}

function getDmPolicy(channel = {}) {
  return channel.dmPolicy || channel.dm?.policy || channel.dm?.dmPolicy;
}

function groupRequiresMention(group = {}) {
  return group.requireMention === true || group.mentionRequired === true;
}

export function runAudit(config = {}, meta = {}) {
  const findings = [];
  const add = (level, title, details, fix) => {
    findings.push({ level, title, details, fix });
  };

  if (meta.error) {
    add(
      "warn",
      "Config not readable",
      `Could not read config at ${meta.configPath}: ${meta.error}`,
      "Set OPENCLAW_CONFIG_PATH or fix file permissions."
    );
  }

  const gateway = config.gateway || {};
  const bind = gateway.bind;
  const bindIsLoopback = isLoopbackBind(bind);
  const authMode = gateway.auth?.mode;
  const authToken = gateway.auth?.token || gateway.auth?.password;
  const controlUi = gateway.controlUi?.enabled;

  if (bindIsLoopback === false) {
    if (!authMode || authMode === "none") {
      add(
        "fail",
        "Gateway bound to non-loopback without auth",
        `gateway.bind=${bind || "(unset)"} and gateway.auth.mode is not set. This can expose your control panel to your network or internet.`,
        "Set gateway.bind=loopback or set gateway.auth.mode=token with a strong token."
      );
    } else if (!authToken) {
      add(
        "warn",
        "Gateway auth enabled without token/password",
        "gateway.auth.mode is set, but no token/password is present.",
        "Set gateway.auth.token (or password) to a strong value."
      );
    }

    if (controlUi === true) {
      add(
        "warn",
        "Control UI enabled on non-loopback",
        "gateway.controlUi.enabled is true while gateway.bind is non-loopback.",
        "Disable control UI or bind to loopback."
      );
    }
  } else if (bindIsLoopback === true) {
    add(
      "pass",
      "Gateway bind is loopback",
      `gateway.bind=${bind || "loopback"} keeps control UI local.`
    );
  } else {
    add(
      "info",
      "Gateway bind is not explicitly set",
      `gateway.bind is ${bind ?? "unset"}.`,
      "Consider setting gateway.bind=loopback for safety."
    );
  }

  const sessionDmScope = config.session?.dmScope;
  if (!sessionDmScope) {
    add(
      "info",
      "No session dmScope configured",
      "session.dmScope is not set.",
      "Consider setting session.dmScope=pairing for safer DM routing."
    );
  }

  const channels = config.channels || {};
  const channelNames = Object.keys(channels);
  if (channelNames.length === 0) {
    add(
      "info",
      "No channels configured",
      "channels is empty or missing.",
      "Skip channel-level checks."
    );
  }

  for (const name of channelNames) {
    const channel = channels[name] || {};
    const dmPolicy = getDmPolicy(channel);

    if (dmPolicy && dmPolicy !== "pairing") {
      add(
        "warn",
        `Channel ${name}: DM policy is not pairing`,
        `dmPolicy=${dmPolicy}`,
        "Set dmPolicy=pairing to require DM pairing."
      );
    } else if (dmPolicy === "pairing") {
      add(
        "pass",
        `Channel ${name}: DM policy is pairing`,
        ""
      );
    }

    const groups = channel.groups;
    if (groups && typeof groups === "object") {
      const groupKeys = Array.isArray(groups) ? [] : Object.keys(groups);
      for (const key of groupKeys) {
        const group = groups[key] || {};
        if (!groupRequiresMention(group)) {
          add(
            "warn",
            `Channel ${name} group ${key}: mention not required`,
            "Group chats without mention gating can be noisy or risky.",
            "Set requireMention=true for group chats."
          );
          break;
        }
      }
    }
  }

  const sandboxMode = config?.agents?.defaults?.sandbox?.mode;
  if (!sandboxMode || sandboxMode === "off") {
    add(
      "warn",
      "Non-main agents sandbox is not enabled",
      `agents.defaults.sandbox.mode=${sandboxMode ?? "unset"}`,
      "Set agents.defaults.sandbox.mode=non-main to restrict non-main agents."
    );
  } else if (sandboxMode === "non-main" || sandboxMode === "all") {
    add(
      "pass",
      "Non-main agents sandbox enabled",
      `agents.defaults.sandbox.mode=${sandboxMode}`
    );
  }

  const tools = config.tools || {};
  const deny = tools.deny;
  const allow = tools.allow;
  const profile = tools.profile;
  const hasPolicy =
    (Array.isArray(deny) && deny.length > 0) ||
    (Array.isArray(allow) && allow.length > 0) ||
    Boolean(profile);

  if (!hasPolicy) {
    add(
      "info",
      "No tool restriction policy configured",
      "tools.allow/tools.deny/tools.profile are not set.",
      "Consider restricting tools for non-main agents."
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    host: os.hostname(),
    findings
  };
}

export function formatAuditReport(report) {
  const lines = [];
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const f of report.findings) {
    counts[f.level] = (counts[f.level] || 0) + 1;
  }

  lines.push(`Audit results: ${counts.fail} fail, ${counts.warn} warn, ${counts.info} info, ${counts.pass} pass`);
  lines.push("");

  for (const f of report.findings) {
    const label = f.level.toUpperCase().padEnd(4, " ");
    lines.push(`[${label}] ${f.title}`);
    if (f.details) lines.push(`  ${f.details}`);
    if (f.fix) lines.push(`  Fix: ${f.fix}`);
    lines.push("");
  }

  return lines.join("\n");
}
