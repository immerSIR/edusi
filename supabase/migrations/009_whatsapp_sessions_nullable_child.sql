-- Allow whatsapp_sessions to exist before a child is selected
ALTER TABLE whatsapp_sessions ALTER COLUMN child_id DROP NOT NULL;
