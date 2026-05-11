"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Trash2,
  Menu,
  PanelBottom,
  Database,
  Megaphone,
  Images,
  Hammer,
  FolderKanban,
  Route,
  ShieldCheck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const platformNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
];

const projectMainNavBase: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/dashboard/media",
    label: "Media",
    icon: Images,
  },
];

const cmsNav: NavItem[] = [
  {
    href: "/dashboard/cms/pages",
    label: "Pages",
    icon: FileText,
  },
  {
    href: "/dashboard/cms/layouts",
    label: "Layouts",
    icon: LayoutTemplate,
  },
  {
    href: "/dashboard/cms/tools",
    label: "Tools",
    icon: Hammer,
  },
  {
    href: "/dashboard/cms/collections",
    label: "Collections",
    icon: Database,
  },
  {
    href: "/dashboard/cms/dynamic-routes",
    label: "Dynamic Routes",
    icon: Route,
  },
  {
    href: "/dashboard/cms/navigation",
    label: "Navigation",
    icon: Menu,
  },
  {
    href: "/dashboard/cms/footer",
    label: "Footer",
    icon: PanelBottom,
  },
  {
    href: "/dashboard/cms/announcements",
    label: "Announcements",
    icon: Megaphone,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  mode = "dashboard",
}: {
  mode?: "admin" | "dashboard";
}) {
  const pathname = usePathname();
  const { currentProject, currentAccess } = useCurrentProject();
  const { isAdmin } = useCurrentUser();

  const canManageProject = isAdmin || currentAccess?.canManageProject === true;
  const projectMainNav: NavItem[] = canManageProject
    ? [
        ...projectMainNavBase,
        { href: "/dashboard/recycle-bin", label: "Recycle Bin", icon: Trash2 },
      ]
    : projectMainNavBase;

  const visibleProjectMainNav = projectMainNav;
  const visibleCmsNav = cmsNav;
  const collapsedIconButtonClass = "group-data-[collapsible=icon]:mx-auto";

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3.5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-primary/95 text-sm font-semibold text-primary-foreground"
            aria-hidden
          >
            {mode === "admin" ? "A" : "D"}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {mode === "admin" ? "Admin" : "Dashboard"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mode === "admin" ? "Control center" : (currentProject?.name ?? "No project")}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-hide gap-0 p-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
        {mode === "admin" ? (
          <SidebarGroup className="group-data-[collapsible=icon]:p-1">
            <SidebarGroupLabel className="text-[0.68rem] tracking-wide text-muted-foreground/90">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          collapsedIconButtonClass,
                          active &&
                            "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground",
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup className="group-data-[collapsible=icon]:p-1">
              <SidebarGroupLabel className="text-[0.68rem] tracking-wide text-muted-foreground/90">
                Main
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleProjectMainNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            collapsedIconButtonClass,
                            active &&
                              "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground",
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4 group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:p-1">
              <SidebarGroupLabel className="text-[0.68rem] tracking-wide text-muted-foreground/90">
                Content
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleCmsNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            collapsedIconButtonClass,
                            active &&
                              "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground",
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      {mode === "dashboard" && isAdmin && (
        <div className="mt-auto p-4 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs font-medium"
          >
            <Link href="/admin">Return to admin</Link>
          </Button>
        </div>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
