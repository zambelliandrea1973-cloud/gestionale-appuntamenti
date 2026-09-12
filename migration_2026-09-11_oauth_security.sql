-- OAuth security remediation. Safe to run repeatedly.
-- Apply manually during the database rollout; this file is not executed by
-- application startup.

CREATE TABLE IF NOT EXISTS oauth_transactions (
  id serial PRIMARY KEY,
  state_hash varchar(64) NOT NULL UNIQUE,
  owner_user_id integer NOT NULL,
  purpose varchar(64) NOT NULL,
  account_mode varchar(32) NOT NULL DEFAULT 'primary',
  redirect_uri text NOT NULL,
  app_origin text NOT NULL,
  return_path text,
  expires_at timestamp NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  metadata jsonb,
  claimed_at timestamp,
  completed_at timestamp,
  failed_at timestamp,
  failure_code varchar(64),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_transactions_state_hash_idx
  ON oauth_transactions (state_hash);
CREATE INDEX IF NOT EXISTS oauth_transactions_owner_status_idx
  ON oauth_transactions (owner_user_id, status);
CREATE INDEX IF NOT EXISTS oauth_transactions_expires_at_idx
  ON oauth_transactions (expires_at);

-- Older rehearsal databases may have the table without the opener origin.
ALTER TABLE oauth_transactions
  ADD COLUMN IF NOT EXISTS app_origin text;
-- Transactions are short-lived handoffs, not user data. Rows created by an
-- incomplete rehearsal cannot be completed safely without their original
-- opener origin, so discard only those unusable rows.
DELETE FROM oauth_transactions
  WHERE app_origin IS NULL;
ALTER TABLE oauth_transactions
  ALTER COLUMN app_origin SET NOT NULL;

-- Do not delete or merge account rows automatically. If duplicates exist this
-- statement fails so they can be reviewed before enforcing uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS google_accounts_user_email_unique
  ON google_accounts (user_id, email);