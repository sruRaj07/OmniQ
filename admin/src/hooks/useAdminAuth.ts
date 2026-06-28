/**
 * OmniQ admin panel - admin auth hook.
 * Author: OmniQ Team
 */
export function useAdminAuth() {
  return {
    admin: { id: "admin-demo", email: "admin@omniq.in" },
    isAuthenticated: true
  };
}
