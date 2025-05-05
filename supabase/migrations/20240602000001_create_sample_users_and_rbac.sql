-- Create sample users with different roles

-- First, create the roles if they don't exist already
INSERT INTO roles (name, description)
VALUES 
  ('admin', 'Administrator with full access'),
  ('manager', 'Manager with team management access'),
  ('team_member', 'Regular team member')
ON CONFLICT (name) DO NOTHING;

-- Create sample teams
INSERT INTO teams (name, description)
VALUES 
  ('Engineering', 'Engineering team'),
  ('Operations', 'Operations team'),
  ('Marketing', 'Marketing team')
ON CONFLICT (name) DO NOTHING;

-- Create sample users
-- Note: These are dummy users. In production, users would be created through the auth system
-- and their profiles would be created separately.

-- Get role IDs
DO $$
DECLARE
  admin_role_id UUID;
  manager_role_id UUID;
  team_member_role_id UUID;
  engineering_team_id UUID;
  operations_team_id UUID;
  marketing_team_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  SELECT id INTO manager_role_id FROM roles WHERE name = 'manager' LIMIT 1;
  SELECT id INTO team_member_role_id FROM roles WHERE name = 'team_member' LIMIT 1;
  
  -- Get team IDs
  SELECT id INTO engineering_team_id FROM teams WHERE name = 'Engineering' LIMIT 1;
  SELECT id INTO operations_team_id FROM teams WHERE name = 'Operations' LIMIT 1;
  SELECT id INTO marketing_team_id FROM teams WHERE name = 'Marketing' LIMIT 1;
  
  -- Create admin user profile if it doesn't exist
  INSERT INTO user_profiles (user_id, name, team_id, is_active)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Admin User', engineering_team_id, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create manager user profiles
  INSERT INTO user_profiles (user_id, name, team_id, is_active)
  VALUES 
    ('00000000-0000-0000-0000-000000000002', 'Engineering Manager', engineering_team_id, true),
    ('00000000-0000-0000-0000-000000000003', 'Operations Manager', operations_team_id, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create team member user profiles
  INSERT INTO user_profiles (user_id, name, team_id, is_active)
  VALUES 
    ('00000000-0000-0000-0000-000000000004', 'Engineer One', engineering_team_id, true),
    ('00000000-0000-0000-0000-000000000005', 'Engineer Two', engineering_team_id, true),
    ('00000000-0000-0000-0000-000000000006', 'Operations Specialist', operations_team_id, true),
    ('00000000-0000-0000-0000-000000000007', 'Marketing Specialist', marketing_team_id, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign roles to users
  -- Admin
  INSERT INTO user_roles (user_id, role_id, assigned_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', admin_role_id, NOW())
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  -- Managers
  INSERT INTO user_roles (user_id, role_id, assigned_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000002', manager_role_id, NOW()),
    ('00000000-0000-0000-0000-000000000003', manager_role_id, NOW())
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  -- Team members
  INSERT INTO user_roles (user_id, role_id, assigned_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000004', team_member_role_id, NOW()),
    ('00000000-0000-0000-0000-000000000005', team_member_role_id, NOW()),
    ('00000000-0000-0000-0000-000000000006', team_member_role_id, NOW()),
    ('00000000-0000-0000-0000-000000000007', team_member_role_id, NOW())
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
END $$;

-- Enable Row Level Security on tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_outcome_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks table
DROP POLICY IF EXISTS "Admins can do everything" ON tasks;
CREATE POLICY "Admins can do everything"
  ON tasks
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can do everything" ON tasks;
CREATE POLICY "Managers can do everything"
  ON tasks
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'manager'
    )
  );

DROP POLICY IF EXISTS "Users can view tasks they are assigned to" ON tasks;
CREATE POLICY "Users can view tasks they are assigned to"
  ON tasks
  FOR SELECT
  USING (
    primary_responsible_user_id = auth.uid() OR
    accountable_user_id = auth.uid() OR
    backup_responsible_user_id = auth.uid()
  );

-- Create policies for task_instances table
DROP POLICY IF EXISTS "Admins can do everything" ON task_instances;
CREATE POLICY "Admins can do everything"
  ON task_instances
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can do everything" ON task_instances;
CREATE POLICY "Managers can do everything"
  ON task_instances
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'manager'
    )
  );

DROP POLICY IF EXISTS "Users can view and update task instances they are assigned to" ON task_instances;
CREATE POLICY "Users can view and update task instances they are assigned to"
  ON task_instances
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_instances.task_template_id AND
      (t.primary_responsible_user_id = auth.uid() OR
       t.accountable_user_id = auth.uid() OR
       t.backup_responsible_user_id = auth.uid())
    )
  );

-- Create policies for user_profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can do everything" ON user_profiles;
CREATE POLICY "Admins can do everything"
  ON user_profiles
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Add realtime support for tables
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_instances;
alter publication supabase_realtime add table task_status_log;
alter publication supabase_realtime add table task_outcome_log;
alter publication supabase_realtime add table user_profiles;