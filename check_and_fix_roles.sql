-- Check current roles for all users in test tenant
SELECT 
    u.email,
    u.nickname,
    tm.role,
    tm.status,
    t.subdomain,
    t.name as tenant_name
FROM tenant_memberships tm
JOIN users u ON tm.user_id = u.id
JOIN tenants t ON tm.tenant_id = t.id
WHERE t.subdomain = 'test';

-- Update rfujimoto0616@gmail.com to owner role if needed
-- First, find the user and tenant IDs
-- UPDATE tenant_memberships
-- SET role = 'owner'
-- WHERE user_id = (SELECT id FROM users WHERE email = 'rfujimoto0616@gmail.com')
--   AND tenant_id = (SELECT id FROM tenants WHERE subdomain = 'test');
