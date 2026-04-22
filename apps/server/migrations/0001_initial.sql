CREATE TABLE IF NOT EXISTS profiles (
  owner_key TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  owner_key TEXT NOT NULL,
  id TEXT NOT NULL,
  prompt_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_key, id)
);

CREATE TABLE IF NOT EXISTS sessions (
  owner_key TEXT NOT NULL,
  id TEXT NOT NULL,
  session_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_key, id)
);

CREATE INDEX IF NOT EXISTS idx_prompts_owner_updated_at
  ON prompts(owner_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated_at
  ON sessions(owner_key, updated_at DESC);
