import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isHydrated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem("access_token", accessToken);
    await AsyncStorage.setItem("refresh_token", refreshToken);
    set({ user, token: accessToken, refreshToken });
  },

  logout: async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
    set({ user: null, token: null, refreshToken: null });
  },

  rehydrate: async () => {
    const token = await AsyncStorage.getItem("access_token");
    const refreshToken = await AsyncStorage.getItem("refresh_token");
    set({ token, refreshToken, isHydrated: true });
  },

  setUser: (user) => set({ user }),
}));
