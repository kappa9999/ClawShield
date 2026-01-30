export function safeProfileSnippet(config = {}) {
  const gateway = config.gateway || {};
  const currentBind = gateway.bind || "(unset)";

  const snippet = {
    gateway: {
      bind: "loopback",
      auth: {
        mode: "token",
        token: "REPLACE_WITH_STRONG_TOKEN"
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

  return [
    "# Safe profile snippet (merge into openclaw.json)",
    `# Current gateway.bind: ${currentBind}`,
    JSON.stringify(snippet, null, 2)
  ].join("\n");
}
