-- Migration: Add missed follow-up fields to leads table
-- This migration adds fields to track missed follow-up status and last follow-up timestamp

USE builder_crm;

-- Add missed follow-up tracking fields to leads table
ALTER TABLE leads 
ADD COLUMN missed_followup_sent BOOLEAN DEFAULT FALSE AFTER whatsapp_greeting_sent_at,
ADD COLUMN last_followup_at TIMESTAMP NULL AFTER missed_followup_sent;

-- Add index for missed follow-up status to improve query performance
CREATE INDEX idx_leads_missed_followup_sent ON leads(missed_followup_sent);

-- Add index for last follow-up timestamp to improve query performance
CREATE INDEX idx_leads_last_followup_at ON leads(last_followup_at);

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('add_missed_followup_fields', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Missed follow-up fields added to leads table successfully' as status;
