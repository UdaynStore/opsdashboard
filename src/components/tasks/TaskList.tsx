import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";
import { useTasks, Task, TaskInstance } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  PlusCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function TaskList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, myTasks, myTaskInstances, refetch } = useTasks();
  const [activeTab, setActiveTab] = useState("today");

  // Filter tasks for today
  const todayTasks = myTaskInstances.filter((instance) => {
    if (!instance.due_date) return false;
    const dueDate = new Date(instance.due_date);
    const today = new Date();
    return (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    );
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-gray-200 text-gray-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "blocked":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return <Clock className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  // Handle task click
  const handleTaskClick = (taskInstance: TaskInstance) => {
    navigate(`/tasks/${taskInstance.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">My Tasks</h2>
        <Button onClick={() => navigate("/tasks/new")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">
            Today
            <Badge variant="secondary" className="ml-2">
              {todayTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            All Tasks
            <Badge variant="secondary" className="ml-2">
              {myTaskInstances.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          {todayTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No tasks due today
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {todayTasks.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onClick={() => handleTaskClick(instance)}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {myTaskInstances.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No tasks assigned to you
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myTaskInstances.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onClick={() => handleTaskClick(instance)}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TaskCardProps {
  instance: TaskInstance;
  onClick: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  formatDate: (date: string | null) => string;
}

function TaskCard({
  instance,
  onClick,
  getStatusColor,
  getStatusIcon,
  formatDate,
}: TaskCardProps) {
  if (!instance.task) return null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{instance.task.title}</CardTitle>
          <Badge className={getStatusColor(instance.status)}>
            <span className="flex items-center">
              {getStatusIcon(instance.status)}
              <span className="ml-1 capitalize">{instance.status}</span>
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
          {instance.task.description || "No description"}
        </p>

        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-400 mr-1" />
            <span>{formatDate(instance.due_date)}</span>
          </div>

          {instance.task.primary_responsible && (
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${instance.task.primary_responsible.name}`}
                  alt={instance.task.primary_responsible.name}
                />
                <AvatarFallback>
                  {instance.task.primary_responsible.name[0]}
                </AvatarFallback>
              </Avatar>
              <span>{instance.task.primary_responsible.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
