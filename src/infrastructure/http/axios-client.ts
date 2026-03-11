import axios, { isAxiosError } from "axios";

export const axiosClient = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function isRequestCanceledError(error: unknown): boolean {
  return axios.isCancel(error) || (isAxiosError(error) && error.code === "ERR_CANCELED");
}
