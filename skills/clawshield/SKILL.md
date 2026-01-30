# ClawShield Skill

Use this skill to audit OpenClaw setups and check for risky exposure.

## Capabilities
- Run a security audit of the OpenClaw config.
- Check if the gateway port is exposed on non-loopback interfaces.
- Generate a safe profile snippet to apply manually.
- Apply a safe profile (opt-in, creates a backup).
- Verify skills against a lockfile for tampering.

## Usage
When asked to audit or harden OpenClaw, run:
- `clawshield audit`
- `clawshield exposure`
- `clawshield profile safe`
- `clawshield apply safe --write --token <token>`
- `clawshield lock` (first-time)
- `clawshield verify`

If the user wants changes, provide the exact config patch and ask for confirmation before applying.
