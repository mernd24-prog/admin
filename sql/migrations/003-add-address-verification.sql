-- Add address verification to KYC tables

ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE seller_kyc ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}'::jsonb;