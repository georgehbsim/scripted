"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "doctor" | "pharmacist" | "nurse" | "patient";

export default function SetupRolePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<string>("Starting…");

  const [status, setStatus] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("patient");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setDebug("Calling supabase.auth.getUser()…");

      setStatus(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setStatus(userError.message);
	setDebug("Done.");
        setLoading(false);
        return;
      }

      const uid = userData.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setStatus("Not logged in. Go to /login first.");
        setLoading(false);
        return;
      }

      setDebug("Fetching profile from public.profiles…");

      const { data: profile, error: profileError } = await supabase
         .from("profiles")
         .select("display_name, role")
         .eq("user_id", uid)
         .single();


      if (profileError) {
        setStatus(profileError.message);
      } else if (profile) {
        setDisplayName(profile.display_name ?? "");
        setRole((profile.role as Role) ?? "patient");
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  async function save() {
    setStatus(null);
    if (!userId) {
      setStatus("Not logged in.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, role })
      .eq("user_id", userId);

    if (error) setStatus(error.message);
    else setStatus("Saved ✅");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 520 }}>
      <h1>Setup Role (Dev)</h1>
      <p><i>{debug}</i></p>


      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {status && <p>{status}</p>}

          <p>
            <b>User ID:</b> {userId ?? "—"}
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <label>
              Display name
              <input
                style={{ width: "100%", padding: 8, marginTop: 4 }}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. George"
              />
            </label>

            <label>
              Role
              <select
                style={{ width: "100%", padding: 8, marginTop: 4 }}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="doctor">doctor</option>
                <option value="pharmacist">pharmacist</option>
                <option value="nurse">nurse</option>
                <option value="patient">patient</option>
              </select>
            </label>

            <button onClick={save} style={{ padding: 10 }}>
              Save
            </button>
          </div>

          <p style={{ marginTop: 16 }}>
            Tip: you can change roles here during development, then we’ll remove
            this page later.
          </p>
        </>
      )}
    </main>
  );
}
