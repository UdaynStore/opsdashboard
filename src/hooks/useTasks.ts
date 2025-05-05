import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabase";
import { useAuth } from "../../supabase/auth";
import { Tables } from "@/types/supabase";

export type Task = Tables<"tasks"> & {
  primary_responsible: { name: string; user_id: string } | null;
  accountable: { name: string; user_id: string } | null;
  backup_responsible: { name: string; user_id: string } | null;
  sop: { title: string; link: string } | null;
};

export type TaskInstance = Tables<"task_instances"> & {
  task: Task | null;
  status_logs: Tables<"task_status_log">[];
};

export function useTasks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([]);
  const [myTaskInstances, setMyTaskInstances] = useState<TaskInstance[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setTasks([]);
      setMyTasks([]);
      setTaskInstances([]);
      setMyTaskInstances([]);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);

        // Fetch all tasks with related data
        const { data: tasksData, error: tasksError } = await supabase
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

        if (tasksError) throw tasksError;

        // Fetch task instances with related data
        const { data: instancesData, error: instancesError } =
          await supabase.from("task_instances").select(`
            *,
            task:task_template_id(*),
            status_logs:task_status_log(*)
          `);

        if (instancesError) throw instancesError;

        // Set all tasks and instances
        setTasks(tasksData as Task[]);
        setTaskInstances(instancesData as TaskInstance[]);

        // Filter tasks where the user is involved
        const myTasksFiltered = tasksData.filter(
          (task: Task) =>
            task.primary_responsible?.user_id === user.id ||
            task.accountable?.user_id === user.id ||
            task.backup_responsible?.user_id === user.id,
        );

        setMyTasks(myTasksFiltered as Task[]);

        // Filter task instances related to my tasks
        const myTaskIds = myTasksFiltered.map((task) => task.id);
        const myInstancesFiltered = instancesData.filter(
          (instance: TaskInstance) =>
            myTaskIds.includes(instance.task_template_id),
        );

        setMyTaskInstances(myInstancesFiltered as TaskInstance[]);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error fetching tasks"),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  return {
    loading,
    error,
    tasks,
    myTasks,
    taskInstances,
    myTaskInstances,
    refetch: () => {
      if (user) {
        setLoading(true);
        // This will trigger the useEffect to run again
        setTasks([]);
      }
    },
  };
}
