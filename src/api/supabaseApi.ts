import { supabase } from "../../supabase/supabase";
import { Tables } from "@/types/supabase";

// User API
export const userApi = {
  // Get current user profile
  getCurrentUserProfile: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user roles
  getUserRoles: async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", userId);

    if (error) throw error;
    return data.map((role) => role.roles.name);
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    const { data, error } = await supabase.from("user_profiles").select("*");

    if (error) throw error;
    return data;
  },

  // Update user profile
  updateUserProfile: async (
    userId: string,
    updates: Partial<Tables<"user_profiles">>,
  ) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Task API
export const taskApi = {
  // Create a new task
  createTask: async (taskData: Partial<Tables<"tasks">>) => {
    const { data, error } = await supabase
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all tasks
  getAllTasks: async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        primary_responsible:primary_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        accountable:accountable_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        backup_responsible:backup_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        sop:sop_id(title, link)
      `,
      )
      .eq("is_active", true);

    if (error) throw error;
    return data;
  },

  // Get tasks for a specific user
  getUserTasks: async (userId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        primary_responsible:primary_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        accountable:accountable_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        backup_responsible:backup_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
        sop:sop_id(title, link)
      `,
      )
      .eq("is_active", true)
      .or(
        `primary_responsible_user_id.eq.${userId},accountable_user_id.eq.${userId},backup_responsible_user_id.eq.${userId}`,
      );

    if (error) throw error;
    return data;
  },

  // Update a task
  updateTask: async (taskId: string, updates: Partial<Tables<"tasks">>) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a task (soft delete by setting is_active to false)
  deleteTask: async (taskId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .update({ is_active: false })
      .eq("id", taskId);

    if (error) throw error;
    return data;
  },
};

// Task Instance API
export const taskInstanceApi = {
  // Create a new task instance
  createTaskInstance: async (
    instanceData: Partial<Tables<"task_instances">>,
  ) => {
    const { data, error } = await supabase
      .from("task_instances")
      .insert(instanceData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all task instances
  getAllTaskInstances: async () => {
    const { data, error } = await supabase.from("task_instances").select(`
        *,
        task:task_template_id(*),
        status_logs:task_status_log(*)
      `);

    if (error) throw error;
    return data;
  },

  // Get a specific task instance
  getTaskInstance: async (instanceId: string) => {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        *,
        task:task_template_id(
          *,
          primary_responsible:primary_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
          accountable:accountable_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
          backup_responsible:backup_responsible_user_id(name:user_profiles!inner(name), user_id:user_profiles!inner(user_id)),
          sop:sop_id(title, link)
        ),
        status_logs:task_status_log(*)
      `,
      )
      .eq("id", instanceId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update task instance status
  updateTaskInstanceStatus: async (
    instanceId: string,
    newStatus: string,
    userId: string,
    comments?: string,
  ) => {
    // Start a transaction
    const { data: taskInstance, error: fetchError } = await supabase
      .from("task_instances")
      .select("status")
      .eq("id", instanceId)
      .single();

    if (fetchError) throw fetchError;

    // Update task instance status
    const { error: updateError } = await supabase
      .from("task_instances")
      .update({ status: newStatus })
      .eq("id", instanceId);

    if (updateError) throw updateError;

    // Log status change
    const { error: logError } = await supabase.from("task_status_log").insert({
      task_instance_id: instanceId,
      old_status: taskInstance.status,
      new_status: newStatus,
      user_id: userId,
      comments: comments || null,
      change_time: new Date().toISOString(),
    });

    if (logError) throw logError;

    // If status is completed or failed, log outcome
    if (newStatus === "completed" || newStatus === "failed") {
      const { error: outcomeError } = await supabase
        .from("task_outcome_log")
        .insert({
          task_instance_id: instanceId,
          outcome: newStatus,
          comments: comments || null,
          completed_by_user_id: userId,
          completion_time: new Date().toISOString(),
        });

      if (outcomeError) throw outcomeError;
    }

    return true;
  },
};

// Team API
export const teamApi = {
  // Get all teams
  getAllTeams: async () => {
    const { data, error } = await supabase.from("teams").select("*");

    if (error) throw error;
    return data;
  },

  // Create a new team
  createTeam: async (teamData: Partial<Tables<"teams">>) => {
    const { data, error } = await supabase
      .from("teams")
      .insert(teamData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a team
  updateTeam: async (teamId: string, updates: Partial<Tables<"teams">>) => {
    const { data, error } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// SOP API
export const sopApi = {
  // Get all SOPs
  getAllSops: async () => {
    const { data, error } = await supabase.from("sops").select("*");

    if (error) throw error;
    return data;
  },

  // Create a new SOP
  createSop: async (sopData: Partial<Tables<"sops">>) => {
    const { data, error } = await supabase
      .from("sops")
      .insert(sopData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
