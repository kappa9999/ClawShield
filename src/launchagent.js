import os from "os";
import path from "path";

export function defaultLaunchAgentPath(label) {
  const home = os.homedir();
  return path.join(home, "Library", "LaunchAgents", `${label}.plist`);
}

export function renderLaunchAgent({
  label = "com.clawshield.watch",
  bin = "/usr/local/bin/clawshield",
  interval = 30
} = {}) {
  const intervalValue = Math.max(5, Number(interval) || 30);

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">",
    "<plist version=\"1.0\">",
    "<dict>",
    `  <key>Label</key><string>${label}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    `    <string>${bin}</string>`,
    "    <string>watch</string>",
    "    <string>--interval</string>",
    `    <string>${intervalValue}</string>`,
    "  </array>",
    "  <key>RunAtLoad</key><true/>",
    "  <key>KeepAlive</key><true/>",
    "</dict>",
    "</plist>",
    ""
  ].join("\n");
}
