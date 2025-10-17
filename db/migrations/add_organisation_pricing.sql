-- Add pricing fields to churches (organisations) table
-- This migration adds monthly fixed fee and per-character pricing

ALTER TABLE churches
ADD COLUMN IF NOT EXISTS monthly_fee_gbp DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_per_character_gbp DECIMAL(10, 8) DEFAULT 0.00002;

-- Add comments to explain the fields
COMMENT ON COLUMN churches.monthly_fee_gbp IS 'Monthly fixed fee in GBP (£) for this organisation';
COMMENT ON COLUMN churches.price_per_character_gbp IS 'Price per character in GBP (£) for translation services. Default: £0.00002 = £20 per million characters';

-- Update existing organisations with default pricing (£20 per million characters + £0 monthly fee)
-- This matches the current hardcoded pricing
UPDATE churches 
SET 
  monthly_fee_gbp = 0.00,
  price_per_character_gbp = 0.00002
WHERE monthly_fee_gbp IS NULL OR price_per_character_gbp IS NULL;
