import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const taskSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_schedule: z.string().optional(),
  deadline_type: z.string().optional(),
  deadline_value: z.string().optional(),
  primary_responsible_user_id: z.string({
    required_error: "Please select a primary responsible person",
  }),
  accountable_user_id: z.string({
    required_error: "Please select an accountable person",
  }),
  backup_responsible_user_id: z.string().optional(),
  sop_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TaskForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [sops, setSops] = useState<Array<{ id: string; title: string }>>([]);

  // Fetch users and SOPs on component mount
  useState(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, name")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(
        data.map((user) => ({
          id: user.user_id,
          name: user.name,
        })),
      );
    };

    const fetchSops = async () => {
      const { data, error } = await supabase.from("sops").select("id, title");

      if (error) {
        console.error("Error fetching SOPs:", error);
        return;
      }

      setSops(data);
    };

    fetchUsers();
    fetchSops();
  }, []);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      is_recurring: false,
      recurring_schedule: "",
      deadline_type: "days",
      deadline_value: "",
      primary_responsible_user_id: "",
      accountable_user_id: "",
      backup_responsible_user_id: "",
      sop_id: "",
    },
  });

  const isRecurring = form.watch("is_recurring");

  async function onSubmit(values: TaskFormValues) {
    if (!user) return;

    setLoading(true);
    try {
      // Create the task
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: values.title,
          description: values.description,
          is_recurring: values.is_recurring,
          recurring_schedule: values.is_recurring
            ? values.recurring_schedule
            : null,
          deadline_type: values.deadline_type,
          deadline_value: values.deadline_value,
          primary_responsible_user_id: values.primary_responsible_user_id,
          accountable_user_id: values.accountable_user_id,
          backup_responsible_user_id: values.backup_responsible_user_id || null,
          sop_id: values.sop_id || null,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial task instance if not recurring
      if (!values.is_recurring && data) {
        const { error: instanceError } = await supabase
          .from("task_instances")
          .insert({
            task_template_id: data.id,
            status: "assigned",
            due_date: calculateDueDate(
              values.deadline_type,
              values.deadline_value,
            ),
          });

        if (instanceError) throw instanceError;
      }

      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "There was an error creating your task.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function calculateDueDate(type?: string, value?: string): string | null {
    if (!type || !value) return null;

    const now = new Date();
    const valueNum = parseInt(value);

    if (isNaN(valueNum)) return null;

    switch (type) {
      case "days":
        now.setDate(now.getDate() + valueNum);
        break;
      case "weeks":
        now.setDate(now.getDate() + valueNum * 7);
        break;
      case "months":
        now.setMonth(now.getMonth() + valueNum);
        break;
      default:
        return null;
    }

    return now.toISOString();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">Create New Task</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter task title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter task description"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deadline_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deadline type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 7" {...field} />
                  </FormControl>
                  <FormDescription>
                    Time until deadline from now
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Recurring Task</FormLabel>
                  <FormDescription>
                    This task will repeat based on the schedule
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isRecurring && (
            <FormField
              control={form.control}
              name="recurring_schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurrence Pattern</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence pattern" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="primary_responsible_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Responsible (R)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary responsible person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Person who will perform the task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountable_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accountable (A)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select accountable person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Person ultimately answerable for the task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="backup_responsible_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backup Responsible</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select backup responsible person (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Backup person who can perform the task if needed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sop_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SOP Reference</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select SOP (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sops.map((sop) => (
                      <SelectItem key={sop.id} value={sop.id}>
                        {sop.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Standard Operating Procedure for this task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
