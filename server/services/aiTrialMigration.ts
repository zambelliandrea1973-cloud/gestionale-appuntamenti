export const aiTrialSchemaSql = `
  CREATE TABLE IF NOT EXISTS ai_trial_usage (
    user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    appointment_conversations integer NOT NULL DEFAULT 0 CHECK (appointment_conversations >= 0),
    marketing_requests integer NOT NULL DEFAULT 0 CHECK (marketing_requests >= 0)
  );
  CREATE TABLE IF NOT EXISTS ai_trial_conversations (
    id uuid PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    interpretation_requests integer NOT NULL DEFAULT 0,
    speech_requests integer NOT NULL DEFAULT 0,
    speech_characters integer NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS ai_trial_conversations_user_idx ON ai_trial_conversations(user_id);
`;