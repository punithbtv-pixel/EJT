import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { parseSessionToken } from "@/lib/session";
import { canAccessPage } from "@/lib/roles";
import { isUiOnlyMode } from "@/lib/mode";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isUiOnlyMode()) return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = await parseSessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPage(session.role, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
