"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      const next = search.get("next") || "/";
      router.push(next);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ZYN_Logo.png" alt="ZYN Mills" className="h-24 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 text-center">ZYN Engineering Job Tracker</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6 text-center">Sign in with your account.</p>
        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
        <input
          type="text"
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
