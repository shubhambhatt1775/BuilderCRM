-- Migration: Add lost_date field to leads table
-- This stores the exact timestamp when a lead was marked as "Not Interested"

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_date TIMESTAMP NULL DEFAULT NULL;

-- Backfill existing "Not Interested" leads:
-- Use updated_at as the lost_date for leads that were already marked as Not Interested
UPDATE leads 
SET lost_date = COALESCE(updated_at, created_at)
WHERE status = 'Not Interested' AND lost_date IS NULL;
