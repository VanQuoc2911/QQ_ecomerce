// src/utils/roleRedirect.ts
import type { Role } from "../types/User";

const redirectMap: Record<Role, string> = {
  admin: "/admin/dashboard",
  system: "/approvals",
  seller: "/dashboard",
  shipper: "/shipper-orders",
  user: "/home",
};

export const getRoleRedirectPath = (role: Role): string => {
  return redirectMap[role] ?? "/home";
};
