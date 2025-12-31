"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function NewPatientPage() {
  return (
    <RequireRole allowed={["doctor"]}>
      <NewPatientInner />
    </RequireRole>
  );
}

function NewPatientInner() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [nhi, setNhi] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userErr || !userId) {
      setStatus(userErr?.message ?? "Not logged in.");
      setLoading(false);
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      date_of_birth: dob ? dob : null,
      nhi: nhi.trim() ? nhi.trim().toUpperCase() : null,
      created_by: userId,
    };

    const { error } = await supabase.from("patients").insert(payload);

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    router.push("/doctor/patients");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 520 }}>
      <h1>Add patient</h1>
      <p style={{ marginTop: 8 }}>
        <Link href="/doctor/patients">← Back to Patients</Link>
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Full name
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. Alex Smith"
          />
        </label>

        <label>
          Date of birth
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            type="date"
          />
        </label>

        <label>
          NHI (optional)
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={nhi}
            onChange={(e) => setNhi(e.target.value)}
            placeholder="e.g. ABC1234"
          />
        </label>

        <button disabled={loading} style={{ padding: 10 }}>
          {loading ? "Saving…" : "Save patient"}
        </button>

        {status && <pre style={{ whiteSpace: "pre-wrap" }}>{status}</pre>}
      </form>
    </main>
  );
}
