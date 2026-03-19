import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import api from "./axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Refresh user profile from backend
 * Call this after payments, token redemptions, etc.
 * Returns updated user data with new balance
 */
export const refreshUserProfile = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await api.get("/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = response.data?.user || response.data;

    // Update localStorage with fresh data
    localStorage.setItem("user", JSON.stringify(userData));

    return userData;
  } catch (error) {
    console.error("Failed to refresh user profile:", error);
    return null;
  }
};

/**
 * Update balance locally after deduction
 * Use this for optimistic UI updates
 */
export const updateBalanceLocally = (deduction: number) => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;

    const user = JSON.parse(stored);
    user.balance -= deduction;

    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (error) {
    console.error("Failed to update balance locally:", error);
    return null;
  }
};
