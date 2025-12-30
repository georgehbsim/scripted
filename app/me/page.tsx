"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function MePage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) setStatus(error.message);
      else setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  async function signOut() {
    setStatus(null);
    const { error } = await supabase.auth.signOut();
    if (error) setStatus(error.message);
    else {
      setEmail(null);
      setStatus("Signed out. Go to /login");
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Me</h1>

      {status && <p>{status}</p>}

      {email ? (
        <>
          <p>Logged in as: <b>{email}</b></p>
          <button onClick={signOut} style={{ padding: 10 }}>
            Sign out
          </button>
        </>
      ) : (
        <p>Not logged in. Go to <code>/login</code>.</p>
      )}
    </main>
  );
}
