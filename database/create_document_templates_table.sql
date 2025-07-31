-- Create document_templates table with all required columns
-- This script creates the complete table structure

-- Create the document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    field_tags JSONB NOT NULL, -- Array of {tag: string, label: string} objects
    content TEXT NOT NULL, -- Rich text content with placeholders
    settings JSONB DEFAULT '{}', -- Template formatting settings (font, margins, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_templates table
-- Users can only access templates from their company
CREATE POLICY "Users can access company templates" ON document_templates
    FOR ALL USING (
        company_id = (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_templates_company_id ON document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at 
    BEFORE UPDATE ON document_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 