-- Add settings column to existing document_templates table
-- This script should be run if the table already exists without the settings column

-- Add settings column with default empty JSON object
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Update existing records to have empty settings if they don't have any
UPDATE document_templates 
SET settings = '{}' 
WHERE settings IS NULL; 