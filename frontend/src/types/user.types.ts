/**
 * OmniQ mobile app - user domain types.
 * Author: OmniQ Team
 */
export type UserRole = "buyer" | "seller" | "admin";

export type UserProfile = {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
};
