CREATE TABLE IF NOT EXISTS stats (
  day  TEXT NOT NULL,              -- 'YYYY-MM-DD', po Europe/Zagreb
  page TEXT NOT NULL,              -- npr. 'oee-kalkulator', 'vodic-5s', 'index', '*' za cijelu stranicu
  ev   TEXT NOT NULL,              -- vrsta dogadjaja
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, page, ev)
);
