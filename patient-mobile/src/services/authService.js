import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000");

class AuthService {
  async login(identifier, password) {
    try {
      const normalizedIdentifier = (identifier || "").trim();
      const loginPayload = normalizedIdentifier.includes("@")
        ? { email: normalizedIdentifier, password }
        : { username: normalizedIdentifier, password };

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginPayload),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();

      // Save tokens and user info
      await AsyncStorage.setItem("accessToken", data.access_token);
      await AsyncStorage.setItem("refreshToken", data.refresh_token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
      await AsyncStorage.removeItem("user");
    } catch (error) {
      throw error;
    }
  }

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem("accessToken");
    } catch (error) {
      throw error;
    }
  }

  async getUser() {
    try {
      const user = await AsyncStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      throw error;
    }
  }

  async isLoggedIn() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      return !!token;
    } catch (error) {
      return false;
    }
  }

  async getAuthHeaders() {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error("No access token available");
      }
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
