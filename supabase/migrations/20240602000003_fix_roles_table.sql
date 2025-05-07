-- Fix the roles table insertion by removing the description column

-- First, check if the roles table exists and has the name column
DO $$
BEGIN
  -- Insert roles without the description column
  INSERT INTO roles (name)
  VALUES 
    ('admin'),
    ('manager'),
    ('team_member')
  ON CONFLICT (name) DO NOTHING;
END $$;
