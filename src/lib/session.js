import { isUiOnlyMode } from "@/lib/mode";
import { ROLES } from "@/lib/roles";

export const SESSION_COOKIE = "ejt_session";

function sessionSecret() {
  return process.env.SESSION_SECRET || "zyn-engineering-job-tracker-secret";
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function hashPassword(password) {
  return sha256Hex(`${password}::zyn-ejt::user-v1`);
}

export async function createSessionToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role, name: user.name };
  const data = toBase64Url(JSON.stringify(payload));
  const sig = await sha256Hex(`${data}::${sessionSecret()}`);
  return `${data}.${sig}`;
}

export async function parseSessionToken(token) {
  if (isUiOnlyMode()) {
    return { id: 0, username: "demo", role: ROLES.ADMIN, name: "Demo Administrator" };
  }
  if (!token || typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await sha256Hex(`${data}::${sessionSecret()}`);
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(fromBase64Url(data));
    if (!payload?.role || !Object.values(ROLES).includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}
