/** Codes are short-lived, single-use and limited to five guesses across restarts. */
export const personalRecoverySchemaSql = `
CREATE TABLE IF NOT EXISTS personal_password_recovery (
  profile_id integer PRIMARY KEY REFERENCES private_appointment_profiles(id) ON DELETE CASCADE,
  verified_email text,
  pending_email text,
  challenge_id text,
  code_hash text,
  purpose text,
  session_hash text,
  password_snapshot text,
  expires_at timestamptz,
  next_send_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);`;
