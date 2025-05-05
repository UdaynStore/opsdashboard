import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Home,
  Search,
  Settings,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import { supabase } from "../../../../supabase/supabase";
import { useTasks, TaskInstance } from "@/hooks/useTasks";

interface TopNavigationProps {
  onSearch?: (query: string) => void;
}

interface TaskNotification {
  id: string;
  title: string;
  type: "due_soon" | "overdue" | "completed" | "status_change";
  taskInstanceId: string;
  timestamp: string;
}

const TopNavigation = ({ onSearch = () => {} }: TopNavigationProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const { myTaskInstances, loading } = useTasks();

  useEffect(() => {
    if (!myTaskInstances || loading) return;

    const today = new Date();
    const notificationsList: TaskNotification[] = [];

    // Check for tasks due soon (within 24 hours)
    myTaskInstances.forEach((instance: TaskInstance) => {
      if (!instance.due_date || instance.status === "completed") return;

      const dueDate = new Date(instance.due_date);
      const timeDiff = dueDate.getTime() - today.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Task is due within 24 hours
      if (hoursDiff > 0 && hoursDiff <= 24) {
        notificationsList.push({
          id: `due_soon_${instance.id}`,
          title: `Task due soon: ${instance.task?.title}`,
          type: "due_soon",
          taskInstanceId: instance.id,
          timestamp: new Date().toISOString(),
        });
      }
      // Task is overdue
      else if (hoursDiff < 0) {
        notificationsList.push({
          id: `overdue_${instance.id}`,
          title: `Overdue task: ${instance.task?.title}`,
          type: "overdue",
          taskInstanceId: instance.id,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Sort notifications by timestamp (newest first)
    notificationsList.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setNotifications(notificationsList);
  }, [myTaskInstances, loading]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "due_soon":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "status_change":
        return <Bell className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: TaskNotification) => {
    navigate(`/tasks/${notification.taskInstanceId}`);
  };

  if (!user) return null;

  return (
    <div className="w-full h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <Link
          to="/"
          className="text-gray-900 hover:text-gray-700 transition-colors"
        >
          <Home className="h-5 w-5" />
        </Link>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 h-10 rounded-full bg-gray-100 border-0 text-sm focus:ring-2 focus:ring-gray-200 focus-visible:ring-gray-200 focus-visible:ring-offset-0"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full h-9 w-9 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Bell className="h-4 w-4 text-gray-700" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium border border-white">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl overflow-hidden p-2 border border-gray-200 shadow-lg w-72"
                >
                  <DropdownMenuLabel className="text-sm font-medium text-gray-900 px-2">
                    Task Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-gray-100" />
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="rounded-lg text-sm py-2 focus:bg-gray-100 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                notification.timestamp,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="text-center py-2 text-sm text-gray-500">
                      No new notifications
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent className="rounded-lg bg-gray-900 text-white text-xs px-3 py-1.5">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 hover:cursor-pointer rounded-full p-1 hover:bg-gray-100 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt={user.email || ""}
                />
                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm font-medium">
                {profile?.name || user.email}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-xl border-none shadow-lg"
          >
            <DropdownMenuLabel className="text-xs text-gray-500">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => signOut()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopNavigation;
