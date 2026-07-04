-- EWA Website Revamp — new clean schema (Neon Postgres)
-- Applied to the NEW isolated Neon DB. Safe to re-run (idempotent-ish for dev):
-- drops nothing by default; see reset-schema flag in apply-schema.mjs.

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Clubs -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  website_url  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,   -- drives the custom "spirit" order
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_clubs_updated ON clubs;
CREATE TRIGGER trg_clubs_updated BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Payment methods -------------------------------------------------------------
-- zelle: `value` is the full enroll.zellepay.com QR URL; `display_token` is the
-- human-readable email/phone shown as text fallback beside the QR.
-- others: `value` is the provider payment URL (link-out button, no QR).
CREATE TABLE IF NOT EXISTS payment_methods (
  id            SERIAL PRIMARY KEY,
  club_id       INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('zelle','stripe','paypal','venmo','other')),
  label         TEXT,
  value         TEXT NOT NULL,
  display_token TEXT,               -- zelle only: email/phone for the text fallback
  qr_settings   JSONB,              -- zelle only: size/margin/color/error-correction
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_club ON payment_methods(club_id);

-- News ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  body         TEXT,
  tag          TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_news_updated ON news;
CREATE TRIGGER trg_news_updated BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Officers --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS officers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT,
  email       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Resources -------------------------------------------------------------------
-- Points to EITHER an external url OR a stored artifact (artifact_id).
CREATE TABLE IF NOT EXISTS resources (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT,
  artifact_id  INTEGER,            -- FK added after artifacts table below
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Users (admins only) ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,     -- bcrypt; never plaintext
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Artifacts (small binaries: logo, occasional PDF) ----------------------------
CREATE TABLE IF NOT EXISTS artifacts (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL,
  mime_type   TEXT,
  bytes       BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- resources.artifact_id -> artifacts.id (nullable; set null on artifact delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_resources_artifact'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT fk_resources_artifact
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Fundraiser (single active row) ----------------------------------------------
CREATE TABLE IF NOT EXISTS fundraiser (
  id           SERIAL PRIMARY KEY,
  headline     TEXT,
  goal_cents   INTEGER NOT NULL DEFAULT 0,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_fundraiser_updated ON fundraiser;
CREATE TRIGGER trg_fundraiser_updated BEFORE UPDATE ON fundraiser
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
