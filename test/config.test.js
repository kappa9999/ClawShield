import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspacePath } from "../src/config.js";

test("resolveWorkspacePath respects agents.defaults.workspace", () => {
  const config = { agents: { defaults: { workspace: "/tmp/workspace" } } };
  const resolved = resolveWorkspacePath(config);
  assert.equal(resolved, "/tmp/workspace");
});
