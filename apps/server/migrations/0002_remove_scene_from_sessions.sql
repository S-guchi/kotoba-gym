CREATE TABLE IF NOT EXISTS sessions_next (
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

INSERT INTO sessions_next (
  id,
  owner_key,
  title,
  raw_input,
  materials_json,
  conclusions_json,
  selected_conclusion_json,
  speech_plan_json,
  script_json,
  rehearsal_json,
  feedback_json,
  created_at,
  updated_at
)
SELECT
  id,
  owner_key,
  title,
  raw_input,
  materials_json,
  conclusions_json,
  selected_conclusion_json,
  speech_plan_json,
  script_json,
  rehearsal_json,
  feedback_json,
  created_at,
  updated_at
FROM sessions;

DROP TABLE sessions;

ALTER TABLE sessions_next RENAME TO sessions;

CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated
ON sessions (owner_key, updated_at DESC);
