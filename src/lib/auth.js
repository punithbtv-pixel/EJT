// Session cookie name (kept as its own module so proxy.js has a stable import).
export const AUTH_COOKIE = "ejt_session";

export { SESSION_COOKIE } from "@/lib/session";
export { parseSessionToken as tokenIsValid } from "@/lib/session";
