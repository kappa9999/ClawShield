import fs from "fs";
import JSON5 from "json5";

function deepMerge(target, source) {
  if (Array.isArray(source)) return source.slice();
  if (source && typeof source === "object") {
    const out = { ...(target && typeof target === "object" ? target : {}) };
    for (const [key, value] of Object.entries(source)) {
      out[key] = deepMerge(out[key], value);
    }
    return out;
  }
  return source;
}

function diffKeys(before, after, prefix = "") {
  const changes = [];
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const b = before ? before[key] : undefined;
    const a = after ? after[key] : undefined;

    if (b && typeof b === "object" && !Array.isArray(b) && a && typeof a === "object" && !Array.isArray(a)) {
      changes.push(...diffKeys(b, a, path));
      continue;
    }

    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes.push({ path, before: b, after: a });
    }
  }

  return changes;
}

export function buildSafeProfile(token) {
  return {
    gateway: {
      bind: "loopback",
      auth: {
        mode: "token",
        token: token || "REPLACE_WITH_STRONG_TOKEN"
      }
    },
    session: {
      dmScope: "pairing"
    },
    agents: {
      defaults: {
        sandbox: {
          mode: "non-main"
        }
      }
    }
  };
}

export function applySafeProfile(config, token) {
  const safe = buildSafeProfile(token);
  const merged = deepMerge(config || {}, safe);
  const changes = diffKeys(config || {}, merged);
  return { merged, changes };
}

export function writeConfig(configPath, config) {
  const payload = JSON5.stringify(config, null, 2);
  fs.writeFileSync(configPath, payload, "utf8");
}

export function formatApplyReport(report, configPath, writeMode) {
  const lines = [];
  lines.push(writeMode ? "Applied safe profile." : "Dry run (no changes written)." );
  lines.push(`Config: ${configPath}`);

  if (!report.changes.length) {
    lines.push("No changes needed.");
    return lines.join("\n");
  }

  lines.push("Changes:");
  for (const change of report.changes) {
    const before = change.before === undefined ? "(unset)" : JSON.stringify(change.before);
    const after = JSON.stringify(change.after);
    lines.push(`- ${change.path}: ${before} -> ${after}`);
  }

  return lines.join("\n");
}
