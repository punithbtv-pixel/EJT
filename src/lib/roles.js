export const ROLES = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  DEPT: "DEPT",
  TECH: "TECH",
};

// Pages each role may visit.
export const PAGE_ACCESS = {
  "/": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH],
  "/notifications": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH],
  "/workorders": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.DEPT, ROLES.TECH],
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
export const PERMS = {
  [ROLES.ADMIN]: { settings: true, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.ENGINEER]: { settings: false, createNotif: true, review: true, convert: true, assign: true, close: true, execute: false, scope: "all" },
  [ROLES.DEPT]: { settings: false, createNotif: true, review: false, convert: false, assign: false, close: false, execute: false, scope: "dept" },
  [ROLES.TECH]: { settings: false, createNotif: false, review: false, convert: false, assign: false, close: false, execute: true, scope: "mine" },
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
    }[role] ?? role ?? ""
  );
}
