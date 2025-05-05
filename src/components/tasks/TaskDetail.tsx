import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Clock, Link as LinkIcon, FileText } from "lucide-react";
import { TaskInstance } from "@/hooks/useTasks";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taskInstance, setTaskInstance] = useState<TaskInstance | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusComment, setStatusComment] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTaskInstance = async () => {
      try {
        setLoading(true);
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
          .eq("id", id)
          .single();

        if (error) throw error;
        setTaskInstance(data as TaskInstance);
        setNewStatus(data.status);
      } catch (error) {
        console.error("Error fetching task instance:", error);
        toast({
          title: "Error",
          description: "Could not load task details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTaskInstance();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!taskInstance || !user) return;

    try {
      setUpdatingStatus(true);

      // Update task instance status
      const { error: updateError } = await supabase
        .from("task_instances")
        .update({ status: newStatus })
        .eq("id", taskInstance.id);

      if (updateError) throw updateError;

      // Log status change
      const { error: logError } = await supabase
        .from("task_status_log")
        .insert({
          task_instance_id: taskInstance.id,
          old_status: taskInstance.status,
          new_status: newStatus,
          user_id: user.id,
          comments: statusComment || null,
          change_time: new Date().toISOString(),
        });

      if (logError) throw logError;

      // If status is completed or failed, log outcome
      if (newStatus === "completed" || newStatus === "failed") {
        const { error: outcomeError } = await supabase
          .from("task_outcome_log")
          .insert({
            task_instance_id: taskInstance.id,
            outcome: newStatus,
            comments: statusComment || null,
            completed_by_user_id: user.id,
            completion_time: new Date().toISOString(),
          });

        if (outcomeError) throw outcomeError;
      }

      toast({
        title: "Status updated",
        description: `Task status updated to ${newStatus}`,
      });

      // Refresh task instance data
      const { data: refreshedData, error: refreshError } = await supabase
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
        .eq("id", taskInstance.id)
        .single();

      if (refreshError) throw refreshError;
      setTaskInstance(refreshedData as TaskInstance);
      setStatusComment("");
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <span className="ml-2">Loading task details...</span>
      </div>
    );
  }

  if (!taskInstance || !taskInstance.task) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-medium">Task not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {taskInstance.task.title}
              </CardTitle>
              <div className="flex items-center mt-2">
                <Badge
                  variant="outline"
                  className={`mr-2 ${
                    taskInstance.status === "completed"
                      ? "bg-green-100"
                      : taskInstance.status === "failed"
                        ? "bg-red-100"
                        : taskInstance.status === "in-progress"
                          ? "bg-blue-100"
                          : taskInstance.status === "blocked"
                            ? "bg-yellow-100"
                            : "bg-gray-100"
                  }`}
                >
                  {taskInstance.status}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(taskInstance.due_date)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Task Description */}
          <div>
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-gray-700">
              {taskInstance.task.description || "No description provided"}
            </p>
          </div>

          <Separator />

          {/* RACI Assignments */}
          <div>
            <h3 className="text-lg font-medium mb-3">Task Assignments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Responsible */}
              <div className="flex items-center p-3 border rounded-lg">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${taskInstance.task.primary_responsible?.name || "unknown"}`}
                    alt={taskInstance.task.primary_responsible?.name}
                  />
                  <AvatarFallback>
                    {taskInstance.task.primary_responsible?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {taskInstance.task.primary_responsible?.name ||
                      "Unassigned"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Primary Responsible (R)
                  </p>
                </div>
              </div>

              {/* Accountable */}
              <div className="flex items-center p-3 border rounded-lg">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${taskInstance.task.accountable?.name || "unknown"}`}
                    alt={taskInstance.task.accountable?.name}
                  />
                  <AvatarFallback>
                    {taskInstance.task.accountable?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {taskInstance.task.accountable?.name || "Unassigned"}
                  </p>
                  <p className="text-sm text-gray-500">Accountable (A)</p>
                </div>
              </div>

              {/* Backup Responsible (if assigned) */}
              {taskInstance.task.backup_responsible && (
                <div className="flex items-center p-3 border rounded-lg">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${taskInstance.task.backup_responsible.name}`}
                      alt={taskInstance.task.backup_responsible.name}
                    />
                    <AvatarFallback>
                      {taskInstance.task.backup_responsible.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {taskInstance.task.backup_responsible.name}
                    </p>
                    <p className="text-sm text-gray-500">Backup Responsible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SOP Reference */}
          {taskInstance.task.sop && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-2">SOP Reference</h3>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  <a
                    href={taskInstance.task.sop.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    {taskInstance.task.sop.title}
                    <LinkIcon className="h-4 w-4 ml-1" />
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Update Status Section */}
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-4">Update Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                <Select
                  value={newStatus}
                  onValueChange={setNewStatus}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Textarea
                  placeholder="Add comments about this status change (optional)"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  disabled={updatingStatus}
                  className="h-[80px]"
                />
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={handleStatusUpdate}
              disabled={updatingStatus || newStatus === taskInstance.status}
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </div>

          {/* Status History */}
          {taskInstance.status_logs && taskInstance.status_logs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-3">Status History</h3>
                <div className="space-y-3">
                  {[...taskInstance.status_logs]
                    .sort((a, b) => {
                      return (
                        new Date(b.change_time || "").getTime() -
                        new Date(a.change_time || "").getTime()
                      );
                    })
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between">
                          <div>
                            <span className="font-medium">
                              {log.old_status || "Created"}
                            </span>{" "}
                            →{" "}
                            <span className="font-medium">
                              {log.new_status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.change_time
                              ? new Date(log.change_time).toLocaleString()
                              : ""}
                          </div>
                        </div>
                        {log.comments && (
                          <p className="text-sm mt-2">{log.comments}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
