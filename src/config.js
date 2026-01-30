import fs from "fs";
import os from "os";
import path from "path";
import JSON5 from "json5";

export function resolveConfigPath(overridePath) {
  if (overridePath) return overridePath;
  if (process.env.OPENCLAW_CONFIG_PATH) return process.env.OPENCLAW_CONFIG_PATH;
  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

export function loadConfig(configPath) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON5.parse(raw);
    return { config, error: null };
  } catch (error) {
    return { config: {}, error: error?.message || String(error) };
  }
}

export function resolveWorkspacePath(config = {}) {
  const base = path.join(os.homedir(), ".openclaw");

  const explicit =
    config?.agents?.defaults?.workspace ||
    config?.workspace;

  if (explicit) return explicit;

  return path.join(base, "workspace");
}
