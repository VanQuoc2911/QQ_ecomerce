// src/utils/roleRedirect.ts
import type { Role } from "../types/User";

const redirectMap: Record<Role, string> = {
  admin: "/admin/admin-dashboard",
  system: "/system/approvals",
  seller: "/seller/seller-dashboard",
  shipper: "/shipper/shipper-orders",
  user: "/user/home",
};

export const getRoleRedirectPath = (role: Role): string => {
  return redirectMap[role] ?? "/user/home";
};
