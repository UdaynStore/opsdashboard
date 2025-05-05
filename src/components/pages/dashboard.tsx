import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import DashboardGrid from "../dashboard/DashboardGrid";
import TaskBoard from "../dashboard/TaskBoard";
import TaskList from "../tasks/TaskList";
import AdminDashboard from "../dashboard/AdminDashboard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../../../supabase/auth";

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Get tab from URL query parameter or default to "tasks"
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "tasks");

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", value);
    navigate(`${location.pathname}?${newParams.toString()}`);
  };

  // Function to trigger loading state and refresh data
  const handleRefresh = () => {
    setLoading(true);
    // Reset loading after 2 seconds
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <TopNavigation />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar
          activeItem={
            activeTab === "tasks"
              ? "My Tasks"
              : activeTab === "kanban"
                ? "Kanban Board"
                : "Dashboard"
          }
        />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 pt-4 pb-2 flex justify-between items-center">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full max-w-md"
            >
              <TabsList>
                <TabsTrigger value="tasks">My Tasks</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                {(isAdmin || isManager) && (
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            <Button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
          <div
            className={cn(
              "container mx-auto p-6 space-y-8",
              "transition-all duration-300 ease-in-out",
            )}
          >
            <TabsContent value="tasks" className="mt-0">
              <TaskList />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardGrid isLoading={loading} />
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <TaskBoard isLoading={loading} />
            </TabsContent>

            {(isAdmin || isManager) && (
              <TabsContent value="admin" className="mt-0">
                <AdminDashboard />
              </TabsContent>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
