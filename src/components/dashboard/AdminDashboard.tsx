import { useState, useEffect } from "react";
import { useAuth } from "../../../supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { userApi, teamApi, taskApi } from "@/api/supabaseApi";
import { Tables } from "@/types/supabase";
import {
  Users,
  UserPlus,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

type UserWithRoles = Tables<"user_profiles"> & {
  roles: string[];
};

type TeamWithMembers = Tables<"teams"> & {
  memberCount: number;
};

export default function AdminDashboard() {
  const { isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
  });
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users with roles
        const usersData = await userApi.getAllUsers();
        const usersWithRoles = await Promise.all(
          usersData.map(async (user) => {
            const roles = await userApi.getUserRoles(user.user_id);
            return { ...user, roles };
          }),
        );
        setUsers(usersWithRoles as UserWithRoles[]);

        // Fetch teams
        const teamsData = await teamApi.getAllTeams();
        const teamsWithMembers = await Promise.all(
          teamsData.map(async (team) => {
            // Count members in each team
            const memberCount = usersData.filter(
              (user) => user.team_id === team.id,
            ).length;
            return { ...team, memberCount };
          }),
        );
        setTeams(teamsWithMembers as TeamWithMembers[]);

        // Fetch task statistics
        const tasks = await taskApi.getAllTasks();
        const taskInstances = await taskApi.getAllTaskInstances();

        const now = new Date();
        const completedCount = taskInstances.filter(
          (instance) => instance.status === "completed",
        ).length;
        const inProgressCount = taskInstances.filter(
          (instance) => instance.status === "in-progress",
        ).length;
        const overdueCount = taskInstances.filter((instance) => {
          if (!instance.due_date || instance.status === "completed")
            return false;
          const dueDate = new Date(instance.due_date);
          return dueDate < now;
        }).length;

        setTaskStats({
          total: taskInstances.length,
          completed: completedCount,
          inProgress: inProgressCount,
          overdue: overdueCount,
        });
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin || isManager) {
      fetchData();
    }
  }, [isAdmin, isManager]);

  if (!isAdmin && !isManager) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-500">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <span className="ml-2">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        {isAdmin && (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Task Statistics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Task Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Tasks</span>
                    <span className="font-medium">{taskStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-gray-500">Completed</span>
                    </div>
                    <span className="font-medium">{taskStats.completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-gray-500">In Progress</span>
                    </div>
                    <span className="font-medium">{taskStats.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-gray-500">Overdue</span>
                    </div>
                    <span className="font-medium">{taskStats.overdue}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Statistics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">User Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Users</span>
                    <span className="font-medium">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Admins</span>
                    <span className="font-medium">
                      {
                        users.filter((user) => user.roles.includes("admin"))
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Managers</span>
                    <span className="font-medium">
                      {
                        users.filter((user) => user.roles.includes("manager"))
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Team Members</span>
                    <span className="font-medium">
                      {
                        users.filter((user) =>
                          user.roles.includes("team_member"),
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Statistics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Team Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Teams</span>
                    <span className="font-medium">{teams.length}</span>
                  </div>
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-500">{team.name}</span>
                      <span className="font-medium">
                        {team.memberCount} members
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                          alt={user.name}
                        />
                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.user_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="capitalize"
                        >
                          {role.replace("_", " ")}
                        </Badge>
                      ))}
                      <Badge
                        variant={user.is_active ? "success" : "destructive"}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-medium">{team.name}</h3>
                      </div>
                      <Badge variant="outline">
                        {team.memberCount} members
                      </Badge>
                    </div>
                    <p className="text-gray-500">{team.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
