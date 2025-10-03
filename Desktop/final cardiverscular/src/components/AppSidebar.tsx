import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Heart,
  Users,
  Calendar,
  FileText,
  CheckSquare,
  Activity,
  MessageSquare,
  Database,
  BarChart3,
  Stethoscope,
  FileCheck,
  UserCheck,
  Clock,
  MessageCircle,
  Download
} from "lucide-react";
import cardioLogo from "@/assets/cardiovascular-heart-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
    description: "Overview & Analytics"
  },
  {
    title: "Patient Onboarding",
    url: "/patients",
    icon: Users,
    description: "Register new patients"
  },
  {
    title: "Vital Data Collection",
    url: "/vitals",
    icon: Heart,
    description: "Record vital signs"
  },
  {
    title: "Appointment Booking",
    url: "/appointments",
    icon: Calendar,
    description: "Schedule consultations"
  },
  {
    title: "Doctor Analysis",
    url: "/analysis",
    icon: Stethoscope,
    description: "Assessment & diagnosis"
  },
  {
    title: "Lab Tests",
    url: "/lab-tests",
    icon: Activity,
    description: "Order & manage tests"
  },
  {
    title: "Prescriptions",
    url: "/prescriptions",
    icon: FileText,
    description: "Medication management"
  },
  {
    title: "Pharmacy",
    url: "/pharmacy",
    icon: CheckSquare,
    description: "Drug dispensing"
  },
  {
    title: "Consent Management",
    url: "/consent",
    icon: FileCheck,
    description: "Surgery consent forms"
  },
  {
    title: "Pre-Operative",
    url: "/pre-operative",
    icon: UserCheck,
    description: "WHO pre-op checklist"
  },
  {
    title: "During Operation",
    url: "/during-operation",
    icon: Activity,
    description: "Intra-operative monitoring"
  },
  {
    title: "Post-Operative",
    url: "/post-operative",
    icon: Clock,
    description: "Recovery tracking"
  },
  {
    title: "Patient Records",
    url: "/records",
    icon: Database,
    description: "Complete history & export"
  },
  {
    title: "Follow-up",
    url: "/followup",
    icon: MessageCircle,
    description: "Patient follow-up care"
  },
  {
    title: "Data Export",
    url: "/data-export",
    icon: Download,
    description: "Export data for research"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white p-1">
              <img src={cardioLogo} alt="Cardiovascular Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground font-heading">
                Cardiovascular Care
              </h1>
              <p className="text-xs text-sidebar-foreground/70">
                Patient Management
              </p>
            </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 p-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium uppercase tracking-wider mb-4">
            {!isCollapsed ? "Navigation" : ""}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`
                      relative group transition-all duration-200 rounded-xl h-12
                      ${isActive(item.url)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-medical" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    `}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 px-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs opacity-70 truncate">{item.description}</div>
                        </div>
                      )}
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full opacity-80" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 text-sidebar-foreground/60">
            <Clock className="w-4 h-4" />
            {!isCollapsed && (
              <div className="text-xs">
                <div>System Status: Online</div>
                <div>Last sync: Just now</div>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}