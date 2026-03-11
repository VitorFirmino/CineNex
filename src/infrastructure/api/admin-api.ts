import { axiosClient } from "@infrastructure/http/axios-client";

type RequestOptions = {
  signal?: AbortSignal;
};

export type AdminMetrics = {
  activeUsers: number;
  totalUsers: number;
  uptimeSeconds: number;
  watchingNow: Array<{ content: string; count: number }>;
  topFavorites: Array<{ type: string; id: string; count: number }>;
  growth: Array<{ date: string; users: number }>;
  timestamp: string;
};

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  lastActive: string;
  createdAt: string;
  _count: { favorites: number };
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogError = {
  id: string;
  title: string;
  type: "broken_link" | "missing_metadata" | "source_unavailable";
  date: string;
};

export type HealthStatus = {
  status: "online" | "offline";
  latencyMs: number;
};

export type SystemHealth = {
  database: HealthStatus;
  supabase: HealthStatus;
  tmdb: HealthStatus;
};

export type MaintenanceResponse = {
  maintenance: boolean;
  success?: boolean;
};

export type AdminActionResponse = {
  success: boolean;
  message?: string;
};

export const getAdminMetrics = async (options?: RequestOptions) => {
  const response = await axiosClient.get<AdminMetrics>("/api/admin/metrics", {
    signal: options?.signal,
  });
  return response.data;
};

export const getCatalogErrors = async (options?: RequestOptions) => {
  const response = await axiosClient.get<CatalogError[]>("/api/admin/catalog-errors", {
    signal: options?.signal,
  });
  return response.data;
};

export const getMaintenanceStatus = async (options?: RequestOptions) => {
  const response = await axiosClient.get<MaintenanceResponse>("/api/admin/maintenance", {
    signal: options?.signal,
  });
  return response.data;
};

export const setMaintenanceStatus = async (enabled: boolean) => {
  const response = await axiosClient.post<MaintenanceResponse>("/api/admin/maintenance", { enabled });
  return response.data;
};

export const clearOtherSessions = async () => {
  const response = await axiosClient.post<AdminActionResponse>("/api/admin/sessions");
  return response.data;
};

export const getSystemHealth = async (options?: RequestOptions) => {
  const response = await axiosClient.get<SystemHealth>("/api/admin/health", {
    signal: options?.signal,
  });
  return response.data;
};

export const clearNextDataCache = async () => {
  const response = await axiosClient.post<AdminActionResponse>("/api/admin/cache");
  return response.data;
};

export const listAdminUsers = async (page = 1, pageSize = 20, options?: RequestOptions) => {
  const response = await axiosClient.get<AdminUsersResponse>(
    `/api/admin/users?page=${page}&pageSize=${pageSize}`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
};

export const updateUserRole = async (id: string, role: "ADMIN" | "USER") => {
  const response = await axiosClient.patch<{ user: AdminUser }>("/api/admin/users", { id, role });
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await axiosClient.delete<{ deleted: boolean }>("/api/admin/users", {
    data: { id },
  });
  return response.data;
};

export const adminApi = {
  getAdminMetrics,
  getCatalogErrors,
  getMaintenanceStatus,
  setMaintenanceStatus,
  clearOtherSessions,
  getSystemHealth,
  clearNextDataCache,
  listAdminUsers,
  updateUserRole,
  deleteUser,
};
