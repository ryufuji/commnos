-- ============================================
-- Add Stripe fields to tenant_memberships
-- ============================================

-- Add Stripe Customer ID
ALTER TABLE tenant_memberships ADD COLUMN stripe_customer_id TEXT;

-- Add Stripe Subscription ID
ALTER TABLE tenant_memberships ADD COLUMN stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_stripe_subscription 
ON tenant_memberships(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_stripe_customer 
ON tenant_memberships(stripe_customer_id);
