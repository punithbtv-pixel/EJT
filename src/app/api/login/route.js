import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { hashPassword, createSessionToken } from "@/lib/session";
import { isUiOnlyMode } from "@/lib/mode";
import { ROLES } from "@/lib/roles";
import { findUserByUsername } from "@/lib/store";

export async function POST(request) {
  if (isUiOnlyMode()) {
    const res = NextResponse.json({ ok: true, mode: "ui-only", user: { username: "demo", role: ROLES.ADMIN, name: "Demo Administrator" } });
    res.cookies.set(AUTH_COOKIE, "ui-only", {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24,
    });
    return res;
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // ignore malformed body
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: { username: user.username, role: user.role, name: user.name } });
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
