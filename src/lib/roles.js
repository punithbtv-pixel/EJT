export const ROLES = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  DEPT: "DEPT",
  TECH: "TECH",
  MANAGEMENT: "MANAGEMENT",
  STORES: "STORES",
};

// Inventory (store stock) is open to these roles, and to any user whose
// department is Electrical whatever their role.
const INVENTORY_ROLES = [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.STORES];

export function canViewInventory(role, dept) {
  if (!role) return false;
  return INVENTORY_ROLES.includes(role) || String(dept || "").trim().toLowerCase() === "electrical";
}

// Where a role lands after login, or when it opens a page it may not see.
export function homeFor(role) {
  return role === ROLES.STORES ? "/inventory" : "/";
}

// Pages each role may visit.
// canAccessPage takes the first matching prefix, so the create pages are
// listed ahead of their parent lists.
// The job-tracker APIs are listed too, so a role with no access to those
// pages (Stores) cannot call them directly either.
const JOB_ROLES = [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH, ROLES.MANAGEMENT];
export const PAGE_ACCESS = {
  "/notifications/new": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT],
  "/workorders/new": [ROLES.ADMIN, ROLES.ENGINEER],
  "/": JOB_ROLES,
  "/notifications": JOB_ROLES,
  "/workorders": JOB_ROLES,
  "/api/dashboard": JOB_ROLES,
  "/api/notifications": JOB_ROLES,
  "/api/workorders": JOB_ROLES,
  "/settings": [ROLES.ADMIN],
};

export function canAccessPage(role, pathname, dept) {
  if (!role) return false;
  if (pathname === "/login") return true;
  // Inventory access depends on the department as well as the role.
  if (pathname === "/inventory" || pathname.startsWith("/inventory/") || pathname === "/api/inventory" || pathname.startsWith("/api/inventory/")) {
    return canViewInventory(role, dept);
  }
  for (const [prefix, roles] of Object.entries(PAGE_ACCESS)) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return roles.includes(role);
    }
  }
  return true;
}

// Notification / work-order capability matrix, matching the approved
// Job Tracker prototype: Admin and Engineer run the full lifecycle,
// Dept can raise and read but not act, Tech executes only their own work.
// `manageAll` (Admin only) allows editing and deleting any notification or
// work order, regardless of its status.
// `invManage` (Admin, Stores) adds, edits and deletes spares in Inventory;
// `invImport` (Admin, Stores) updates stock from an uploaded workbook.
// Viewing and exporting Inventory is decided by canViewInventory().
export const PERMS = {
  [ROLES.ADMIN]: { settings: true, manageAll: true, invManage: true, invImport: true, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.ENGINEER]: { settings: false, manageAll: false, invManage: false, invImport: false, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.DEPT]: { settings: false, manageAll: false, invManage: false, invImport: false, createNotif: true, review: false, convert: false, assign: false, close: false, execute: false, scope: "dept" },
  [ROLES.TECH]: { settings: false, manageAll: false, invManage: false, invImport: false, createNotif: false, review: false, convert: false, assign: false, close: false, execute: true, scope: "mine" },
  // Management: read everything and export it, change nothing.
  [ROLES.MANAGEMENT]: { settings: false, manageAll: false, invManage: false, invImport: false, createNotif: false, review: false, convert: false, assign: false, close: false, execute: false, scope: "all" },
  // Stores: Inventory only — nothing else in the app (see PAGE_ACCESS).
  [ROLES.STORES]: { settings: false, manageAll: false, invManage: true, invImport: true, createNotif: false, review: false, convert: false, assign: false, close: false, execute: false, scope: "none" },
};

export function permsFor(role) {
  return PERMS[role] || PERMS[ROLES.DEPT];
}

export function can(role, key) {
  return !!permsFor(role)[key];
}

export function roleLabel(role) {
  return (
    {
      [ROLES.ADMIN]: "Administrator",
      [ROLES.ENGINEER]: "Engineering Supervisor",
      [ROLES.DEPT]: "Department Supervisor",
      [ROLES.TECH]: "Engineer / Technician",
      [ROLES.MANAGEMENT]: "Management",
      [ROLES.STORES]: "Stores",
    }[role] ?? role ?? ""
  );
}
