ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_token_hash text;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_sent_at timestamp;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_expires_at timestamp;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_opened_at timestamp;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_clicked_at timestamp;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS recovery_offer_used_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS licenses_recovery_offer_token_hash_idx
  ON licenses (recovery_offer_token_hash)
  WHERE recovery_offer_token_hash IS NOT NULL;