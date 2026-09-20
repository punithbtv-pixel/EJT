import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/session";
import { can, canViewInventory } from "@/lib/roles";

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return parseSessionToken(token);
}

export async function requireSession(...roles) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized", status: 401, session: null };
  }
  if (roles.length > 0 && !roles.includes(session.role)) {
    return { error: "Forbidden", status: 403, session: null };
  }
  return { session, error: null, status: 200 };
}

// Inventory access: any user who may open the page, optionally also holding a
// permission ("invManage" to add / edit / delete, "invImport" to import stock).
export async function requireInventory(perm) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401, session: null };
  if (!canViewInventory(session.role, session.dept) || (perm && !can(session.role, perm))) {
    return { error: "Forbidden", status: 403, session: null };
  }
  return { session, error: null, status: 200 };
}
