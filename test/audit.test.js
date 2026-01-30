import test from "node:test";
import assert from "node:assert/strict";
import { runAudit } from "../src/audit.js";

const baseConfig = {
  gateway: {
    bind: "0.0.0.0",
    auth: { mode: "none" },
    controlUi: { enabled: true }
  },
  agents: { defaults: { sandbox: { mode: "off" } } },
  session: { dmScope: "open" }
};

test("audit flags non-loopback without auth", () => {
  const report = runAudit(baseConfig, { configPath: "openclaw.json" });
  const levels = report.findings.map((f) => f.level);
  assert.ok(levels.includes("fail"));
});

test("audit passes when bind is loopback", () => {
  const report = runAudit({ gateway: { bind: "loopback" } }, {});
  const pass = report.findings.find((f) => f.title.includes("Gateway bind"));
  assert.ok(pass);
});
