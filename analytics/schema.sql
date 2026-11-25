CREATE TABLE IF NOT EXISTS counts (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  model TEXT NOT NULL,
  total INTEGER NOT NULL,
  PRIMARY KEY (day, event, model)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
