"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setStatus(error.message);
    else setStatus("Logged in! Now go to /me");

    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 420 }}>
      <h1>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            type="email"
            required
          />
        </label>

        <label>
          Password
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            type="password"
            required
          />
        </label>

        <button disabled={loading} style={{ padding: 10 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {status && <p>{status}</p>}
      </form>

      <p style={{ marginTop: 16 }}>
        After login, open <code>/me</code>
      </p>
    </main>
  );
}
