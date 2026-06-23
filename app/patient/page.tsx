"use client";

import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";

const DEMO_PATIENT = {
  id: "cec4bc88-d5d2-4dff-a27d-1a0465147de0",
  full_name: "Justin Time",
  nhi: "GBD8765",
  date_of_birth: "1980-08-04",
  allergies: null,
};

export default function PatientPage() {
  return (
    <RequireRole allowed={["patient"]}>
      <main style={{ fontFamily: "system-ui" }}>
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
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div />
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
          <div />
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 24,
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.2 }}>
              Welcome {DEMO_PATIENT.full_name}
            </h1>

            <p style={{ marginTop: 12, color: "#4b5563", fontSize: 16 }}>
              View your current medications and medication information.
            </p>

            <div style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
              NHI: {DEMO_PATIENT.nhi}
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/patient/medications">
                <button
                  type="button"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  See your medications
                </button>
              </Link>

              <Link href="/me">
                <button
                  type="button"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#111827",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Account
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </RequireRole>
  );
}