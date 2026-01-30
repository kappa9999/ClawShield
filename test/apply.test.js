import test from "node:test";
import assert from "node:assert/strict";
import { applySafeProfile, buildSafeProfile } from "../src/apply.js";

test("buildSafeProfile includes gateway auth token", () => {
  const profile = buildSafeProfile("abc123");
  assert.equal(profile.gateway.auth.token, "abc123");
});

test("applySafeProfile merges keys", () => {
  const original = { gateway: { bind: "0.0.0.0" } };
  const result = applySafeProfile(original, "token");
  assert.equal(result.merged.gateway.bind, "loopback");
  assert.equal(result.merged.gateway.auth.token, "token");
});
