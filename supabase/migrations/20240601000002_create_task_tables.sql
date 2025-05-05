-- ========= SOPs Table ==========

CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========= Task Definitions & Instances ==========

-- Task Templates
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  process_identifier TEXT,
  sop_id UUID REFERENCES sops(id) ON DELETE SET NULL,

  -- RACI + Backup Roles assigned to the template
  accountable_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  primary_responsible_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  backup_responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Recurrence Rules
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  recurring_schedule TEXT CHECK (is_recurring = false OR recurring_schedule IS NOT NULL),

  -- Deadline Definition
  deadline_type TEXT CHECK (deadline_type IN ('EOD', 'INTERVAL', 'NONE')),
  deadline_value TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Task Participants (Consulted / Informed roles)
CREATE TABLE IF NOT EXISTS task_participants (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participation_type TEXT NOT NULL CHECK (participation_type IN ('consulted', 'informed')),
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, user_id, participation_type)
);

-- Enable realtime for these tables
alter publication supabase_realtime add table sops;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_participants;
