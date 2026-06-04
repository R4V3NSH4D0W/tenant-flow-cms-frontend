import { api } from "@/lib/fetcher";
import type {
  ProjectSummary,
  ProjectAccessSummary,
  ProjectStatus,
  ProjectToken,
  ProjectMember,
  ProjectUserDirectoryEntry,
  AdminUserSummary,
  AuditLogEntry,
  AdminNotificationsResponse,
} from "./types";
export * from "./types";

export const projectsApi = {
  list: () => api.get<{ success: true; projects: ProjectSummary[] }>("/api/v1/admin/projects"),
  get: (projectSlug: string) =>
    api.get<{ success: true; project: ProjectSummary }>(
      `/api/v1/admin/projects/${projectSlug}`,
    ),
  getAccess: (projectSlug: string) =>
    api.get<{ success: true; access: ProjectAccessSummary }>(
      `/api/v1/admin/projects/${projectSlug}/access`,
    ),
  create: (body: {
    name: string;
    slug?: string;
    description?: string | null;
    primaryDomain?: string | null;
    allowedOrigins?: string[];
    handoverUserId?: string;
    handoverEmail?: string;
  }) => api.post<{ success: true; project: ProjectSummary }>("/api/v1/admin/projects", body),
  update: (
    projectSlug: string,
    body: Partial<{
      name: string;
      slug: string;
      description: string | null;
      primaryDomain: string | null;
      status: ProjectStatus;
      allowedOrigins: string[];
    }>,
  ) =>
    api.patch<{ success: true; project: ProjectSummary }>(
      `/api/v1/admin/projects/${projectSlug}`,
      body,
    ),
  deleteProject: (projectSlug: string) =>
    api.delete<{ success: true }>(`/api/v1/admin/projects/${projectSlug}`),
  restoreProject: (projectSlug: string) =>
    api.post<{ success: true; project: ProjectSummary }>(
      `/api/v1/admin/projects/${projectSlug}/restore`,
      {},
    ),
  listTokens: (projectSlug: string) =>
    api.get<{ success: true; tokens: ProjectToken[] }>(
      `/api/v1/admin/projects/${projectSlug}/tokens`,
    ),
  createToken: (
    projectSlug: string,
    body: { label: string; expiresAt?: string | null },
  ) =>
    api.post<{ success: true; token: string; record: ProjectToken }>(
      `/api/v1/admin/projects/${projectSlug}/tokens`,
      body,
    ),
  revokeToken: (projectSlug: string, tokenId: string) =>
    api.delete<{ success: true }>(
      `/api/v1/admin/projects/${projectSlug}/tokens/${tokenId}`,
    ),
  listMembers: (projectSlug: string) =>
    api.get<{ success: true; members: ProjectMember[] }>(
      `/api/v1/admin/projects/${projectSlug}/members`,
    ),
  addMember: (
    projectSlug: string,
    body: { userId?: string; email?: string; role?: "admin" },
  ) =>
    api.post<{
      success: true;
      user: { id: string; email: string; isAdmin: boolean };
      membership: { id: string; createdAt: string; role: "admin" };
    }>(`/api/v1/admin/projects/${projectSlug}/members`, body),
  listProjectUsers: (projectSlug: string, query?: string) =>
    api.get<{ success: true; users: ProjectUserDirectoryEntry[] }>(
      `/api/v1/admin/projects/${projectSlug}/users`,
      {
        params: {
          query,
        },
      },
    ),
  createUser: (body: { email: string; password: string; isAdmin?: boolean }) =>
    api.post<{ success: true; user: AdminUserSummary }>(
      "/api/v1/admin/projects/users",
      body,
    ),
  listAllUsers: () => 
    api.get<{ success: true; users: (AdminUserSummary & { _count: { projectAccess: number } })[] }>(
      "/api/v1/admin/projects/users"
    ),
  deleteUser: (userId: string) =>
    api.delete<{ success: true }>(`/api/v1/admin/projects/users/${userId}`),
  listAuditLogs: (params?: { performerId?: string; targetUserId?: string; projectSlug?: string; action?: string; limit?: number; page?: number }) =>
    api.get<{ success: true; logs: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>("/api/v1/admin/audit", { params }),
  listNotifications: (params?: { limit?: number }) =>
    api.get<AdminNotificationsResponse>("/api/v1/admin/audit/notifications", {
      params: { limit: params?.limit ?? 8 },
      showErrorToast: false,
    }),
  markAllNotificationsRead: () =>
    api.post<{ success: true }>("/api/v1/admin/audit/notifications/read-all", {}),
  clearAllNotifications: () =>
    api.post<{ success: true }>("/api/v1/admin/audit/notifications/clear-all", {}),
  listProjectNotifications: (projectSlug: string, params?: { limit?: number }) =>
    api.get<AdminNotificationsResponse>(
      `/api/v1/admin/projects/${projectSlug}/notifications`,
      {
        params: { limit: params?.limit ?? 8 },
        showErrorToast: false,
      },
    ),
  markAllProjectNotificationsRead: (projectSlug: string) =>
    api.post<{ success: true }>(
      `/api/v1/admin/projects/${projectSlug}/notifications/read-all`,
      {},
    ),
  clearAllProjectNotifications: (projectSlug: string) =>
    api.post<{ success: true }>(
      `/api/v1/admin/projects/${projectSlug}/notifications/clear-all`,
      {},
    ),
  getAuditLog: (logId: string) =>
    api.get<{ success: true; log: AuditLogEntry }>(`/api/v1/admin/audit/${logId}`),
  listUserActivity: (userId: string, params?: { limit?: number }) =>
    api.get<{ success: true; logs: AuditLogEntry[] }>(`/api/v1/admin/audit/users/${userId}`, { params }),
  handoverProject: (
    projectSlug: string,
    body: { userId?: string; email?: string },
  ) =>
    api.post<{
      success: true;
      user: { id: string; email: string; isAdmin: boolean };
    }>(`/api/v1/admin/projects/${projectSlug}/handover`, body),
  removeMember: (projectSlug: string, userId: string) =>
    api.delete<{ success: true }>(
      `/api/v1/admin/projects/${projectSlug}/members/${userId}`,
    ),
  getSmtp: (projectSlug: string) =>
    api.get<{
      success: true;
      smtp: {
        smtpEmail: string | null;
        smtpHost: string | null;
        smtpPort: number | null;
        hasPassword: boolean;
      };
    }>(`/api/v1/admin/projects/${projectSlug}/smtp`),
  updateSmtp: (
    projectSlug: string,
    body: {
      smtpEmail?: string | null;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpPassword?: string | null;
    },
  ) =>
    api.patch<{
      success: true;
      smtp: {
        smtpEmail: string | null;
        smtpHost: string | null;
        smtpPort: number | null;
        hasPassword: boolean;
      };
    }>(`/api/v1/admin/projects/${projectSlug}/smtp`, body),
  testSmtp: (
    projectSlug: string,
    body: {
      smtpEmail?: string | null;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpPassword?: string | null;
    },
  ) =>
    api.post<{ success: true; message: string }>(
      `/api/v1/admin/projects/${projectSlug}/smtp/test`,
      body,
    ),
};
