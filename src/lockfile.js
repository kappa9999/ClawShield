import fs from "fs";
import path from "path";
import crypto from "crypto";

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readJson(pathname) {
  try {
    return JSON.parse(fs.readFileSync(pathname, "utf8"));
  } catch {
    return null;
  }
}

function getSkillDirs(workspacePath, config = {}) {
  const dirs = [];
  const shared = path.join(process.env.HOME || process.env.USERPROFILE || "", ".openclaw", "skills");

  const defaultWorkspaceSkills = path.join(workspacePath, "skills");

  dirs.push(defaultWorkspaceSkills);
  dirs.push(shared);

  const extra = config?.skills?.load?.extraDirs || config?.skills?.extraDirs;
  if (Array.isArray(extra)) {
    for (const dir of extra) dirs.push(dir);
  }

  return [...new Set(dirs)].filter(Boolean);
}

function walkDir(root) {
  const files = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", ".clawdhub", ".clawshield", "dist"].includes(entry.name)) {
          continue;
        }
        stack.push(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }

  return files;
}

function hashSkillDir(skillPath) {
  const files = walkDir(skillPath).sort();
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    const rel = path.relative(skillPath, file);
    hash.update(rel);
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }

  return { hash: hash.digest("hex"), files: files.length };
}

function detectClawdHubLock(workspacePath) {
  const lockPath = path.join(workspacePath, ".clawdhub", "lock.json");
  if (!exists(lockPath)) return null;
  return readJson(lockPath);
}

function mapClawdHubSources(lockJson) {
  const map = new Map();
  if (!lockJson) return map;

  const skills = lockJson.skills || lockJson.packages || lockJson.items;
  if (Array.isArray(skills)) {
    for (const s of skills) {
      const name = s.name || s.slug || s.id;
      if (!name) continue;
      map.set(String(name), {
        name: s.name || name,
        version: s.version || s.tag || s.commit,
        source: s.source || s.registry || s.repo
      });
    }
  }

  return map;
}

export async function createLockfile({ config, workspacePath }) {
  const dirs = getSkillDirs(workspacePath, config);
  const clawdHubLock = detectClawdHubLock(workspacePath);
  const sources = mapClawdHubSources(clawdHubLock);

  const skills = [];

  for (const dir of dirs) {
    if (!exists(dir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(dir, entry.name);
      const skillDoc = path.join(skillPath, "SKILL.md");
      if (!exists(skillDoc)) continue;

      const { hash, files } = hashSkillDir(skillPath);
      const source = sources.get(entry.name) || null;
      skills.push({
        name: entry.name,
        path: skillPath,
        hash,
        files,
        source
      });
    }
  }

  const lock = {
    generatedAt: new Date().toISOString(),
    root: workspacePath,
    skills
  };

  const lockDir = path.join(workspacePath, ".clawshield");
  const lockPath = path.join(lockDir, "skills.lock.json");
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), "utf8");

  return { ok: true, path: lockPath, message: `Wrote ${skills.length} skills to ${lockPath}` };
}

export async function verifyLockfile({ config, workspacePath }) {
  const lockPath = path.join(workspacePath, ".clawshield", "skills.lock.json");
  if (!exists(lockPath)) {
    return { ok: false, output: `No lockfile found at ${lockPath}. Run: clawshield lock` };
  }

  const lock = readJson(lockPath) || { skills: [] };
  const expected = new Map();
  for (const skill of lock.skills || []) expected.set(skill.path, skill);

  const current = [];
  const dirs = getSkillDirs(workspacePath, config);
  for (const dir of dirs) {
    if (!exists(dir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(dir, entry.name);
      const skillDoc = path.join(skillPath, "SKILL.md");
      if (!exists(skillDoc)) continue;
      const { hash, files } = hashSkillDir(skillPath);
      current.push({ path: skillPath, name: entry.name, hash, files });
    }
  }

  const lines = [];
  let ok = true;

  for (const skill of current) {
    const record = expected.get(skill.path);
    if (!record) {
      ok = false;
      lines.push(`NEW  ${skill.name} (${skill.path})`);
      continue;
    }

    if (record.hash !== skill.hash) {
      ok = false;
      lines.push(`CHANGED ${skill.name} (${skill.path})`);
    } else {
      lines.push(`OK   ${skill.name} (${skill.path})`);
    }

    expected.delete(skill.path);
  }

  for (const missing of expected.values()) {
    ok = false;
    lines.push(`MISSING ${missing.name} (${missing.path})`);
  }

  const output = lines.length ? lines.join("\n") : "No skills found.";
  return { ok, output };
}
