-- Migration: Add resolution column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution TEXT;
