-- Migration: Remove theme customization system
-- Date: 2026-01-09
-- Description: Remove tenant_customization table and theme-related columns
-- Reason: Unified Vivoo-inspired design system replaces theme customization

-- Drop tenant_customization table
DROP TABLE IF EXISTS tenant_customization;

-- Note: We keep the table structure in case we need to restore data,
-- but the application will no longer use theme_preset values.
-- All pages will use the unified Vivoo-inspired design system.
