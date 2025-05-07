-- Fix for user creation - create auth.users entries first

-- Create users in auth.users table first
DO $$
BEGIN
  -- Insert users into auth.users if they don't exist
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'eng.manager@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', 'ops.manager@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000004', 'engineer1@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000005', 'engineer2@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000006', 'ops.specialist@example.com', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000007', 'marketing@example.com', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

EXCEPTION WHEN OTHERS THEN
  -- If there's an error, log it but continue
  RAISE NOTICE 'Error creating users: %', SQLERRM;
END $$;