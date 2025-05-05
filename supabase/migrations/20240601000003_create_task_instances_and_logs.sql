-- Task Instances (Actual work items generated from tasks)
CREATE TABLE IF NOT EXISTS task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  instance_identifier TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'blocked')) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========= Logging Tables (Per Instance) ==========

-- Task Status Log (History of status changes for an instance)
CREATE TABLE IF NOT EXISTS task_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_instance_id UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    change_time TIMESTAMPTZ DEFAULT now(),
    comments TEXT
);

-- Task Outcome Log (Final result of an instance)
CREATE TABLE IF NOT EXISTS task_outcome_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_instance_id UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE UNIQUE,
    completed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'failed')),
    completion_time TIMESTAMPTZ NOT NULL,
    comments TEXT,
    logged_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for these tables
alter publication supabase_realtime add table task_instances;
alter publication supabase_realtime add table task_status_log;
alter publication supabase_realtime add table task_outcome_log;
