import axios from "axios";
import { useAuthStore } from "./authStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export const auth = {
  register: (email, password, fullName) =>
    apiClient.post("/auth/register", {
      email,
      password,
      full_name: fullName,
      role: "patient",
    }),
  login: (email, password) =>
    apiClient.post("/auth/login", { email, password }),
  refresh: (refreshToken) =>
    apiClient.post("/auth/refresh", { refresh_token: refreshToken }),
};

export const patient = {
  getSelf: () => apiClient.get("/patients/me"),
  updateSelf: (data) => apiClient.patch("/patients/me", data),
};

export const advice = {
  getMyAdvice: () => apiClient.get("/advice/me"),
};

export const checkins = {
  create: (skinScore, notes) =>
    apiClient.post("/checkins", { skin_score: skinScore, notes }),
  getHistory: () => apiClient.get("/checkins/me"),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/checkins/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default apiClient;
