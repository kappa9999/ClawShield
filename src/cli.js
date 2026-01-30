#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import { loadConfig, resolveConfigPath, resolveWorkspacePath } from "./config.js";
import { runAudit, formatAuditReport } from "./audit.js";
import { createLockfile, verifyLockfile } from "./lockfile.js";
import { checkExposure, formatExposure } from "./exposure.js";
import { safeProfileSnippet } from "./profile.js";
import { applySafeProfile, formatApplyReport, writeConfig } from "./apply.js";
import { defaultLaunchAgentPath, renderLaunchAgent } from "./launchagent.js";

const program = new Command();

program
  .name("clawshield")
  .description("Security preflight and guardrails for OpenClaw/Moltbot")
  .version("0.1.0");

program
  .command("paths")
  .description("Show detected config and workspace paths")
  .option("--config <path>", "Override config path")
  .action((opts) => {
    const configPath = resolveConfigPath(opts.config);
    const { config } = loadConfig(configPath);
    const workspacePath = resolveWorkspacePath(config);
    console.log("Config:", configPath);
    console.log("Workspace:", workspacePath);
  });

program
  .command("audit")
  .description("Audit OpenClaw config for common security risks")
  .option("--config <path>", "Override config path")
  .option("--json", "Output JSON")
  .action((opts) => {
    const configPath = resolveConfigPath(opts.config);
    const { config, error } = loadConfig(configPath);
    const report = runAudit(config, { configPath, error });

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(formatAuditReport(report));
  });

program
  .command("profile")
  .description("Show safe profile snippets")
  .argument("<name>", "Profile name (safe)")
  .option("--config <path>", "Override config path")
  .action((name, opts) => {
    if (name !== "safe") {
      console.error("Unknown profile:", name);
      process.exitCode = 1;
      return;
    }

    const configPath = resolveConfigPath(opts.config);
    const { config } = loadConfig(configPath);
    const snippet = safeProfileSnippet(config);
    console.log(snippet);
  });

program
  .command("apply")
  .description("Apply a safe profile to openclaw.json (opt-in)")
  .argument("<name>", "Profile name (safe)")
  .option("--config <path>", "Override config path")
  .option("--token <token>", "Set gateway auth token in the profile")
  .option("--write", "Write changes to the config file")
  .option("--force", "Allow writing even if config read fails")
  .action((name, opts) => {
    if (name !== "safe") {
      console.error("Unknown profile:", name);
      process.exitCode = 1;
      return;
    }

    const configPath = resolveConfigPath(opts.config);
    const { config, error } = loadConfig(configPath);

    if (error && !opts.force) {
      console.error(`Config read failed: ${error}`);
      console.error("Use --force to write a new config.");
      process.exitCode = 1;
      return;
    }

    const report = applySafeProfile(config, opts.token);

    if (opts.write) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      let backupPath = null;
      if (fs.existsSync(configPath)) {
        backupPath = `${configPath}.bak-${stamp}`;
        fs.copyFileSync(configPath, backupPath);
      }
      writeConfig(configPath, report.merged);
      if (backupPath) console.log(`Backup: ${backupPath}`);
    }

    console.log(formatApplyReport(report, configPath, opts.write));
    if (!opts.write) {
      console.log("Use --write to apply these changes.");
    }
  });

program
  .command("lock")
  .description("Create or update a skills lockfile")
  .option("--config <path>", "Override config path")
  .action(async (opts) => {
    const configPath = resolveConfigPath(opts.config);
    const { config } = loadConfig(configPath);
    const workspacePath = resolveWorkspacePath(config);
    const result = await createLockfile({ config, workspacePath });
    console.log(result.message);
  });

program
  .command("verify")
  .description("Verify skills against the lockfile")
  .option("--config <path>", "Override config path")
  .action(async (opts) => {
    const configPath = resolveConfigPath(opts.config);
    const { config } = loadConfig(configPath);
    const workspacePath = resolveWorkspacePath(config);
    const report = await verifyLockfile({ config, workspacePath });
    console.log(report.output);
    if (!report.ok) process.exitCode = 2;
  });

program
  .command("launchagent")
  .description("Create a macOS LaunchAgent plist for clawshield watch")
  .option("--label <label>", "LaunchAgent label", "com.clawshield.watch")
  .option("--bin <path>", "Path to clawshield binary", "/usr/local/bin/clawshield")
  .option("--interval <seconds>", "Watch interval in seconds", (v) => parseInt(v, 10), 30)
  .option("--write <path>", "Write plist to the specified path")
  .action((opts) => {
    const plist = renderLaunchAgent({
      label: opts.label,
      bin: opts.bin,
      interval: opts.interval
    });

    if (opts.write) {
      fs.writeFileSync(opts.write, plist, "utf8");
      console.log(`Wrote LaunchAgent to ${opts.write}`);
      return;
    }

    console.log(plist);
    const suggested = defaultLaunchAgentPath(opts.label);
    console.log(`Suggested path: ${suggested}`);
  });

program
  .command("exposure")
  .description("Check if the OpenClaw gateway is exposed")
  .option("--port <port>", "Override gateway port", (v) => parseInt(v, 10))
  .action(async (opts) => {
    const report = await checkExposure(opts.port);
    console.log(formatExposure(report));
    if (!report.ok) process.exitCode = 2;
  });

program
  .command("watch")
  .description("Continuously watch gateway exposure")
  .option("--port <port>", "Override gateway port", (v) => parseInt(v, 10))
  .option("--interval <seconds>", "Check interval in seconds", (v) => parseInt(v, 10), 30)
  .action(async (opts) => {
    const intervalMs = Math.max(5, opts.interval) * 1000;
    console.log(`Watching gateway exposure every ${Math.max(5, opts.interval)}s. Press Ctrl+C to stop.`);

    const tick = async () => {
      const report = await checkExposure(opts.port);
      console.log(formatExposure(report));
    };

    await tick();
    setInterval(tick, intervalMs);
  });

program.parse();

