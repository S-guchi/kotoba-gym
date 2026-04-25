CREATE TABLE IF NOT EXISTS personas (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO personas (id, name, description, emoji, created_at) VALUES
  ('persona-new-member', '新メンバー', '最近チームに加わったばかりで、プロジェクトの背景知識が少ない。', '🧑‍💻', '2026-04-23T00:00:00.000Z'),
  ('persona-interviewer', '面接官', '技術的な深さと論理的な説明力を重視する採用担当。', '👔', '2026-04-23T00:00:00.000Z'),
  ('persona-manager', '上司', 'ビジネスインパクトと優先度を気にするマネージャー。', '📊', '2026-04-23T00:00:00.000Z'),
  ('persona-non-engineer', '非エンジニア', '技術用語に馴染みがなく、平易な言葉での説明を求める。', '🙋', '2026-04-23T00:00:00.000Z');
