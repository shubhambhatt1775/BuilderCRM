-- Migration: Add whatsapp_status field to leads table
-- This migration adds the missing whatsapp_status field that tracks WhatsApp sending status

USE builder_crm;

-- Add whatsapp_status field to leads table
ALTER TABLE leads
ADD COLUMN whatsapp_status VARCHAR(20) DEFAULT 'Not Configured' AFTER whatsapp_greeting_sent_at;

-- Add index for whatsapp_status to improve query performance
CREATE INDEX idx_leads_whatsapp_status ON leads(whatsapp_status);

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at)
VALUES ('add_whatsapp_status_field', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

SELECT 'WhatsApp status field added to leads table successfully' as status;
