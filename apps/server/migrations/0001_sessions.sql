CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  materials_json TEXT,
  conclusions_json TEXT NOT NULL DEFAULT '[]',
  selected_conclusion_json TEXT,
  speech_plan_json TEXT,
  script_json TEXT,
  rehearsal_json TEXT,
  feedback_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated
ON sessions (owner_key, updated_at DESC);
