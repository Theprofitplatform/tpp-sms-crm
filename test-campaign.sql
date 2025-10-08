-- Test campaign functionality with SQL

-- Test 1: Count existing campaigns
SELECT '1. Count campaigns:' as test, COUNT(*) as count FROM campaigns;

-- Test 2: Create a test campaign
INSERT INTO campaigns (tenant_id, name, template_ids, status)
VALUES ('1b5019fb-1be6-47b9-908a-2b276ce43b17', 'SQL Test Campaign', '["3d5df277-b609-48c0-ad35-6f52797bf54e"]'::jsonb, 'draft')
RETURNING '2. Created campaign:' as test, id, name, status;

-- Test 3: Retrieve the campaign
SELECT '3. Retrieved campaign:' as test, id, name, status
FROM campaigns
WHERE name = 'SQL Test Campaign';