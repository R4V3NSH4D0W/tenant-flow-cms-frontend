"use client";

import { useState } from "react";

import Link from "next/link";
import { Bell, ChevronDown, ExternalLink, LogOut, PanelLeft, ShieldCheck, KeyRound } from "lucide-react";

import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { logoutAction } from "@/lib/auth/actions";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { projectsApi } from "@/lib/projects/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/shared/utils";
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog";

export function AdminHeader({
  userEmail,
  mode = "dashboard",
}: {
  userEmail: string;
  mode?: "admin" | "dashboard";
}) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const queryClient = useQueryClient();
  const { currentProject, projects } = useCurrentProject();
  const { isAdmin } = useCurrentUser();
  const notificationAudience =
    mode === "admin" ? "admin" : currentProject ? "project" : "none";
  const notificationsQuery = useQuery({
    queryKey:
      notificationAudience === "project"
        ? ["project-notifications", currentProject?.slug]
        : ["admin-notifications", "project-created"],
    queryFn: () => {
      if (notificationAudience === "project" && currentProject?.slug) {
        return projectsApi.listProjectNotifications(currentProject.slug, {
          limit: 8,
        });
      }
      return projectsApi.listNotifications({ limit: 8 });
    },
    enabled: notificationAudience !== "none",
    refetchInterval: 30_000,
  });
  const initial = userEmail.slice(0, 2).toUpperCase();
  const activeProjects = projects.filter(
    (project) => project.status === "active",
  );
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const hasNotifications = notifications.length > 0;
  const markAllRead = useMutation({
    mutationFn: () => {
      if (notificationAudience === "project" && currentProject?.slug) {
        return projectsApi.markAllProjectNotificationsRead(currentProject.slug);
      }
      return projectsApi.markAllNotificationsRead();
    },
    onSuccess: async () => {
      if (notificationAudience === "project" && currentProject?.slug) {
        await queryClient.invalidateQueries({
          queryKey: ["project-notifications", currentProject.slug],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["admin-notifications", "project-created"],
        });
      }
    },
  });
  const clearAll = useMutation({
    mutationFn: () => {
      if (notificationAudience === "project" && currentProject?.slug) {
        return projectsApi.clearAllProjectNotifications(currentProject.slug);
      }
      return projectsApi.clearAllNotifications();
    },
    onSuccess: async () => {
      if (notificationAudience === "project" && currentProject?.slug) {
        await queryClient.invalidateQueries({
          queryKey: ["project-notifications", currentProject.slug],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["admin-notifications", "project-created"],
        });
      }
    },
  });
  const baseHost = (() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
    if (!apiUrl) return "localhost";
    try {
      const normalized = /^https?:\/\//i.test(apiUrl) ? apiUrl : `https://${apiUrl}`;
      const url = new URL(normalized);
      const host = url.hostname.toLowerCase();
      return host === "127.0.0.1" ? "localhost" : host || "localhost";
    } catch {
      return "localhost";
    }
  })();
  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:px-6">
      <SidebarTrigger className="-ml-1 size-9 rounded-md border border-border/60">
        <PanelLeft className="size-5" />
        <span className="sr-only">Toggle sidebar</span>
      </SidebarTrigger>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-2">
          <p className="truncate text-sm font-medium text-muted-foreground sm:text-[15px]">
            {mode === "admin"
              ? "Admin workspace"
              : currentProject
                ? `Project: ${currentProject.name}`
                : "Dashboard"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notificationAudience !== "none" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative size-9 rounded-md border border-border/40 hover:bg-muted/60"
                  aria-label="Open notifications"
                >
                  <Bell className="size-4.5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 p-2 shadow-xl border-border/50"
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel className="p-0 text-xs font-semibold">
                    {notificationAudience === "admin"
                      ? "Admin notifications"
                      : "Project notifications"}
                  </DropdownMenuLabel>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => markAllRead.mutate()}
                      disabled={markAllRead.isPending || unreadCount === 0}
                    >
                      {markAllRead.isPending ? "Marking..." : "Mark read"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-destructive"
                      onClick={() => clearAll.mutate()}
                      disabled={clearAll.isPending || !hasNotifications}
                    >
                      {clearAll.isPending ? "Clearing..." : "Clear all"}
                    </Button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-80 space-y-1 overflow-auto p-1">
                  {!hasNotifications ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      {notificationAudience === "admin"
                        ? "No new project creation events yet."
                        : "No new project activity yet."}
                    </p>
                  ) : (
                    notifications.map((item) => {
                      const domain =
                        typeof item.metadata?.primaryDomain === "string"
                          ? item.metadata.primaryDomain
                          : null;
                      const projectSlug = item.projectSlug ?? "project";
                      return (
                        <Link
                          key={item.id}
                          href={
                            notificationAudience === "admin"
                              ? `/dashboard/projects/${encodeURIComponent(projectSlug)}`
                              : `/dashboard/projects/${encodeURIComponent(projectSlug)}`
                          }
                          className={cn(
                            "block rounded-md border px-2 py-2 hover:border-border hover:bg-muted/50",
                            item.unread
                              ? "border-primary/25 bg-primary/5"
                              : "border-transparent",
                          )}
                        >
                          <p className="text-xs font-medium">
                            {notificationAudience === "admin"
                              ? `New project: ${String(item.metadata?.name ?? item.projectSlug ?? "Unnamed")}`
                              : `${String(item.action).replaceAll("_", " ").toLowerCase()}`}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Subdomain: {domain || `${projectSlug}.${baseHost}`}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.unread ? "Unread" : "Read"} • by {item.performerEmail} • {formatWhen(item.createdAt)}
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-md">
                  <Link
                    href={
                      notificationAudience === "admin"
                        ? "/admin/audit"
                        : currentProject
                          ? `/dashboard/projects/${encodeURIComponent(currentProject.slug)}`
                          : "/dashboard"
                    }
                    className="flex items-center gap-2 text-xs"
                  >
                    View all activity
                    <ExternalLink className="size-3.5" />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {mode === "dashboard" && activeProjects.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden gap-2 border-border/60 font-medium md:inline-flex"
                >
                  {currentProject?.name ?? "Select Project"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-2 shadow-xl border-border/50"
              >
                <DropdownMenuLabel className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                  Switch project
                </DropdownMenuLabel>
                {activeProjects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    asChild
                    className="rounded-md focus:bg-primary/5 focus:text-primary transition-colors"
                  >
                    <a
                      href={`/dashboard/projects/select?slug=${encodeURIComponent(project.slug)}&redirect=/dashboard`}
                      className="flex items-center justify-between w-full"
                    >
                      <span>{project.name}</span>
                      {currentProject?.id === project.id && (
                        <div className="size-1.5 rounded-full bg-primary" />
                      )}
                    </a>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      asChild
                      className="rounded-md focus:bg-primary/5 focus:text-primary transition-colors"
                    >
                      <Link
                        href="/admin/projects"
                        className="text-xs font-medium"
                      >
                        Manage projects
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 gap-2 rounded-lg border border-border/40 px-2.5 hover:bg-muted/60"
              >
                <Avatar className="size-8 rounded-md border border-border/50">
                  <AvatarFallback className="rounded-md bg-primary/10 text-xs font-semibold text-primary uppercase">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 flex-col items-start gap-0.5 text-left sm:flex">
                  <span className="max-w-44 truncate text-xs font-semibold leading-none">
                    {userEmail}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isAdmin ? "Super admin" : "Project admin"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 p-2 shadow-xl border-border/50"
            >
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground leading-none">
                    Signed in as
                  </span>
                  <span className="truncate text-sm font-semibold pt-1">
                    {userEmail}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              {isAdmin && mode === "dashboard" && (
                <DropdownMenuItem asChild className="rounded-md cursor-pointer">
                  <Link href="/admin" className="flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Platform Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="rounded-md cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowPasswordDialog(true);
                }}
              >
                <div className="flex w-full items-center gap-2 text-left">
                  <KeyRound className="size-4" />
                  Change password
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md cursor-pointer">
                <form action={logoutAction} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 text-left text-destructive"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </header>
  );
}
