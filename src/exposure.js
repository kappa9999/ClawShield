import os from "os";
import { execFile } from "child_process";

function exec(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: "utf8" }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

function parseLsof(output) {
  const lines = output.split("\n").filter(Boolean);
  const results = [];
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    const name = parts[0];
    const pid = parts[1];
    const idx = parts.findIndex((p) => p === "TCP");
    const addr = idx !== -1 ? parts[idx + 1] : "";
    if (addr) results.push({ name, pid, addr });
  }
  return results;
}

function parseNetstat(output) {
  const lines = output.split("\n").filter(Boolean);
  const results = [];
  for (const line of lines) {
    if (!/LISTEN|LISTENING/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const addr = parts[1] || parts[3] || "";
    if (addr) results.push({ addr, raw: line.trim() });
  }
  return results;
}

function isLoopbackAddr(addr) {
  const value = addr.toLowerCase();
  if (value.startsWith("127.")) return true;
  if (value.startsWith("localhost")) return true;
  if (value.startsWith("[::1]")) return true;
  if (value === "::1") return true;
  return false;
}

function isExposedAddr(addr) {
  const value = addr.toLowerCase();
  if (value.startsWith("*:")) return true;
  if (value.startsWith("0.0.0.0:")) return true;
  if (value.startsWith("[::]:")) return true;
  if (value.startsWith(":::")) return true;
  if (isLoopbackAddr(value)) return false;
  return true;
}

export async function checkExposure(port = 18789) {
  const portNum = port || 18789;

  // Prefer lsof on macOS
  const lsof = await exec("lsof", ["-nP", `-iTCP:${portNum}`, "-sTCP:LISTEN"]);
  if (lsof.ok && lsof.stdout) {
    const listeners = parseLsof(lsof.stdout);
    const exposed = listeners.filter((l) => isExposedAddr(l.addr));
    return {
      ok: exposed.length === 0,
      tool: "lsof",
      port: portNum,
      listeners
    };
  }

  // Fallback to netstat
  const netstat = os.platform() === "win32"
    ? await exec("netstat", ["-ano", "-p", "TCP"])
    : await exec("netstat", ["-an"]);

  if (netstat.ok && netstat.stdout) {
    const listeners = parseNetstat(netstat.stdout).filter((l) => l.addr.includes(`:${portNum}`));
    const exposed = listeners.filter((l) => isExposedAddr(l.addr));
    return {
      ok: exposed.length === 0,
      tool: "netstat",
      port: portNum,
      listeners
    };
  }

  return { ok: false, tool: "none", port: portNum, listeners: [], error: "Unable to detect listeners" };
}

export function formatExposure(report) {
  const lines = [];
  if (report.error) {
    lines.push(`Exposure check failed: ${report.error}`);
    return lines.join("\n");
  }

  if (!report.listeners.length) {
    lines.push(`No listeners detected on port ${report.port}.`);
    return lines.join("\n");
  }

  lines.push(`Listeners on port ${report.port} (${report.tool}):`);
  for (const l of report.listeners) {
    const addr = l.addr || l.raw || "";
    const status = isExposedAddr(addr) ? "EXPOSED" : "LOOPBACK";
    lines.push(`- ${addr} ${status}`);
  }

  return lines.join("\n");
}
