-- Migration: Add WhatsApp greeting fields to leads table
-- This migration adds fields to track WhatsApp greeting status and timestamp

USE builder_crm;

-- Add WhatsApp greeting tracking fields to leads table
ALTER TABLE leads 
ADD COLUMN phone VARCHAR(20) AFTER sender_email,
ADD COLUMN whatsapp_greeting_sent BOOLEAN DEFAULT FALSE AFTER phone,
ADD COLUMN whatsapp_greeting_sent_at TIMESTAMP NULL AFTER whatsapp_greeting_sent,
ADD COLUMN source VARCHAR(50) DEFAULT 'email' AFTER whatsapp_greeting_sent_at;

-- Add index for phone number to improve query performance
CREATE INDEX idx_leads_phone ON leads(phone);

-- Add index for WhatsApp greeting status to improve query performance
CREATE INDEX idx_leads_whatsapp_greeting_sent ON leads(whatsapp_greeting_sent);

-- Add index for source field to improve query performance
CREATE INDEX idx_leads_source ON leads(source);

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('add_whatsapp_greeting_fields', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT 'WhatsApp greeting fields added to leads table successfully' as status;
