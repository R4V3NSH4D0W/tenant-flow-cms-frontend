"use client";

import Link from "next/link";
import { useQuery } from "@/lib/shared/react-query";
import { projectsApi } from "@/lib/projects/api";
import type { AuditLogEntry } from "@/lib/projects/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Search, Code, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import {
  AuditLogFilters,
  type AuditFilters,
} from "@/components/dashboard/admin/audit-log-filters";
import { cn } from "@/lib/shared/utils";

function getAuditActionLabel(
  action: string,
  metadata: Record<string, unknown>,
) {
  const permanent = metadata.permanent === true;
  switch (action) {
    case "PROJECT_ARCHIVED":
      return "Archived Project";
    case "PROJECT_DELETED":
      return permanent ? "Permanently Deleted Project" : "Deleted Project";
    case "PAGE_DELETED":
      return permanent ? "Permanently Deleted Page" : "Archived Page";
    case "PAGE_RESTORED":
      return "Restored Page";
    case "BLOCK_DELETED":
      return permanent ? "Permanently Deleted Block" : "Archived Block";
    case "BLOCK_RESTORED":
      return "Restored Block";
    case "MEDIA_FILE_TRASHED":
      return permanent
        ? "Permanently Deleted Media File"
        : "Media File Archived";
    case "MEDIA_FOLDER_TRASHED":
      return permanent
        ? "Permanently Deleted Media Folder"
        : "Media Folder Archived";
    case "PROJECT_RESTORED":
      return "Restored Project";
    default:
      return action.replace(/_/g, " ");
  }
}

function getAuditActionTone(action: string, metadata: Record<string, unknown>) {
  const permanent = metadata.permanent === true;
  if (permanent) return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  if (
    action.includes("ARCHIVED") ||
    action.includes("TRASHED") ||
    action.includes("RESTORED")
  ) {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  }
  if (
    action.includes("CREATE") ||
    action.includes("GRANTED") ||
    action.includes("ADDED")
  ) {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  }
  if (
    action.includes("REVOKE") ||
    action.includes("REMOVED") ||
    action.includes("DELETED")
  ) {
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
  return "bg-blue-500/10 text-blue-600 border-blue-500/20";
}

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState("1");

  const [prevPage, setPrevPage] = useState(page);
  if (page !== prevPage) {
    setPrevPage(page);
    setPageInput(String(page));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", filters, page, pageSize],
    queryFn: () =>
      projectsApi.listAuditLogs({ ...filters, page, limit: pageSize }),
  });

  const logs: AuditLogEntry[] = data?.logs ?? [];
  const pagination = data?.pagination ?? {
    page,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const serverPage = pagination.page;
  const [prevServerPage, setPrevServerPage] = useState(serverPage);
  if (serverPage !== prevServerPage) {
    setPrevServerPage(serverPage);
    if (serverPage !== page) {
      setPage(serverPage);
    }
    setPageInput(String(serverPage));
  }

  if (pagination.totalPages > 0 && page > pagination.totalPages && !isLoading) {
    setPage(pagination.totalPages);
    setPageInput(String(pagination.totalPages));
  }

  const start =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  function goToPage(nextValue: string) {
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) return;
    const nextPage = Math.min(
      Math.max(Math.trunc(numericValue), 1),
      pagination.totalPages,
    );
    setPage(nextPage);
    setPageInput(String(nextPage));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12">
      <header className="space-y-2 border-b border-border pb-8">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="size-5" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary/80">
            Security & Compliance
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Platform Audit Log
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Immutable stream of administrative events. Monitor infrastructure
          changes, access grants, and configuration updates across the entire
          ecosystem.
        </p>
      </header>

      <div className="space-y-4">
        <AuditLogFilters
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
        />

        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="text-[10px] uppercase font-bold tracking-wider"
                  style={{ width: 200 }}
                >
                  Timestamp
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">
                  Action
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">
                  Performer
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">
                  Context
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider pr-6">
                  Metadata
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 text-center text-muted-foreground text-sm italic"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 opacity-20" />
                      <p>
                        No matching audit records found for the current filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold tracking-tight px-2 py-0.5 border-border/50",
                          getAuditActionTone(log.action, log.metadata ?? {}),
                        )}
                      >
                        {getAuditActionLabel(log.action, log.metadata ?? {})}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {log.performerEmail}
                    </TableCell>
                    <TableCell>
                      {log.projectSlug ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <LayoutDashboard className="size-3" />
                          {log.projectSlug}
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/40">
                          Platform
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        asChild
                        variant="outline"
                        size="icon"
                        className="size-7 h-7 border-border/40 hover:bg-muted"
                      >
                        <Link
                          href={`/admin/audit/${log.id}`}
                          aria-label={`Open ${log.action} details`}
                        >
                          <Code className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Showing {start}-{end} of {pagination.total} audit records
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Per Page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                  setPageInput("1");
                }}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <div className="min-w-20 text-center text-xs font-semibold text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Go to
              </span>
              <Input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    goToPage(pageInput);
                  }
                }}
                className="h-8 w-20 text-center text-xs"
                inputMode="numeric"
                aria-label="Jump to page"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => goToPage(pageInput)}
                disabled={isLoading}
              >
                Go
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() =>
                setPage((current) =>
                  Math.min(current + 1, pagination.totalPages),
                )
              }
              disabled={page >= pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
