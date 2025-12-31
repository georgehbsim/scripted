"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "doctor" | "pharmacist" | "nurse" | "patient";

export function RequireRole({
  allowed,
  children,
}: {
  allowed: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      if (userErr || !uid) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .single();

      if (profileErr) {
        setError(profileErr.message);
        setLoading(false);
        return;
      }

      const role = profile?.role as Role | undefined;

      if (!role || !allowed.includes(role)) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    check();
  }, [allowed, router, supabase]);

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Checking access…</p>
        {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}
      </main>
    );
  }

  return <>{children}</>;
}
