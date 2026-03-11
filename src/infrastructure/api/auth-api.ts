import { isAxiosError } from "axios";
import { axiosClient } from "@infrastructure/http/axios-client";
import type { FavoritesResponse } from "@shared/types/favorites";

export type AuthUser = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  app_metadata: {
    role: string | null;
  };
  user_metadata: {
    avatar_url: string | null;
    picture: string | null;
    full_name: string | null;
    name: string | null;
  };
};

export type AuthApiErrorPayload = {
  error?: string;
  errorCode?: string;
  message?: string;
  retryAfterSeconds?: number;
};

export type AuthApiMessageResponse = {
  success?: boolean;
  message?: string;
};

export type RegisterResponse = AuthApiMessageResponse & {
  sessionCreated?: boolean;
};

export type AuthMeResponse = {
  user: AuthUser | null;
};

export type HeartbeatResponse = {
  active: boolean;
  updated?: boolean;
};

export type FavoriteToggleResponse = {
  favorited: boolean;
};

export type WatchProgressItem = {
  id: string;
  contentType: "movies" | "series";
  contentId: string;
  episodeId: string | null;
  title: string | null;
  posterUrl: string | null;
  playHref: string;
  positionSec: number;
  durationSec: number | null;
  progressPct: number | null;
  completed: boolean;
  updatedAt?: string;
};

export type WatchProgressListResponse = {
  items?: WatchProgressItem[];
};

export type WatchProgressSingleResponse = {
  item: WatchProgressItem | null;
};

export type WatchProgressSavePayload = {
  contentType: "movies" | "series";
  contentId: string;
  episodeId?: string | null;
  playHref: string;
  positionSec: number;
  durationSec?: number | null;
  completed?: boolean;
  title?: string | null;
  posterUrl?: string | null;
};

export type WatchProgressSaveResponse = {
  saved: boolean;
  item?: WatchProgressItem | null;
  reason?: "unauthorized";
};

type WatchProgressSaveOptions = {
  keepalive?: boolean;
};

type RequestOptions = {
  signal?: AbortSignal;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type ResendPayload = {
  email: string;
};

type VerifyOtpPayload = {
  email: string;
  token: string;
};

type ForgotPasswordPayload = {
  email: string;
};

type RecoverySessionPayload = {
  accessToken: string;
  refreshToken: string;
};

type ResetPasswordPayload = {
  password: string;
  confirmPassword: string;
};

type HeartbeatPayload = {
  currentContent?: string;
};

type ToggleFavoritePayload = {
  type: string;
  contentId: string;
};

export const register = async (payload: RegisterPayload) => {
  const response = await axiosClient.post<RegisterResponse>("/api/auth/register", payload);
  return response.data;
};

export const login = async (payload: LoginPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/login", payload);
  return response.data;
};

export const resendSignupConfirmation = async (payload: ResendPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/resend", payload);
  return response.data;
};

export const verifySignupOtp = async (payload: VerifyOtpPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/verify-otp", payload);
  return response.data;
};

export const requestPasswordRecovery = async (payload: ForgotPasswordPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/forgot-password", payload);
  return response.data;
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/reset-password", payload);
  return response.data;
};

export const createRecoverySession = async (payload: RecoverySessionPayload) => {
  const response = await axiosClient.post<AuthApiMessageResponse>(
    "/api/auth/recovery/session",
    payload,
  );
  return response.data;
};

export const me = async (options?: RequestOptions) => {
  const response = await axiosClient.get<AuthMeResponse>("/api/auth/me", {
    signal: options?.signal,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axiosClient.post<AuthApiMessageResponse>("/api/auth/logout");
  return response.data;
};

export const heartbeat = async (payload: HeartbeatPayload) => {
  const response = await axiosClient.post<HeartbeatResponse>("/api/auth/heartbeat", payload);
  return response.data;
};

export const getFavorites = async (options?: RequestOptions) => {
  try {
    const response = await axiosClient.get<FavoritesResponse>("/api/auth/favorites", {
      signal: options?.signal,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return { favorites: [] satisfies FavoritesResponse["favorites"] };
    }
    throw error;
  }
};

export const toggleFavorite = async (payload: ToggleFavoritePayload) => {
  const response = await axiosClient.post<FavoriteToggleResponse>("/api/auth/favorites", payload);
  return response.data;
};

export const listWatchProgress = async (limit = 12, options?: RequestOptions) => {
  const response = await axiosClient.get<WatchProgressListResponse>(
    `/api/auth/watch-progress?limit=${encodeURIComponent(String(limit))}`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
};

export const getWatchProgress = async (
  contentType: "movies" | "series",
  contentId: string,
  options?: RequestOptions,
) => {
  const params = new URLSearchParams({
    contentType,
    contentId,
  });
  const response = await axiosClient.get<WatchProgressSingleResponse>(
    `/api/auth/watch-progress?${params.toString()}`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
};

export const saveWatchProgress = async (
  payload: WatchProgressSavePayload,
  options?: WatchProgressSaveOptions,
) => {
  if (options?.keepalive) {
    const response = await fetch("/api/auth/watch-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    });

    let data: WatchProgressSaveResponse = { saved: false };
    try {
      data = (await response.json()) as WatchProgressSaveResponse;
    } catch (error: unknown) {
      console.error("[auth-api] Falha ao interpretar resposta de watch progress.", error);
    }
    return data;
  }

  const response = await axiosClient.post<WatchProgressSaveResponse>("/api/auth/watch-progress", payload);
  return response.data;
};

export const authApi = {
  register,
  login,
  resendSignupConfirmation,
  verifySignupOtp,
  requestPasswordRecovery,
  resetPassword,
  createRecoverySession,
  me,
  logout,
  heartbeat,
  getFavorites,
  toggleFavorite,
  listWatchProgress,
  getWatchProgress,
  saveWatchProgress,
};
