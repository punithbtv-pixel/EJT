"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PAGE_ACCESS, roleLabel, canViewInventory } from "@/lib/roles";

const ALL_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/workorders", label: "Work Orders" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  if (pathname === "/login") return null;

  // Inventory depends on the department as well as the role (Electrical staff see it).
  const links = user
    ? ALL_LINKS.filter((l) => (l.href === "/inventory" ? canViewInventory(user.role, user.dept) : PAGE_ACCESS[l.href]?.includes(user.role)))
    : ALL_LINKS;

  function isActive(l) {
    return l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-8 w-8 rounded bg-white flex items-center justify-center overflow-hidden p-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/zyn-logo.png" alt="ZYN Mills" className="h-full w-full object-contain" />
          </span>
          <span className="font-semibold tracking-tight">
            ZYN ENGINEERING <span className="text-sky-400">JOB TRACKER</span>
          </span>
        </span>
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(l) ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {user && (
          <span className="text-xs text-slate-400 hidden md:inline">
            {user.name} <span className="text-sky-400">({roleLabel(user.role)})</span>
          </span>
        )}
        <button onClick={logout} className="hidden md:inline text-sm text-slate-300 hover:text-white">
          Log out
        </button>

        <span className="flex-1 md:hidden" />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="md:hidden -mr-2 p-2 text-white"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="20" y2="20" />
              <line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 text-sm border-l-[3px] ${
                isActive(l) ? "bg-slate-700 text-white border-sky-400 font-medium" : "text-slate-300 border-transparent hover:bg-slate-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="block w-full text-left px-4 py-2.5 text-sm text-red-300 border-l-[3px] border-transparent hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
