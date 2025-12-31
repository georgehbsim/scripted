"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
  setStatus(error.message);
  setLoading(false);
  return;
}

setStatus("Logged in. Fetching role…");

// Who is the user?
const { data: userData, error: userErr } = await supabase.auth.getUser();
if (userErr || !userData.user?.id) {
  setStatus(userErr?.message ?? "Could not get user.");
  setLoading(false);
  return;
}

const userId = userData.user.id;

// Fetch their role
const { data: profile, error: profileErr } = await supabase
  .from("profiles")
  .select("role")
  .eq("user_id", userId)
  .single();

if (profileErr) {
  setStatus(profileErr.message);
  setLoading(false);
  return;
}

const role = profile?.role;

if (role === "doctor") router.push("/doctor");
else if (role === "pharmacist") router.push("/pharmacy");
else if (role === "nurse") router.push("/nurse");
else router.push("/patient");

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
