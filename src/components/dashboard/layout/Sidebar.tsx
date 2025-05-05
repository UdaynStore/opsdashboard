import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import {
  Home,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  FolderKanban,
  CheckSquare,
  PlusCircle,
  ClipboardList,
  FileText,
  UserCog,
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: number;
  requiredRoles?: string[];
}

interface SidebarProps {
  activeItem?: string;
}

const Sidebar = ({ activeItem }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isManager, roles } = useAuth();

  const currentPath = location.pathname;

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      href: "/dashboard",
      isActive: currentPath === "/dashboard",
    },
    {
      icon: <CheckSquare size={20} />,
      label: "My Tasks",
      href: "/dashboard?tab=tasks",
      isActive:
        currentPath === "/dashboard" && location.search.includes("tab=tasks"),
    },
    {
      icon: <PlusCircle size={20} />,
      label: "Create Task",
      href: "/tasks/new",
      isActive: currentPath === "/tasks/new",
    },
    {
      icon: <FolderKanban size={20} />,
      label: "Kanban Board",
      href: "/dashboard?tab=kanban",
      isActive:
        currentPath === "/dashboard" && location.search.includes("tab=kanban"),
    },
    {
      icon: <Calendar size={20} />,
      label: "Calendar",
      href: "/calendar",
      isActive: currentPath === "/calendar",
    },
    {
      icon: <FileText size={20} />,
      label: "SOPs",
      href: "/sops",
      isActive: currentPath === "/sops",
    },
  ];

  // Admin and manager specific items
  const adminItems: NavItem[] = [
    {
      icon: <Users size={20} />,
      label: "Team Management",
      href: "/teams",
      isActive: currentPath === "/teams",
      requiredRoles: ["admin", "manager"],
    },
    {
      icon: <UserCog size={20} />,
      label: "User Management",
      href: "/users",
      isActive: currentPath === "/users",
      requiredRoles: ["admin"],
    },
  ];

  const bottomItems: NavItem[] = [
    {
      icon: <Settings size={20} />,
      label: "Settings",
      href: "/settings",
      isActive: currentPath === "/settings",
    },
    {
      icon: <HelpCircle size={20} />,
      label: "Help",
      href: "/help",
      isActive: currentPath === "/help",
    },
  ];

  // Filter admin items based on user roles
  const filteredAdminItems = adminItems.filter((item) => {
    if (!item.requiredRoles) return true;
    return item.requiredRoles.some((role) => roles.includes(role));
  });

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <div className="w-[280px] h-full bg-white/80 backdrop-blur-md border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          Task Manager
        </h2>
        <p className="text-sm text-gray-500">Manage your tasks and projects</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={"ghost"}
              className={`w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium ${item.isActive ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-gray-700 hover:bg-gray-100"}`}
              onClick={() => handleNavigation(item.href)}
            >
              <span
                className={`${item.isActive ? "text-blue-600" : "text-gray-500"}`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {filteredAdminItems.length > 0 && (
          <>
            <Separator className="my-4 bg-gray-100" />

            <h3 className="text-xs font-medium px-4 py-1 text-gray-500 uppercase tracking-wider">
              Administration
            </h3>
            <div className="space-y-1.5 mt-2">
              {filteredAdminItems.map((item) => (
                <Button
                  key={item.label}
                  variant={"ghost"}
                  className={`w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium ${item.isActive ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => handleNavigation(item.href)}
                >
                  <span
                    className={`${item.isActive ? "text-blue-600" : "text-gray-500"}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Button>
              ))}
            </div>
          </>
        )}

        <Separator className="my-4 bg-gray-100" />

        <div className="space-y-3">
          <h3 className="text-xs font-medium px-4 py-1 text-gray-500 uppercase tracking-wider">
            Task Status
          </h3>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Completed
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            In Progress
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
            Blocked
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            Failed
          </Button>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-gray-200">
        {bottomItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 mb-1.5"
            onClick={() => handleNavigation(item.href)}
          >
            <span className="text-gray-500">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
