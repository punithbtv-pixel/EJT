export const ROLES = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  DEPT: "DEPT",
  TECH: "TECH",
  MANAGEMENT: "MANAGEMENT",
};

// Pages each role may visit.
// canAccessPage takes the first matching prefix, so the create pages are
// listed ahead of their parent lists.
export const PAGE_ACCESS = {
  "/notifications/new": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT],
  "/workorders/new": [ROLES.ADMIN, ROLES.ENGINEER],
  "/": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH, ROLES.MANAGEMENT],
  "/notifications": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH, ROLES.MANAGEMENT],
  "/workorders": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH, ROLES.MANAGEMENT],
  "/settings": [ROLES.ADMIN],
};

export function canAccessPage(role, pathname) {
  if (!role) return false;
  if (pathname === "/login") return true;
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
export const PERMS = {
  [ROLES.ADMIN]: { settings: true, manageAll: true, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.ENGINEER]: { settings: false, manageAll: false, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.DEPT]: { settings: false, manageAll: false, createNotif: true, review: false, convert: false, assign: false, close: false, execute: false, scope: "dept" },
  [ROLES.TECH]: { settings: false, manageAll: false, createNotif: false, review: false, convert: false, assign: false, close: false, execute: true, scope: "mine" },
  // Management: read everything and export it, change nothing.
  [ROLES.MANAGEMENT]: { settings: false, manageAll: false, createNotif: false, review: false, convert: false, assign: false, close: false, execute: false, scope: "all" },
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
    }[role] ?? role ?? ""
  );
}
