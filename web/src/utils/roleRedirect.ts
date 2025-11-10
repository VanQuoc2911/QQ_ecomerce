// src/utils/roleRedirect.ts
import type { Role } from "../types/User";

const redirectMap: Record<Role, string> = {
  admin: "/admin/dashboard",
  system: "/approvals",
  seller: "/seller/dashboard",
  user: "/home",
};

export const getRoleRedirectPath = (role: Role): string => {
  return redirectMap[role];
};
