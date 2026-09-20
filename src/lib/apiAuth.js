import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/session";

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
