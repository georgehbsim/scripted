"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { RequireRole } from "@/components/RequireRole";

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
};

export default function DoctorPatientsPage() {
  return (
    <RequireRole allowed={["doctor"]}>
      <PatientsInner />
    </RequireRole>
  );
}

function PatientsInner() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, nhi")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setPatients((data as PatientRow[]) ?? []);
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1>Patients</h1>

      <p style={{ marginTop: 8 }}>
        <Link href="/doctor">← Back to Doctor Dashboard</Link>
      </p>

      <div style={{ marginTop: 16 }}>
        <Link href="/doctor/patients/new">+ Add patient</Link>
      </div>

      {loading && <p style={{ marginTop: 16 }}>Loading…</p>}
      {error && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      {!loading && !error && patients.length === 0 && (
        <p style={{ marginTop: 16 }}>No patients yet.</p>
      )}

      {!loading && !error && patients.length > 0 && (
        <table
          style={{
            width: "100%",
            marginTop: 16,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Name
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                DOB
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                NHI
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {p.full_name}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {p.date_of_birth ?? "—"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {p.nhi ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
