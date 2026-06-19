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

export default function PharmacyPatientsPage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
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
    <main style={{ fontFamily: "system-ui", background: "#f9fafb", minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 56,
          background: "#111827",
          color: "#ffffff",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <Link
            href="/pharmacy"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Back
          </Link>
        </div>

        <div
          style={{
            justifySelf: "center",
            fontWeight: 800,
            letterSpacing: 0.2,
            fontSize: 18,
          }}
        >
          Scripted
        </div>

        <div style={{ justifySelf: "end" }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            background: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.2,
                color: "#111827",
              }}
            >
              Patients
            </h1>

            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: "#4b5563",
                fontSize: 16,
              }}
            >
              Open a patient record to review medications and dispensing.
            </p>
          </div>

          {loading && <p style={{ marginTop: 24 }}>Loading…</p>}

          {error && (
            <pre style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>{error}</pre>
          )}

          {!loading && !error && patients.length === 0 && (
            <p style={{ marginTop: 24, color: "#6b7280" }}>No patients yet.</p>
          )}

          {!loading && !error && patients.length > 0 && (
            <div
              style={{
                marginTop: 24,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#374151",
                        background: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#374151",
                        background: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      DOB
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#374151",
                        background: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      NHI
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {patients.map((p, index) => (
                    <tr key={p.id}>
                      <td
                        style={{
                          padding: "14px",
                          borderBottom:
                            index === patients.length - 1 ? "none" : "1px solid #e5e7eb",
                          verticalAlign: "top",
                        }}
                      >
                        <Link
                          href={`/pharmacy/patients/${p.id}`}
                          style={{
                            color: "#111827",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {p.full_name}
                        </Link>
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom:
                            index === patients.length - 1 ? "none" : "1px solid #e5e7eb",
                          verticalAlign: "top",
                          color: "#374151",
                        }}
                      >
                        {p.date_of_birth ?? "—"}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom:
                            index === patients.length - 1 ? "none" : "1px solid #e5e7eb",
                          verticalAlign: "top",
                          color: "#374151",
                        }}
                      >
                        {p.nhi ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}